#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkLambdaAgwStack } from '../lib/cdk-lambda-agw-stack';

const app = new cdk.App();
new CdkLambdaAgwStack(app, 'CdkLambdaAgwStack', {
  synthesizer: new cdk.LegacyStackSynthesizer(),
  env: { account: 'YOUR_ACCOUNT_ID', region: 'us-east-1' },
});