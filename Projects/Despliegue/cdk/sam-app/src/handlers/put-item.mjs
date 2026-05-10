import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.SAMPLE_TABLE;

export const putItemHandler = async (event) => {
  if (event.httpMethod !== 'PUT') {
    throw new Error(`putItem only accepts PUT method, you tried: ${event.httpMethod}`);
  }
  console.info('received:', event);

  const body = JSON.parse(event.body);
  const id = body.id;
  const name = body.name;

  const params = {
    TableName: tableName,
    Item: { id, name },
  };

  try {
    await ddbDocClient.send(new PutCommand(params));
  } catch (err) {
    console.log("Error", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error inserting item", error: err }),
      headers: {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "PUT"
      },
    };
  }

  const response = {
    statusCode: 200,
    body: JSON.stringify({ message: "Item insertado correctamente", id }),
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "PUT"
    },
  };

  console.info(`response from: ${event.path} statusCode: ${response.statusCode} body: ${response.body}`);
  return response;
};