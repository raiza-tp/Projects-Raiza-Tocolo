#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkDynamodbStack } from '../lib/cdk-dynamodb-stack';

const app = new cdk.App();
new CdkDynamodbStack(app, 'CdkDynamodbStack', {
  synthesizer: new cdk.LegacyStackSynthesizer(),
  env: { account: 'YOUR_ACCOUNT_ID', region: 'us-east-1' },
});
