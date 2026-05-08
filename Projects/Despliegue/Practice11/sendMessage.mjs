import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
  DeleteItemCommand
} from "@aws-sdk/client-dynamodb";

import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand
} from "@aws-sdk/client-apigatewaymanagementapi";

const ddb               = new DynamoDBClient({});
const CONNECTIONS_TABLE = "ChatConnections";
const MESSAGES_TABLE    = "ChatMessages";
const ROOM_ID           = "general";

export const handler = async (event) => {
  console.log("SEND MESSAGE:", JSON.stringify(event, null, 2));

  const { connectionId, domainName, stage } = event.requestContext;

  // 1. Parsear el body
  let body;
  try   { body = JSON.parse(event.body); }
  catch { body = { data: event.body };   }

  const text = body.data?.trim() || "";
  if (!text) return { statusCode: 400 };

  // 2. Obtener el username del remitente
  const userItem = await ddb.send(new GetItemCommand({
    TableName: CONNECTIONS_TABLE,
    Key: { connectionId: { S: connectionId } }
  }));

  const username  = userItem.Item?.username?.S || "Anon";
  const createdAt = new Date().toISOString();

  // 3. Guardar mensaje en ChatMessages
  await ddb.send(new PutItemCommand({
    TableName: MESSAGES_TABLE,
    Item: {
      roomId:    { S: ROOM_ID },
      createdAt: { S: createdAt },
      user:      { S: username },
      text:      { S: text }
    }
  }));

  // 4. Obtener todas las conexiones activas
  const conns = await ddb.send(new ScanCommand({
    TableName: CONNECTIONS_TABLE
  }));

  // 5. Crear cliente para enviar mensajes por WebSocket
  const apiGw = new ApiGatewayManagementApiClient({
    endpoint: `https://${domainName}/${stage}`
  });

  const msg = {
    type:      "message",
    user:      username,
    text,
    createdAt
  };

  // 6. Broadcast a todos los conectados
  for (const conn of conns.Items) {
    try {
      await apiGw.send(new PostToConnectionCommand({
        ConnectionId: conn.connectionId.S,
        Data:         Buffer.from(JSON.stringify(msg))
      }));
    } catch (err) {
      // Conexión muerta → borrarla de la tabla
      await ddb.send(new DeleteItemCommand({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId: { S: conn.connectionId.S } }
      }));
    }
  }

  return { statusCode: 200 };
};
