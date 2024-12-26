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
