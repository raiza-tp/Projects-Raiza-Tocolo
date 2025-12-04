#!/bin/bash
#Practica NACL
#En esta práctica voy a usar recursos que ya tengo creados en mi laboratorio:
#Una VPC
#Dos subredes
#Un Internet Gateway

# 1) Uso una VPC que ya existe en mi laboratorio (10.0.0.0/16)
VPC_ID="vpc-072094cdf616da69b"
echo "Usando VPC existente: $VPC_ID"

#2) Uso dos subredes que ya existen dentro de mi VPC
#Subred 1 (es la 10.0.11.0/24)
SUBNET1_ID="subnet-028941b65ed7c8a4d"
echo "Subred 1 que voy a usar: $SUBNET1_ID"

# Subred 2 (la 10.0.2.0/24)
SUBNET2_ID="subnet-07188933c46568673"
echo "Subred 2 que voy a usar: $SUBNET2_ID"

#3) Uso el Internet Gateway que ya esta añadido a mi VPC
IGW_ID="igw-07c96e67d87288101"
echo "Voy a usar este Internet Gateway que ya tenía creado: $IGW_ID"

#4)Creo una nueva tabla de rutas publica para mus subredes
echo "Creando una tabla de rutas pública nueva para mi VPC..."
RT_ID=$(aws ec2 create-route-table \
    --vpc-id "$VPC_ID" \
    --query RouteTable.RouteTableId \
    --output text)
echo "Tabla de rutas creada: $RT_ID"

#5)Añado la ruta por defecto hacia Internet usando mi IGW
echo "Añadiendo ruta por defecto (0.0.0.0/0) hacia Internet..."
aws ec2 create-route \
    --route-table-id "$RT_ID" \
    --destination-cidr-block 0.0.0.0/0 \
    --gateway-id "$IGW_ID"

#6)Intento asociar la tabla de rutas a mis dos subredes
echo "Asociando la tabla de rutas a la Subred 1"
aws ec2 associate-route-table \
    --route-table-id "$RT_ID" \
    --subnet-id "$SUBNET1_ID"
echo "Subred 1 ya tenía una tabla de rutas asociada."

echo "Asociando la tabla de rutas a la Subred 2"
aws ec2 associate-route-table \
    --route-table-id "$RT_ID" \
    --subnet-id "$SUBNET2_ID" 

echo "Subred 2 ya tenía una tabla de rutas asociada"
echo "Mi tabla de rutas pública ya está lista para las dos subredes"

echo "Ahora voy a preparar el Security Group para las pruebas de ping"
#7)Security Group para probar que guarda el estado


SG_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=ping-solo-entrada" \
    --query "SecurityGroups[0].GroupId" \
    --output text)

if [ "$SG_ID" = "None" ]; then
  echo "El Security Group no existía, lo creo ahora"
  SG_ID=$(aws ec2 create-security-group \
      --group-name "ping-solo-entrada" \
      --description "SG para probar ping solo de entrada (stateful)" \
      --vpc-id "$VPC_ID" \
      --query GroupId \
      --output text)

  echo "Security Group creado: $SG_ID"
  echo "Añado la regla para permitir ping de entrada"
  aws ec2 authorize-security-group-ingress \
      --group-id "$SG_ID" \
      --protocol icmp \
      --port -1 \
      --cidr 0.0.0.0/0
else
  echo "El Security Group ya existía, uso este ID: $SG_ID"
fi

echo "El SG ya está listo para las pruebas de ping"

echo "Ahora cuando creo la NACL quiero demostrar que las NACL no guardan el estado, a diferencia de los Security Groups"

#8) Creo la NACL dentro de mi VPC
NACL_ID=$(aws ec2 create-network-acl \
    --vpc-id "$VPC_ID" \
    --query NetworkAcl.NetworkAclId \
    --output text)

echo "Mi NACL se ha creado correctamente: $NACL_ID"

#Regla SOLO de entrada ICMP
echo "Le voy a añadir una regla que permita solo la entrada del ping"
echo "Aquí es donde se ve que la NACL es stateless (sin estado): dejo entrar el ping pero no la respuesta"

aws ec2 create-network-acl-entry \
    --network-acl-id "$NACL_ID" \
    --rule-number 100 \
    --protocol icmp \
    --rule-action allow \
    --ingress \
    --cidr-block 0.0.0.0/0 \
    --icmp-type-code Type=-1,Code=-1

echo "Regla de entrada ICMP aplicada. De momento NO dejo salida, así que el ping no debería volver"

#9)Asocio la NACL a la Subred 2 para cortar el ping
echo "Ahora asocio esta NACL a mi Subred 2 para hacer la prueba del ping sin estado"

ASSOC_ID=$(aws ec2 describe-network-acls \
    --filters "Name=association.subnet-id,Values=$SUBNET2_ID" \
    --query "NetworkAcls[0].Associations[0].NetworkAclAssociationId" \
    --output text)

echo "Association ID actual de la Subred 2: $ASSOC_ID"

aws ec2 replace-network-acl-association \
    --association-id "$ASSOC_ID" \
    --network-acl-id "$NACL_ID"

echo "La NACL nueva ya está asociada a la Subred 2. Aquí es donde el ping no me debería volver porque no tiene regla de salida"

#10) Lanzo dos instancias EC2 para las pruebas de ping
echo "Ahora voy a lanzar las instancias EC2 para hacer las pruebas de ping"

IMAGE_ID="ami-0023921b4fcd5382b"

echo "Lanzo mi instancia EC2 1 en la Subred 1"

EC2A_ID=$(aws ec2 run-instances \
    --image-id "$IMAGE_ID" \
    --instance-type t2.micro \
    --subnet-id "$SUBNET1_ID" \
    --security-group-ids "$SG_ID" \
    --associate-public-ip-address \
    --query "Instances[0].InstanceId" \
    --output text)

echo "Instancia A lanzada con ID: $EC2A_ID"


echo "Lanzo mi instancia EC2 2 en la Subred 2"

EC2B_ID=$(aws ec2 run-instances \
    --image-id "$IMAGE_ID" \
    --instance-type t2.micro \
    --subnet-id "$SUBNET2_ID" \
    --security-group-ids "$SG_ID" \
    --associate-public-ip-address \
    --query "Instances[0].InstanceId" \
    --output text)

echo "Instancia B lanzada con ID: $EC2B_ID"

echo "Con estas dos instancias ya puedo entrar por consola y probar los pings entre ellas"
#So! Jetz tengo que probar hacer ping y comprobar que me funciona
