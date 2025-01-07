import React from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { JobItem } from './JobItem';

export const JobList = ({ jobs, onItemUpdate, loading }) => {
  return (
    <View>
      {loading ? (
        <ActivityIndicator size="large" color="darkgreen" style={{
          marginTop: 50,
        }} />
      ) : jobs.length > 0 ? (
        <FlatList
          data={jobs}
          renderItem={({ item: job }) => (
            <JobItem
              job={job}
              onUpdate={onItemUpdate}
            />
          )}
          keyExtractor={(item, index) => index.toString()}
        />
      ) : (
        <Text style={{
          marginTop: 50,
          fontSize: 16,
          color: '#666',
          textAlign: 'center',
        }}>No Jobs</Text>
      )}
    </View>
  );
};

export default JobList;