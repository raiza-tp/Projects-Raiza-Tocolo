import json
import boto3

# Conectar con DynamoDB
dynamodb = boto3.resource('dynamodb')
tabla = dynamodb.Table('MiTablaDynamo')

def lambda_handler(event, context):
    try:
        print("Evento recibido:", json.dumps(event))

        http_method = event.get("httpMethod", "")

        # INSERTAR DATO (POST)
        if http_method == "POST":
            if not event.get("body"):
                return {"statusCode": 400, "body": json.dumps({"error": "Cuerpo de la solicitud vacío"})}

            try:
                body = json.loads(event["body"])
            except json.JSONDecodeError:
                return {"statusCode": 400, "body": json.dumps({"error": "El cuerpo de la solicitud no es JSON válido"})}

            id_value = body.get("id")
            nombre = body.get("nombre")

            if not id_value or not nombre:
                return {"statusCode": 400, "body": json.dumps({"error": "Faltan parámetros"})}

            tabla.put_item(Item={"id": id_value, "nombre": nombre})
            return {"statusCode": 200, "body": json.dumps({"message": "Dato insertado"})}

        # CONSULTAR DATO (GET)
        elif http_method == "GET":
            id_value = event["pathParameters"].get("id")

            if not id_value:
                return {"statusCode": 400, "body": json.dumps({"error": "Falta el parámetro id"})}

            response = tabla.get_item(Key={"id": id_value})

            if "Item" in response:
                return {"statusCode": 200, "body": json.dumps({"message": "Dato encontrado", "data": response["Item"]})}
            else:
                return {"statusCode": 404, "body": json.dumps({"error": "Dato no encontrado"})}

        # ELIMINAR DATO (DELETE)
        elif http_method == "DELETE":
            id_value = event["pathParameters"].get("id")

            if not id_value:
                return {"statusCode": 400, "body": json.dumps({"error": "Falta el parámetro id"})}

            response = tabla.delete_item(Key={"id": id_value})

            if response.get("ResponseMetadata", {}).get("HTTPStatusCode") == 200:
                return {"statusCode": 200, "body": json.dumps({"message": "Dato eliminado exitosamente"})}
            else:
                return {"statusCode": 404, "body": json.dumps({"error": "Dato no encontrado para eliminar"})}

        else:
            return {"statusCode": 400, "body": json.dumps({"error": f"Método no soportado: {http_method}"})}

    except Exception as e:
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
