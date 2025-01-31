/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getUser = /* GraphQL */ `
  query GetUser($_id: String!) {
    getUser(_id: $_id) {
      _id
      email
      password
      name
      __typename
    }
  }
`;
export const getJobs = /* GraphQL */ `
  query GetJobs {
    getJobs {
      _id
      assignedTo {
        _id
        email
        password
        name
        __typename
      }
      createdAt
      notes
      status
      type
      vehicleId {
        _id
        make
        model
        vin
        __typename
      }
      __typename
    }
  }
`;
export const getJobsOfUser = /* GraphQL */ `
  query GetJobsOfUser($assignedTo: String, $status: String) {
    getJobsOfUser(assignedTo: $assignedTo, status: $status) {
      _id
      assignedTo {
        _id
        email
        password
        name
        __typename
      }
      createdAt
      notes
      status
      type
      vehicleId {
        _id
        make
        model
        vin
        __typename
      }
      __typename
    }
  }
`;
export const getUsers = /* GraphQL */ `
  query GetUsers {
    getUsers {
      _id
      email
      password
      name
      __typename
    }
  }
`;
export const getVehicles = /* GraphQL */ `
  query GetVehicles {
    getVehicles {
      _id
      make
      model
      vin
      __typename
    }
  }
`;
