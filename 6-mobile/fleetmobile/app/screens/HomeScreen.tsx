import { gql, useLazyQuery, useMutation } from '@apollo/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTabManager } from '../hooks/useTabManager';
import { updateJob as updateJobMutation } from '../mutations';
import { getJobsOfUser } from '../queries';
import { colors } from '../styles/colors';
import { JobScreen } from './JobScreen';

export default function HomeScreen() {
  const navigation = useNavigation();

  const { setSelectedStatus, selectedStatus } = useTabManager();
  const [jobs, setJobs] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchJobs, { data }] = useLazyQuery(gql(getJobsOfUser));


  useEffect(() => {
    const fetchUserId = async () => {
        const storedUserId = await AsyncStorage.getItem('userId');
        if (storedUserId) {
          setUserId(storedUserId);
        }
    };

    fetchUserId();
  }, []);

  const [_updateJob] = useMutation(gql(updateJobMutation));
  useEffect(() => {
    if (userId && selectedStatus) {
      setLoading(true);
      fetchJobs({
        variables: {
          assignedTo: userId,
          status: selectedStatus,
        },
      });
    }
  }, [selectedStatus, userId]);

  useEffect(() => {
    console.log('data?.getJobsOfUser: ', data?.getJobsOfUser, selectedStatus);

    if (data?.getJobsOfUser) {
      setJobs(data.getJobsOfUser);
      setLoading(false);
    } else {
      setJobs([]);
      setLoading(false);
    }
  }, [data]);

  const updateJob = async (status, notes, _job) => {
    await _updateJob({
      variables: {
        _id: _job._id,
        status,
        notes,
    }});

  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Job List</Text>
        </View>
        <Pressable style={styles.authButton} >
          <Text style={styles.authButtonText} onPress={() => {
            AsyncStorage.clear();
            navigation.navigate('Login');
          }}>Log Out</Text>
        </Pressable>
      </View>

      <JobScreen
        jobs={jobs}
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
