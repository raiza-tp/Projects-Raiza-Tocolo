import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";

const apiGateway = new ApiGatewayManagementApiClient({
  endpoint: "https://inll1exw5c.execute-api.us-east-1.amazonaws.com/production"
});

export const handler = async (event) => {
  try {
    if (!event || !event.requestContext || !event.requestContext.connectionId) {
      throw new Error("Evento inválido: falta connectionId en requestContext.");
    }

    const connectionId = event.requestContext.connectionId;
    const body = JSON.parse(event.body || "{}");

    console.log("Enviando mensaje a:", connectionId);

    const command = new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify({ message: body.message || "Mensaje predeterminado" })
    });

    await apiGateway.send(command);

    console.log("Mensaje enviado correctamente.");
    return { statusCode: 200, body: "Mensaje enviado." };

  } catch (error) {
    console.error("Error enviando mensaje:", error);

    if (error.name === "GoneException") {
      return { statusCode: 410, body: "La conexión ya está cerrada." };
    }
    if (error.name === "ForbiddenException") {
      return { statusCode: 403, body: "Permisos insuficientes." };
    }

    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
