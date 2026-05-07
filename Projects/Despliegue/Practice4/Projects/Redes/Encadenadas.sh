#!/bin/bash
# PRÁCTICA 4 – Reglas Encadenadas (AWS)
# Alumna: Raiza Tocolo
# En este script reutilizo la VPC y la Subnet que he creado previamente.
#   VPC:    10.0.0.0/16  -> vpc-09ede3e15ecd8047e
#   Subnet: 10.0.1.0/24  -> subnet-0b6aad54ccfcef32d

echo "INICIO SCRIPT REGLAS ENCADENADAS"
REGION="us-east-1"

# IDs de red ya creados previamente (AJUSTAR SI CAMBIAN)
VPC_ID="vpc-09ede3e15ecd8047e"
SUBNET_ID="subnet-0b6aad54ccfcef32d"
AZ="us-east-1a"

echo
echo "[0] Obteniendo AMIs en la región $REGION"

AMI_BASTION=$(aws ec2 describe-images \
  --region "$REGION" \
  --owners amazon \
  --filters "Name=name,Values=amzn2-ami-hvm-*-x86_64-gp2" \
  --query 'Images | sort_by(@,&CreationDate) | [-1].ImageId' \
  --output text)

AMI_UBUNTU=$(aws ec2 describe-images \
  --region "$REGION" \
  --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
  --query 'Images | sort_by(@,&CreationDate) | [-1].ImageId' \
  --output text)

echo "AMI bastion (Amazon Linux 2): $AMI_BASTION"
echo "AMI Ubuntu 22.04 para app:   $AMI_UBUNTU"

# Par de claves
KEY_NAME="vockey"

# Tu IP pública actual
MY_IP="$(curl -s ifconfig.me)/32"

echo
echo "Región:           $REGION"
echo "VPC utilizada:    $VPC_ID"
echo "Subred utilizada: $SUBNET_ID ($AZ)"
echo "Mi IP pública:    $MY_IP"
echo

# 1. Security Group del bastión
echo "[1] Creando Security Group del bastión"

SG_BASTION=$(aws ec2 create-security-group \
  --region "$REGION" \
  --group-name gs-bastion-raiza \
  --description "Security Group para el servidor bastión (SSH)" \
  --vpc-id "$VPC_ID" \
  --query 'GroupId' \
  --output text)

echo "SG del bastión creado con ID: $SG_BASTION"

echo "Añadiendo regla SSH (22) solo desde mi IP $MY_IP"
aws ec2 authorize-security-group-ingress \
  --region "$REGION" \
  --group-id "$SG_BASTION" \
  --protocol tcp \
  --port 22 \
  --cidr "$MY_IP"

echo "Reglas del SG bastión aplicadas"
echo
# 2. Security Group de la app
echo "[2] Creando Security Group de la app"

SG_APP=$(aws ec2 create-security-group \
  --region "$REGION" \
  --group-name gs-app-raiza \
  --description "Security Group app (HTTPS + SSH + ICMP desde bastion)" \
  --vpc-id "$VPC_ID" \
  --query 'GroupId' \
  --output text)

echo "SG de la app creado con ID: $SG_APP"

echo "Añadiendo regla HTTPS (443) desde cualquier origen"
aws ec2 authorize-security-group-ingress \
  --region "$REGION" \
  --group-id "$SG_APP" \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

echo "Añadiendo regla SSH (22) solo desde SG del bastion"
aws ec2 authorize-security-group-ingress \
  --region "$REGION" \
  --group-id "$SG_APP" \
  --protocol tcp \
  --port 22 \
  --source-group "$SG_BASTION"

echo "Añadiendo regla ICMP (ping) solo desde SG del bastion"
aws ec2 authorize-security-group-ingress \
  --region "$REGION" \
  --group-id "$SG_APP" \
  --protocol icmp \
  --port -1 \
  --source-group "$SG_BASTION"

echo "Reglas del SG app aplicadas"
echo

# 3. Instancia bastión (SSHServer)
echo "[3] Creando instancia BASTION (SSHServer)"

INSTANCE_BASTION=$(aws ec2 run-instances \
  --region "$REGION" \
  --image-id "$AMI_BASTION" \
  --instance-type t2.micro \
  --key-name "$KEY_NAME" \
  --subnet-id "$SUBNET_ID" \
  --security-group-ids "$SG_BASTION" \
  --associate-public-ip-address \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=SSHServer-Raiza}]' \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "Instancia bastión creada con ID: $INSTANCE_BASTION"

BASTION_PUBLIC_IP=$(aws ec2 describe-instances \
  --region "$REGION" \
  --instance-ids "$INSTANCE_BASTION" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "IP pública del bastión: $BASTION_PUBLIC_IP"
echo

# 4. Instancia APP (mi_app)

echo "[4] Creando instancia APP (mi_app)"

INSTANCE_APP=$(aws ec2 run-instances \
  --region "$REGION" \
  --image-id "$AMI_UBUNTU" \
  --instance-type t3.micro \
  --key-name "$KEY_NAME" \
  --subnet-id "$SUBNET_ID" \
  --security-group-ids "$SG_APP" \
  --associate-public-ip-address \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=mi_app-Raiza}]' \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "Instancia app creada con ID: $INSTANCE_APP"

APP_PRIVATE_IP=$(aws ec2 describe-instances \
  --region "$REGION" \
  --instance-ids "$INSTANCE_APP" \
  --query 'Reservations[0].Instances[0].PrivateIpAddress' \
  --output text)

echo "IP privada de la app: $APP_PRIVATE_IP"
echo


# 5. Resumen y comandos de prueba

echo "=== RESUMEN ==="
echo "VPC:             $VPC_ID"
echo "Subred:          $SUBNET_ID ($AZ)"
echo "Bastion SG:      $SG_BASTION"
echo "App SG:          $SG_APP"
echo "Bastion ID:      $INSTANCE_BASTION"
echo "Bastion IP pub:  $BASTION_PUBLIC_IP"
echo "App ID:          $INSTANCE_APP"
echo "App IP privada:  $APP_PRIVATE_IP"
echo
echo "Para conectar (desde tu PC):"
echo "  eval \$(ssh-agent)"
echo "  ssh-add vockey.pem"
echo
echo "  ssh -A -i vockey.pem ec2-user@${BASTION_PUBLIC_IP}"
echo "     (ya dentro del bastion):"
echo "  ssh ubuntu@${APP_PRIVATE_IP}"
echo
echo "Para probar ping desde el bastion:"
echo "  ping ${APP_PRIVATE_IP}"
echo
echo "SCRIPT COMPLETADO (bastion + app + SG encadenados)"
