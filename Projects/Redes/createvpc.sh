VPC_ID=$(aws ec2 create-vpc --cidr-block 192.168.1.0/24 --query Vpc.VpcId --output text \
    --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=MyVpc}]' \
    --query Vpc.VpcId  --output text)

#muestro la vpc
echo $VPC_ID


#habilitar dns en la vpc
aws ec2 modify-vpc-attribute \
    --vpc-id $VPC_ID \
    --enable-dns-hostnames "{\"Value\":true}"

# Creo una subred dentro de la VPC existente
SUB_ID=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 192.168.1.0/28 \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=subred1-raiza}]' \
    --query 'Subnet.SubnetId' --output text)


echo $SUB_ID

echo "Subred creada: $SUB_ID"

# Habilito la ip pública
aws ec2 modify-subnet-attribute \
  --subnet-id $SUB_ID \
  --map-public-ip-on-launch
echo " modify-subnet-attribute"
#Grupo de seguridad
SG_ID=$(aws ec2 create-security-group --vpc-id  $VPC_ID \
  --group-name gs-raiza \
  --description "Mi grupo de seguridad para abrir el puerto 22" \
  --query GroupId --output text)
echo $SG_ID
echo "ec2 create-security-group"

aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --ip-permissions '[{"IpProtocol": "tcp", "FromPort": 22, "ToPort": 22, "IpRanges": [{"CidrIp": "0.0.0.0/0", "Description": "Allow SSH"}]}]'

echo "ec2 authorize-security-group-ingress"


aws ec2 create-tags \
  --resources $SG_ID \
  --tags "Key=Name,Value=migruposeguridad" 

echo "ec2 create-tags"
# Creo una EC2
EC2_ID=$(aws ec2 run-instances \
  --image-id ami-0bdd88bd06d16ba03 \
  --instance-type t2.micro \
  --key-name vockey \
  --subnet-id $SUB_ID \
  --security-group-ids $SG_ID \
  --associate-public-ip-address \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=ec2-raiza}]' \
  --query 'Instances.InstanceId' --output text)


sleep 15
echo $EC2_ID

