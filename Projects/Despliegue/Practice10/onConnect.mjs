import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({});

export const handler = async (event) => {
  const connectionId = event.requestContext.connectionId;

  await dynamo.send(
    new PutItemCommand({
      TableName: "ChatConnections",
      Item: { connectionId: { S: connectionId } }
    })
  );

  return { statusCode: 200 };
};
