#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Cdk2Stack } from '../lib/cdk2-stack';

const app = new cdk.App();
new Cdk2Stack(app, 'Cdk2Stack', {
  synthesizer: new cdk.LegacyStackSynthesizer(),
  env: { account: 'YOUR_ACCOUNT_ID', region: 'us-east-1' },
});