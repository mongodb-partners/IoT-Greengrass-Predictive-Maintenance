import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTabManager} from '../hooks/useTabManager';
import {updateJob as updateJobMutation} from '../mutations';
import {jobUpdated as jobUpdatedSubscription} from '../subscriptions';
import {getJobsOfUser} from '../queries';
import {colors} from '../styles/colors';
import {JobScreen} from './JobScreen';
import {generateClient} from 'aws-amplify/api';
import {
  getDBConnection,
  saveJob,
  getJobs,
  createTable,
  deleteTable,
  updateJob as updateJobSql,
} from '../sqlite/db-service';

const client = generateClient();

export default function HomeScreen() {
  const navigation = useNavigation();

  const {setSelectedStatus, selectedStatus} = useTabManager();
  const [jobs, setJobs] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resetSync, setResetSync] = useState(false);

  const subscribeToJobs = async () => {
    await client.graphql({query: jobUpdatedSubscription}).subscribe({
      next: async (event: any) => {
        const currentJob = event.data.jobUpdated;
        setJobs((prevJobs: any) => {
          const jobExists = prevJobs.some(
            (prevJob: any) => prevJob._id === currentJob._id,
          );
          if (jobExists) {
            return prevJobs.map((prevJob: any) =>
              prevJob._id === currentJob._id && prevJob.status
                ? {...prevJob, ...currentJob}
                : prevJob,
            );
          } else {
            return [...prevJobs, currentJob];
          }
        });
        const db = await getDBConnection();
        await saveJob(db, currentJob);
      },
      error: (error: any) => console.error('subscription error:', error),
    });
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        setResetSync(!resetSync);
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    fetchUserId();
    syncJobs();
    subscribeToJobs();
  }, [resetSync]);

  const fetchUserId = async () => {
    const storedUserId = await AsyncStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    }
  };

  const syncJobs = async () => {
    const db = await getDBConnection();
    const localJobs = await getJobs(db);
    for (let localJob of localJobs) {
      await client.graphql({
        query: updateJobMutation,
        variables: {
          _id: localJob._id,
          notes: localJob.notes,
          status: localJob.status,
        },
      });
    }
    const {data}: any = await client.graphql({
      query: getJobsOfUser,
      variables: {
        assignedTo: userId,
      },
    });
    const graphqlJobs = data.getJobsOfUser;
    for (const graphqlJob of graphqlJobs) {
      const localJob = localJobs.find(_app => _app._id === graphqlJob._id);
      if (!localJob) {
        await saveJob(db, graphqlJob);
      }
    }
  };

  useEffect(() => {
    async function fetch() {
      const db = await getDBConnection();
      let jobsResponse = await getJobs(db);
      setJobs(jobsResponse);
      setLoading(false);
    }
    if (selectedStatus) {
      fetch();
      setLoading(true);
    }
  }, [userId, selectedStatus, resetSync]);

  const updateJob = async (status: string, notes: string, _job: any) => {
    const db = await getDBConnection();
    await updateJobSql(db, {
      _id: _job._id,
      status,
      notes,
    });
    setJobs((prevJobs: any) => {
      const jobExists = prevJobs.some(
        (prevJob: any) => prevJob._id === _job._id,
      );
      if (jobExists) {
        return prevJobs.map((prevJob: any) =>
          prevJob._id === _job._id && prevJob.status
            ? {...prevJob, ..._job, status, notes}
            : prevJob,
        );
      } else {
        return prevJobs;
      }
    });
    await client.graphql({
      query: updateJobMutation,
      variables: {
        _id: _job._id,
        status,
        notes,
      },
    });
    setResetSync(!resetSync);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Job List</Text>
        </View>
        <Pressable style={styles.authButton}>
          <Text
            style={styles.authButtonText}
            onPress={async () => {
              const db = await getDBConnection();
              AsyncStorage.clear();
              await deleteTable(db);
              navigation.navigate('Login');
            }}>
            Log Out
          </Text>
        </Pressable>
      </View>
      <JobScreen
        jobs={jobs?.filter((job: any) => job.status === selectedStatus)}
        loading={loading}
        updateJob={updateJob}
        onTabChange={setSelectedStatus}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderBottomWidth: 10,
    borderColor: colors.grayMedium,
    backgroundColor: colors.grayLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderColor: colors.grayMedium,
    backgroundColor: colors.white,
  },
  titleContainer: {
    paddingLeft: 10,
  },
  title: {
    marginBottom: 10,
    fontSize: 16,
    alignSelf: 'center',
    fontWeight: 'bold',
    color: colors.black,
  },
  info: {
    fontSize: 13,
    color: colors.black,
  },
  authButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 25,
    borderColor: colors.grayMedium,
  },
  authButtonText: {
    fontWeight: 'bold',
    color: colors.black,
  },
});
