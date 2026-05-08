import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } 
  from "@aws-sdk/client-apigatewaymanagementapi";

const dynamo = new DynamoDBClient({});

export const handler = async (event) => {
  console.log("Evento recibido:", JSON.stringify(event, null, 2));

  const { requestContext, body } = event;

  let parsedBody;
  try {
    parsedBody = JSON.parse(body);
  } catch (err) {
    console.error("Error al parsear body:", err);
    return { statusCode: 400 };
  }

  const message = parsedBody.data || "mensaje vacío";
  const endpoint = `https://${requestContext.domainName}/${requestContext.stage}`;

  const apiGw = new ApiGatewayManagementApiClient({ endpoint });

  const { Items } = await dynamo.send(
    new ScanCommand({ TableName: "ChatConnections" })
  );

  await Promise.all(Items.map(async (item) => {
    const connId = item.connectionId.S;
    try {
      await apiGw.send(new PostToConnectionCommand({
        ConnectionId: connId,
        Data: Buffer.from(`Echo: ${message}`)
      }));
    } catch (err) {
      console.error(`Error enviando a ${connId}:`, err);
    }
  }));

  return { statusCode: 200 };
};
