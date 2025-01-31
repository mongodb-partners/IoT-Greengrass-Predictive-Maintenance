import FormData from 'form-data';
global.FormData = FormData;

import fetch from 'node-fetch';
global.fetch = fetch;


import { Headers, Request, Response } from 'node-fetch';
global.Headers = Headers;
global.Request = Request;
global.Response = Response;


import { generateClient } from 'aws-amplify/api';
import { Amplify } from 'aws-amplify';

const API_KEY = process.env.apiKey || '';
const ENDPOINT = process.env.endpoint || '';
const REGION = process.env.region || 'us-east-1';

Amplify.configure({
    API: {
        GraphQL: {
            endpoint: ENDPOINT,
            region: REGION,
            apiKey: API_KEY
        }
    }
});

const client = generateClient({ authMode: 'apiKey', authToken: API_KEY });

const updateJob = /* GraphQL */ `
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

export const handler = async (event) => {
    console.log("Received event: ", JSON.stringify(event));

    const operationType = event.detail.operationType;

    try {
        switch (operationType) {
            case 'insert': {
                const payload = event.detail.fullDocument;
                const variables = {
                    _id: payload._id,
                    status: payload.status,
                    notes: payload.notes
                };

                const { data } = await client.graphql({
                    query: updateJob,
                    variables: variables,
                    authMode: 'apiKey',
                    authToken: API_KEY
                });

                if (data) {
                    console.log("Mutation success:", data);
                } else {
                    console.error("Mutation failed:", data?.error || "Unknown error");
                }
                break;
            }
            default: {
                console.log("Unsupported operation type:", operationType);
            }
        }
    } catch (error) {
        console.error("Error handling event:", error);
    }

    return { statusCode: 200, body: "Operation processed" };
};

