import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class CdkS3Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Constructor L1 para crear bucket S3
    new cdk.aws_s3.CfnBucket(this, 'HelloBucket', {
      bucketName: 'hello-bucket-' + cdk.Aws.ACCOUNT_ID + '-' + cdk.Aws.REGION
    });
  }
}