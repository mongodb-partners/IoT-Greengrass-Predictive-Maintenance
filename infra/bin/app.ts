#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { FirstStepStack } from '../lib/first-step-stack';

const awsConfig = {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },
}

const app = new cdk.App();

new FirstStepStack(app, 'FirstStepStack', awsConfig);

app.synth();