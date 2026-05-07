import json
import boto3

sns_client = boto3.client("sns")

def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        message = body.get("message", "Mensaje por defecto")
        subject = body.get("subject", "Notificación API")

        response = sns_client.publish(
            TopicArn="arn:aws:sns:us-east-1:047847679706:MiNotificacionTopic",
            Message=message,
            Subject=subject
        )

        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "Notificación enviada",
                "SNS_Response": response
            })
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
    