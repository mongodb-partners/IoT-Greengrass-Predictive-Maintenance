/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const jobAdded = /* GraphQL */ `
  subscription JobAdded {
    jobAdded {
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
export const jobUpdated = /* GraphQL */ `
  subscription JobUpdated {
    jobUpdated {
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
