import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';

export class CdkLambdaAgwStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const labRole = iam.Role.fromRoleArn(this, 'LabRole',
      'arn:aws:iam::YOUR_ACCOUNT_ID:role/LabRole');

    // Lambda GET - L2
    const helloLambda = new lambda.Function(this, 'HelloLambda', {
      functionName: 'hello-lambdas',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      role: labRole,
      code: lambda.Code.fromInline(
        'exports.handler = async () => ({ statusCode: 200, body: JSON.stringify({ message: "hola lambdas" }) });'
      )
    });

    // Lambda PUT - L2
    const nameLambda = new lambda.Function(this, 'NameLambda', {
      functionName: 'name-lambdas',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      role: labRole,
      code: lambda.Code.fromInline(
        'exports.handler = async (event) => { const body = JSON.parse(event.body); return { statusCode: 200, body: JSON.stringify({ message: "Hola " + body.nombre }) }; };'
      )
    });

    // API Gateway L2
    const api = new apigateway.RestApi(this, 'LambdaApi', {
      restApiName: 'lambda-api'
    });

    // Ruta GET /hello
    const hello = api.root.addResource('hello');
    hello.addMethod('GET', new apigateway.LambdaIntegration(helloLambda));

    // Ruta PUT /hello
    hello.addMethod('PUT', new apigateway.LambdaIntegration(nameLambda));

    // Output URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: `${api.url}hello`
    });
  }
}