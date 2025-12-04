#!/bin/bash

# Script para cambiar el tipo de una instancia EC2
# Uso: ./cambia_tipo_ec2.sh

# 1) Comprobación de parámetros
if [ "$#" -ne 2 ]; then
  echo "Uso: $0 <id-instancia> <nuevo-tipo>"
  exit 1
fi

INSTANCE_ID="$1"
NEW_TYPE="$2"
REGION="us-east-1"

echo "Obteniendo información de la instancia"

INFO=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].[InstanceId,InstanceType,State.Name]' \
  --output text)

if [ -z "$INFO" ]; then
  echo "La instancia no existe o no tengo acceso"
  exit 1
fi


INFO=$(aws ec2 describe-instances \
  --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].[InstanceId,InstanceType,State.Name]' \
  --output text 2>/dev/null)

if [ -z "$INFO" ]; then
  echo "La instancia no existe o no tengo acceso"
  exit 1
fi

CURRENT_TYPE=$(echo "$INFO" | awk '{print $2}')
CURRENT_STATE=$(echo "$INFO" | awk '{print $3}')

echo "ID: $INSTANCE_ID"
echo "Tipo actual: $CURRENT_TYPE"
echo "Estado actual: $CURRENT_STATE"
echo "Tipo solicitado inicialmente: $NEW_TYPE"

# 2) Validar tipo de instancia y que sea distinto al actual
while true; do
  VALID=$(aws ec2 describe-instance-types \
    --region "$REGION" \
    --instance-types "$NEW_TYPE" \
    --output text 2>/dev/null)

  if [ -z "$VALID" ]; then
    echo "El tipo de instancia '$NEW_TYPE' no es válido en AWS"
    read -rp "Introduce un tipo de instancia válido: " NEW_TYPE
    continue
  fi

  if [ "$CURRENT_TYPE" = "$NEW_TYPE" ]; then
    echo "El tipo introducido es igual al actual. Debes elegir un tipo diferente"
    read -rp "Introduce un tipo de instancia distinto al actual: " NEW_TYPE
    continue
  fi

  break
done

echo "La instancia cambiará de $CURRENT_TYPE a $NEW_TYPE"
read -rp "¿Quieres continuar? [s/N] " RESP

if [[ ! "$RESP" =~ ^[sS]$ ]]; then
  echo "Acción cancelada"
  exit 0
fi

# 3) Si está corriendo, la detengo
if [ "$CURRENT_STATE" = "running" ]; then
  echo "Deteniendo la instancia"
  aws ec2 stop-instances --region "$REGION" --instance-ids "$INSTANCE_ID" >/dev/null
  aws ec2 wait instance-stopped --region "$REGION" --instance-ids "$INSTANCE_ID"
else
  echo "La instancia no está encendida y puedo continuar"
fi

# 4) Cambio de tipo
echo "Cambiando el tipo a $NEW_TYPE"

aws ec2 modify-instance-attribute \
  --region "$REGION" \
  --instance-id "$INSTANCE_ID" \
  --instance-type "{\"Value\":\"$NEW_TYPE\"}"

# 5) Arrancar la instancia de nuevo
echo "Iniciando la instancia"

aws ec2 start-instances --region "$REGION" --instance-ids "$INSTANCE_ID" >/dev/null
aws ec2 wait instance-running --region "$REGION" --instance-ids "$INSTANCE_ID"

# 6) Mostrar el resultado final
RESULT=$(aws ec2 describe-instances \
  --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].[InstanceType,State.Name]' \
  --output text)

echo "Cambio completado"
echo "Nueva configuración: $RESULT"
