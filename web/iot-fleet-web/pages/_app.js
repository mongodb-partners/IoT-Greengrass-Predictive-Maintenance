"use client"

import "../styles/globals.css";
import Sidebar from "../components/Sidebar";
// import { createAuthLink } from "aws-appsync-auth-link";
import { createSubscriptionHandshakeLink } from "aws-appsync-subscription-link";
import {
  ApolloProvider,
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
} from "@apollo/client";
import { useRouter } from 'next/router';

import appSyncConfig from "../aws-exports";


const url = appSyncConfig.API.GraphQL.endpoint;
const region = appSyncConfig.API.GraphQL.region;

const auth = {
  type: appSyncConfig.API.GraphQL.defaultAuthMode,
  apiKey: appSyncConfig.API.GraphQL.apiKey,
};

const httpLink = new HttpLink({ uri: url });

const createAuthLink = ({ url, region, auth }) => {
  return new ApolloLink((operation, forward) => {
    const { type, apiKey } = auth;

    if (type === 'apiKey' && apiKey) {
      operation.setContext({
        headers: {
          'x-api-key': apiKey,  
        },
      });
    }
    
    return forward(operation);
  });
};

const link = ApolloLink.from([
  createAuthLink({ url, region, auth }),
  createSubscriptionHandshakeLink({ url, region, auth }, httpLink),
]);

const client = new ApolloClient({
  link,
  cache: new InMemoryCache(),
});

const ApolloWrapper = ({ children }) => {
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
};

function MyApp({ Component, pageProps }) {

  const router = useRouter();
  const noSidebarRoutes = ['/login', '/register', '/'];
  const showSidebar = !noSidebarRoutes.includes(router.pathname);
  
  return (
    <ApolloWrapper>
      <div style={{ display: 'flex' }}>
        {showSidebar && <Sidebar />}
        <main style={{ flexGrow: 1, marginTop: showSidebar ? '60px' : '0' }}>
            <Component {...pageProps} />
        </main>
      </div>
      </ApolloWrapper>
  );
}

export default MyApp;
