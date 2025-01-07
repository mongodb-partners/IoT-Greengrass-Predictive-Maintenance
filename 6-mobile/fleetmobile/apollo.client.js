import {createAuthLink} from 'aws-appsync-auth-link';
import {createSubscriptionHandshakeLink} from 'aws-appsync-subscription-link';

import {
  ApolloProvider,
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
} from '@apollo/client';

import appSyncConfig from './aws-exports';

const url = appSyncConfig.API.GraphQL.endpoint;
const region = appSyncConfig.API.GraphQL.region;

const auth = {
  type: appSyncConfig.API.GraphQL.defaultAuthMode,
  apiKey: appSyncConfig.API.GraphQL.apiKey,
};

const httpLink = new HttpLink({uri: url});

const link = ApolloLink.from([
  createAuthLink({url, region, auth}),
  createSubscriptionHandshakeLink({url, region, auth}, httpLink),
]);

const client = new ApolloClient({
  link,
  cache: new InMemoryCache(),
});

export default client;
