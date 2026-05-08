import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  ScanCommand
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
  console.log("ON CONNECT:", JSON.stringify(event, null, 2));

  try {
    const { connectionId, domainName, stage } = event.requestContext;
    const username = event.queryStringParameters?.user || "Anon";

    // 1. Guardar la nueva conexión
    await ddb.send(new PutItemCommand({
      TableName: CONNECTIONS_TABLE,
      Item: {
        connectionId: { S: connectionId },
        username:     { S: username }
      }
    }));

    const apiGw = new ApiGatewayManagementApiClient({
      endpoint: `https://${domainName}/${stage}`
    });

    // 2. Recuperar los últimos 20 mensajes del historial
    const history = await ddb.send(new QueryCommand({
      TableName:              MESSAGES_TABLE,
      KeyConditionExpression: "roomId = :r",
      ExpressionAttributeValues: { ":r": { S: ROOM_ID } },
      ScanIndexForward:       false,
      Limit:                  20
    }));

    // 3. Enviar historial al cliente recién conectado
    if (history.Items && history.Items.length > 0) {
      const msgs = history.Items.reverse().map(item => ({
        type:      "message",
        user:      item.user.S,
        text:      item.text.S,
        createdAt: item.createdAt.S
      }));

      await apiGw.send(new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify({ type: "history", messages: msgs }))
      }));
    }

    // 4. Obtener usuarios conectados
    const conns = await ddb.send(new ScanCommand({
      TableName: CONNECTIONS_TABLE
    }));

    const users = conns.Items.map(item => item.username.S);

    // 5. Broadcast lista de usuarios a todos
    for (const conn of conns.Items) {
      try {
        await apiGw.send(new PostToConnectionCommand({
          ConnectionId: conn.connectionId.S,
          Data: Buffer.from(JSON.stringify({ type: "users", users }))
        }));
      } catch (err) { /* conexión muerta, ignorar */ }
    }

    return { statusCode: 200, body: "" };

  } catch (err) {
    console.error("ERROR onConnect:", err);
    return { statusCode: 500, body: "Error onConnect" };
  }
};
