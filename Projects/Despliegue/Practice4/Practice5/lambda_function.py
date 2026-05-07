import json

def lambda_handler(event, context):
    print("Evento recibido:", event)
    
    es_mayor = event.get('age', 0) >= 18
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'mensaje': f"Holas {event.get('fullName', '')}",
            'mayorDeEdad': es_mayor
        })
    }
