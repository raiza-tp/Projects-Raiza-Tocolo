import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "ChatMessages";

export const handler = async (event) => {
  console.log("EVENT:", JSON.stringify(event, null, 2));

  let body = event.body;

  if (!body && (event.user || event.text)) body = event;

  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return { statusCode: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "JSON inválido" }) };
    }
  }

  let { user, text, room } = body || {};
  if (!user || !text) {
    return { statusCode: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "user y text son obligatorios" }) };
  }

  if (!room) room = "general";
  const timestamp = Date.now();
  const message = { room, timestamp, user, text };

  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: message }));

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ status: "saved", message }),
  };
};
