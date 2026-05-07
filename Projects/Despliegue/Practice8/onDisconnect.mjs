export const handler = async (event) => {
  console.log("Cliente desconectado:", event.requestContext.connectionId);
  return { statusCode: 200 };
};
