import React from 'react';
import { Text, useWindowDimensions } from 'react-native';
import { TabBar, TabBarItem, TabView } from 'react-native-tab-view';
import JobList from '../components/JobList';

export const JobScreen = ({ jobs, onTabChange, updateJob, loading }) => {

  const layout = useWindowDimensions();
  const [index, setIndex] = React.useState(0);

  const [routes] = React.useState([
    { key: 'TODO', title: 'TODO' },
    { key: 'INPROGRESS', title: 'INPROGRESS' },
    { key: 'CANCELLED', title: 'CANCELLED' },
    { key: 'COMPLETED', title: 'COMPLETED' },
  ]);

  const renderScene = ({ route }) => {
    switch (route.key) {
      case 'TODO': return <JobList loading={loading} jobs={jobs} onItemUpdate={updateJob}></JobList>
      case 'INPROGRESS': return <JobList loading={loading} jobs={jobs} onItemUpdate={updateJob}></JobList>
      case 'CANCELLED': return <JobList loading={loading} jobs={jobs} onItemUpdate={updateJob}></JobList>
      case 'COMPLETED': return <JobList loading={loading} jobs={jobs} onItemUpdate={updateJob}></JobList>
    }
  };

  return (
    <TabView
      navigationState={{ index, routes }}
      renderScene={renderScene}
      renderTabBar={props => (
        <TabBar
          {...props}
          renderTabBarItem={(props) => {
            return <TabBarItem style={{backgroundColor: 'red', fontSize: 7, color: 'red'}} {...props} />
          }}
          style={{ backgroundColor: 'white' }}
          onTabPress={({ route }) => {
            onTabChange(route.key);
          }}
        />
      )}
      onIndexChange={setIndex}
      initialLayout={{ width: layout.width }}
    />
  );
};