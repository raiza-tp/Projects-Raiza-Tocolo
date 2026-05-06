import json
import boto3

def lambda_handler(event, context):
    regiones = ["us-east-1", "us-west-2"]
    resultado = {}

    for region in regiones:
        ec2 = boto3.client("ec2", region_name=region)

        respuesta = ec2.describe_instances(
            Filters=[
                {
                    "Name": "instance-state-name",
                    "Values": ["running"]
                },
                {
                    "Name": "tag:entorno",
                    "Values": ["pruebas"]
                }
            ]
        )

        instancias = [
            inst["InstanceId"]
            for reserva in respuesta["Reservations"]
            for inst in reserva["Instances"]
        ]

        resultado[region] = (
            f"{len(instancias)} instancia(s) activa(s)"
            if instancias
            else "No hay instancias activas"
        )

    return {
        "statusCode": 200,
        "body": json.dumps(resultado)
    }
