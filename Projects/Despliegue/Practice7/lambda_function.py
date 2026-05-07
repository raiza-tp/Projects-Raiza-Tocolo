import json
import boto3

# Clientes SNS y SQS
sns_client = boto3.client('sns')
sqs_client = boto3.client('sqs')

# URLs y ARNs de tus recursos
SQS_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/047847679706/mi-cola-sqs'
SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:047847679706:sns-raiza'

def lambda_handler(event, context):
    # Enviar 20 mensajes a la cola SQS
    for i in range(20):
        mensaje = f'Mensaje de prueba {i+1}'
        
        # Publicar en SQS
        sqs_client.send_message(
            QueueUrl=SQS_QUEUE_URL,
            MessageBody=mensaje
        )
        
        # Notificar por SNS
        sns_client.publish(
            TopicArn=SNS_TOPIC_ARN,
            Message=f'Nuevo mensaje en la cola SQS: {mensaje}',
            Subject='Notificación de cola SQS'
        )
    
    return {
        'statusCode': 200,
        'body': json.dumps('20 mensajes procesados correctamente')
    }