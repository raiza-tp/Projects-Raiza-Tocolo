#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkS3Stack } from '../lib/cdk-s3-stack';

const app = new cdk.App();
new CdkS3Stack(app, 'CdkS3Stack', {
  synthesizer: new cdk.LegacyStackSynthesizer(),
  env: { account: 'YOUR_ACCOUNT_ID', region: 'us-east-1' },
});
