import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const ddb   = new DynamoDBClient({});
const TABLE = "ChatConnections";

export const handler = async (event) => {
  console.log("ON CONNECT:", JSON.stringify(event, null, 2));

  try {
    const { connectionId } = event.requestContext;
    const username = event.queryStringParameters?.user || "Anon";

    // Guardar conexión con username
    await ddb.send(new PutItemCommand({
      TableName: TABLE,
      Item: {
        connectionId: { S: connectionId },
        username:     { S: username }
      }
    }));

    return {
      statusCode: 200,
      body: ""          // <-- IMPORTANTE: body vacío pero presente
    };

  } catch (err) {
    console.error("ERROR onConnect:", err);
    return {
      statusCode: 500,
      body: "Error onConnect"
    };
  }
};
