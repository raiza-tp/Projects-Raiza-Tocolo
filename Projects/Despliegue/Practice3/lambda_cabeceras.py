import json

def lambda_handler(event, context):
    # Extraer cabeceras
    headers = event.get("headers", {})
    prueba_header = headers.get("header_prueba", "No proporcionado")
    mensaje = headers.get("mensaje", "No proporcionado")

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps({
            "mensaje": mensaje,
            "header_prueba": prueba_header
        })
    }