/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const login = /* GraphQL */ `
  mutation Login($email: String, $password: String) {
    login(email: $email, password: $password) {
      _id
      email
      password
      name
      __typename
    }
  }
`;
export const updateJob = /* GraphQL */ `
  mutation UpdateJob($_id: String, $status: String, $notes: String) {
    updateJob(_id: $_id, status: $status, notes: $notes) {
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
