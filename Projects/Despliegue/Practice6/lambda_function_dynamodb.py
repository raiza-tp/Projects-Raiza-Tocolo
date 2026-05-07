import json
import boto3
import datetime

sns_client = boto3.client("sns")
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Mensajes')

def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        message = body.get("message", "Mensaje por defecto")
        subject = body.get("subject", "Notificación API")

        fecha = str(datetime.datetime.utcnow())

        # Guardar en DynamoDB
        table.put_item(
            Item={
                'id': fecha,
                'mensaje': message
            }
        )

        # Enviar mensaje a SNS
        response = sns_client.publish(
            TopicArn="arn:aws:sns:us-east-1:047847679706:MiNotificacionTopic",
            Message=message,
            Subject=subject
        )

        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "Notificación enviada y guardada en DynamoDB",
                "SNS_Response": response
            })
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
    