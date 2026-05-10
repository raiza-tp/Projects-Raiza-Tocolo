import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class CdkDynamodbStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ─── 1. Tabla DynamoDB (L1) ───────────────────────────────────────────────
    const tabla = new dynamodb.CfnTable(this, 'ReservasTable', {
      tableName: 'reservas',
      billingMode: 'PAY_PER_REQUEST',
      attributeDefinitions: [
        {
          attributeName: 'reserva_id',
          attributeType: 'S',
        },
      ],
      keySchema: [
        {
          attributeName: 'reserva_id',
          keyType: 'HASH',
        },
      ],
    });

    // ─── 2. Lambda para añadir item ───────────────────────────────────────────
    const addItemFn = new lambda.CfnFunction(this, 'AddItemFunction', {
      functionName: 'add-item-handler',
      runtime: 'nodejs20.x',
      handler: 'index.handler',
      role: 'arn:aws:iam::YOUR_ACCOUNT_ID:role/LabRole',
      environment: {
        variables: {
          TABLE_NAME: 'reservas',
        },
      },
      code: {
        zipFile: `
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const client = new DynamoDBClient({});
exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  await client.send(new PutItemCommand({
    TableName: process.env.TABLE_NAME,
    Item: {
      reserva_id: { S: body.reserva_id },
      nombre: { S: body.nombre },
    },
  }));
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Item añadido correctamente' }),
  };
};`,
      },
    });

    addItemFn.addDependency(tabla);

    // ─── 3. API Gateway ───────────────────────────────────────────────────────
    const restApi = new apigateway.CfnRestApi(this, 'ReservasApi', {
      name: 'ReservasApi',
    });

    const resource = new apigateway.CfnResource(this, 'ReservasResource', {
      restApiId: restApi.ref,
      parentId: restApi.attrRootResourceId,
      pathPart: 'reservas',
    });

    const method = new apigateway.CfnMethod(this, 'ReservasPostMethod', {
      restApiId: restApi.ref,
      resourceId: resource.ref,
      httpMethod: 'POST',
      authorizationType: 'NONE',
      integration: {
        type: 'AWS_PROXY',
        integrationHttpMethod: 'POST',
        uri: cdk.Fn.join('', [
          'arn:aws:apigateway:',
          this.region,
          ':lambda:path/2015-03-31/functions/',
          addItemFn.attrArn,
          '/invocations',
        ]),
      },
    });

    new lambda.CfnPermission(this, 'ApiGwPermission', {
      action: 'lambda:InvokeFunction',
      functionName: addItemFn.attrArn,
      principal: 'apigateway.amazonaws.com',
      sourceArn: cdk.Fn.join('', [
        'arn:aws:execute-api:',
        this.region,
        ':',
        this.account,
        ':',
        restApi.ref,
        '/*/POST/reservas',
      ]),
    });

    const deployment = new apigateway.CfnDeployment(this, 'ReservasDeployment', {
      restApiId: restApi.ref,
    });
    deployment.addDependency(method);

    new apigateway.CfnStage(this, 'ReservasStage', {
      restApiId: restApi.ref,
      deploymentId: deployment.ref,
      stageName: 'prod',
    });

    // ─── 4. Outputs ───────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'TablaArn', {
      description: 'ARN de la tabla DynamoDB reservas',
      value: tabla.attrArn,
    });

    new cdk.CfnOutput(this, 'TablaName', {
      description: 'Escanea con: aws dynamodb scan --table-name reservas',
      value: 'reservas',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: cdk.Fn.join('', [
        'https://',
        restApi.ref,
        '.execute-api.',
        this.region,
        '.amazonaws.com/prod/reservas',
      ]),
    });
  }
}