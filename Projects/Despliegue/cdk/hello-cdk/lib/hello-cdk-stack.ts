import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';

export class HelloCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const myFunction = new lambda.Function(this, 'HelloWorldFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      role: iam.Role.fromRoleArn(this, 'LabRole', 
  'arn:aws:iam::YOUR_ACCOUNT_ID:role/LabRole'),
      code: lambda.Code.fromInline(`
        exports.handler = async function(event) {
          return {
            statusCode: 200,
            body: JSON.stringify('Hello World! - Modified'),
          };
        };
      `),
    });
    const myFunctionUrl = myFunction.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
});

new cdk.CfnOutput(this, 'myFunctionUrlOutput', {
  value: myFunctionUrl.url,
});
  }
}
