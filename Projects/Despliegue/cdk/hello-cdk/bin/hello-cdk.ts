#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { HelloCdkStack } from '../lib/hello-cdk-stack';

const app = new cdk.App();
new HelloCdkStack(app, 'HelloCdkStack', {
  synthesizer: new cdk.LegacyStackSynthesizer(),
  env: { account: 'YOUR_ACCOUNT_ID', region: 'us-east-1' },
});
