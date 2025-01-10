import React, { useEffect } from 'react';
import JobList from '../components/JobList';
import { Tab, TabView } from '@rneui/themed';

export const JobScreen = ({ jobs, onTabChange, updateJob, loading }) => {

  const [index, setIndex] = React.useState(0);

  useEffect(() => {
    switch (index) {
      case 0:
        onTabChange("TODO")
        break;
      case 1:
        onTabChange("INPROGRESS")
        break;
      case 2:
        onTabChange("CANCELLED")
        break;
      default:
        onTabChange("COMPLETED")
        break;
      }
  }, [index])

  return (
    
    <>
      <Tab
        value={index}
        onChange={(e) => setIndex(e)}
        indicatorStyle={{
          backgroundColor: 'darkgreen',
          height: 3,
        }}
      >
        <Tab.Item
          title="Todo"
          titleStyle={{ color: 'black', fontSize: 9, fontWeight: 800 }}
        />
        <Tab.Item
          title="Progress"
          titleStyle={{ color: 'black', fontSize: 9, fontWeight: 800 }}
        />
        <Tab.Item
          title="Cancelled"
          titleStyle={{ color: 'black', fontSize: 9, fontWeight: 800 }}
        />
        <Tab.Item
          title="Completed"
          titleStyle={{ color: 'black', fontSize: 9, fontWeight: 800 }}
        />
      </Tab>

      <TabView value={index} onChange={setIndex} animationType="spring">
        <TabView.Item style={{ backgroundColor: '#fff', width: '100%' }}>
          <JobList loading={loading} jobs={jobs} onItemUpdate={updateJob}></JobList>
        </TabView.Item>
        <TabView.Item style={{ backgroundColor: '#fff', width: '100%' }}>
          <JobList loading={loading} jobs={jobs} onItemUpdate={updateJob}></JobList>
        </TabView.Item>
        <TabView.Item style={{ backgroundColor: '#fff', width: '100%' }}>
          <JobList loading={loading} jobs={jobs} onItemUpdate={updateJob}></JobList>
        </TabView.Item>
        <TabView.Item style={{ backgroundColor: '#fff', width: '100%' }}>
          <JobList loading={loading} jobs={jobs} onItemUpdate={updateJob}></JobList>
        </TabView.Item>
      </TabView>
    </>
    // <TabView
    //   navigationState={{ index, routes }}
    //   renderScene={renderScene}
    //   renderTabBar={props => (
    //     <TabBar
    //       {...props}
    //       renderTabBarItem={(props) => {
    //         return <TabBarItem style={{backgroundColor: 'red', fontSize: 7, color: 'red'}} {...props} />
    //       }}
    //       style={{ backgroundColor: 'white' }}
    //       onTabPress={({ route }) => {
    //         onTabChange(route.key);
    //       }}
    //     />
    //   )}
    //   onIndexChange={setIndex}
    //   initialLayout={{ width: layout.width }}
    // />
  );
};