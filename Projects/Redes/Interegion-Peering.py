#!/usr/bin/env python3
import boto3
import botocore
import time
from dataclasses import dataclass

# ============================================================
# SCRIPT EXAMEN – VPC PEERING + 2 EC2 (2 REGIONES)
# Objetivo:
# - VPC A en N. Virginia (192.168.0.0/20) + subnet 192.168.0.0/24
# - VPC B en Oregon     (10.0.0.0/20)     + subnet 10.0.0.0/24
# - Conectar ambas con VPC Peering (cross-region)
# - Habilitar DNS resolution en peering
# - Rutas: solo redes internas vía pcx (sin 0.0.0.0/0)
# - SG "gs-preeing": solo ICMP entre redes privadas (local+remota)
# - EC2 sin IP pública (no acceso desde fuera)
# ============================================================

# ---------------- REGIONES ----------------
REGION_A = "us-east-1"   # N. Virginia
REGION_B = "us-west-2"   # Oregon

# ---------------- CIDR (escenario) ----------------
VPC_A_CIDR = "192.168.0.0/20"
SUBNET_A_CIDR = "192.168.0.0/24"

VPC_B_CIDR = "10.0.0.0/20"
SUBNET_B_CIDR = "10.0.0.0/24"

# ---------------- AMI (fijas por región) ----------------
AMI_US_EAST_1 = "ami-0b6c6ebed2801a5cb"     # N. Virginia (la que te dieron)
AMI_US_WEST_2 = "ami-0786adace1541ca80"     # Oregon (la de tu captura)

# ---------------- EC2 ----------------
INSTANCE_TYPE = "t3.micro"

# ---------------- NOMBRES ----------------
PROJECT_TAG = "EXAM-PEERING-ICMP"
SG_NAME = "gs-preeing"


@dataclass
class RegionResources:
    region: str
    ec2: any
    vpc_id: str
    subnet_id: str
    rtb_id: str
    sg_id: str
    instance_id: str = ""
    private_ip: str = ""


def client(service, region):
    return boto3.client(service, region_name=region)


def wait_instance(ec2, instance_id):
    ec2.get_waiter("instance_running").wait(InstanceIds=[instance_id])


def validate_ami_exists(region: str, ami_id: str):
    """Evita fallos tontos: si la AMI no existe en esa región, paro con un mensaje claro."""
    ec2 = client("ec2", region)
    try:
        ec2.describe_images(ImageIds=[ami_id])
    except botocore.exceptions.ClientError as e:
        raise RuntimeError(f"❌ AMI {ami_id} NO válida en {region} o sin permisos. {e}") from e


def create_vpc(region, vpc_cidr, subnet_cidr):
    """
    Creo lo básico por región:
    - VPC con DNS support/hostnames
    - Subnet /24 (sin auto IP pública)
    - Route Table asociada a la subnet (sin IGW ni 0.0.0.0/0)
    - Security Group 'gs-preeing' (sin reglas aún; se añaden tras crear el peering)
    """
    ec2 = client("ec2", region)

    # VPC
    vpc = ec2.create_vpc(
        CidrBlock=vpc_cidr,
        TagSpecifications=[{
            "ResourceType": "vpc",
            "Tags": [{"Key": "Project", "Value": PROJECT_TAG}]
        }]
    )["Vpc"]
    vpc_id = vpc["VpcId"]

    # DNS (para que la resolución funcione bien)
    ec2.modify_vpc_attribute(VpcId=vpc_id, EnableDnsSupport={"Value": True})
    ec2.modify_vpc_attribute(VpcId=vpc_id, EnableDnsHostnames={"Value": True})

    # Subnet (primera AZ disponible)
    az = ec2.describe_availability_zones()["AvailabilityZones"][0]["ZoneName"]
    subnet = ec2.create_subnet(
        VpcId=vpc_id,
        CidrBlock=subnet_cidr,
        AvailabilityZone=az,
        TagSpecifications=[{
            "ResourceType": "subnet",
            "Tags": [{"Key": "Project", "Value": PROJECT_TAG}]
        }]
    )["Subnet"]
    subnet_id = subnet["SubnetId"]

    # Importante: sin IP pública automática
    ec2.modify_subnet_attribute(SubnetId=subnet_id, MapPublicIpOnLaunch={"Value": False})

    # Route table
    rtb = ec2.create_route_table(
        VpcId=vpc_id,
        TagSpecifications=[{
            "ResourceType": "route-table",
            "Tags": [{"Key": "Project", "Value": PROJECT_TAG}]
        }]
    )["RouteTable"]
    rtb_id = rtb["RouteTableId"]
    ec2.associate_route_table(RouteTableId=rtb_id, SubnetId=subnet_id)

    # Security Group con tu nombre exacto
    sg = ec2.create_security_group(
        GroupName=SG_NAME,
        Description="Permite solo ICMP entre VPCs por peering (sin acceso desde fuera)",
        VpcId=vpc_id,
        TagSpecifications=[{
            "ResourceType": "security-group",
            "Tags": [{"Key": "Name", "Value": SG_NAME}, {"Key": "Project", "Value": PROJECT_TAG}]
        }]
    )
    sg_id = sg["GroupId"]

    return RegionResources(region, ec2, vpc_id, subnet_id, rtb_id, sg_id)


def create_peering(ra, rb, account_id):
    """
    Cross-region peering:
    - Creo pcx en región A
    - En región B puede tardar en "existir" (eventual consistency)
      -> reintento describe/accept hasta que aparezca (evita NotFound).
    - Espero a ACTIVE
    - Habilito DNS resolution en ambos lados
    """
    pcx = ra.ec2.create_vpc_peering_connection(
        VpcId=ra.vpc_id,
        PeerVpcId=rb.vpc_id,
        PeerOwnerId=account_id,
        PeerRegion=rb.region,
        TagSpecifications=[{
            "ResourceType": "vpc-peering-connection",
            "Tags": [{"Key": "Project", "Value": PROJECT_TAG}]
        }]
    )["VpcPeeringConnection"]

    pcx_id = pcx["VpcPeeringConnectionId"]

    # 1) Esperar a que el peering aparezca en B y aceptar con reintentos
    last_err = None
    for _ in range(40):  # ~120s
        try:
            rb.ec2.describe_vpc_peering_connections(VpcPeeringConnectionIds=[pcx_id])
            rb.ec2.accept_vpc_peering_connection(VpcPeeringConnectionId=pcx_id)
            break
        except botocore.exceptions.ClientError as e:
            last_err = e
            msg = str(e)
            if "InvalidVpcPeeringConnectionID.NotFound" in msg:
                time.sleep(3)
                continue
            if "is not in a pending-acceptance state" in msg:
                # ya estaba aceptado
                break
            raise
    else:
        raise RuntimeError(f"❌ No pude aceptar el peering {pcx_id} en {rb.region}. Último error: {last_err}")

    # 2) Esperar ACTIVE (mirando desde A)
    for _ in range(40):  # ~120s
        state = ra.ec2.describe_vpc_peering_connections(
            VpcPeeringConnectionIds=[pcx_id]
        )["VpcPeeringConnections"][0]["Status"]["Code"]
        if state == "active":
            break
        time.sleep(3)
    else:
        raise RuntimeError(f"❌ Peering {pcx_id} no pasó a ACTIVE (estado={state}).")

    # 3) DNS resolution en ambos lados (lo que pide el enunciado)
    ra.ec2.modify_vpc_peering_connection_options(
        VpcPeeringConnectionId=pcx_id,
        RequesterPeeringConnectionOptions={"AllowDnsResolutionFromRemoteVpc": True}
    )
    rb.ec2.modify_vpc_peering_connection_options(
        VpcPeeringConnectionId=pcx_id,
        AccepterPeeringConnectionOptions={"AllowDnsResolutionFromRemoteVpc": True}
    )

    return pcx_id


def routes_and_sg(ra, rb, pcx_id):
    """
    - Rutas a la red remota por peering
    - SG: solo ICMP desde CIDR local y CIDR remoto (en ambas regiones)
    """
    # Rutas por peering
    ra.ec2.create_route(
        RouteTableId=ra.rtb_id,
        DestinationCidrBlock=VPC_B_CIDR,
        VpcPeeringConnectionId=pcx_id
    )
    rb.ec2.create_route(
        RouteTableId=rb.rtb_id,
        DestinationCidrBlock=VPC_A_CIDR,
        VpcPeeringConnectionId=pcx_id
    )

    # ICMP
    def icmp(ec2, sg, cidr):
        try:
            ec2.authorize_security_group_ingress(
                GroupId=sg,
                IpPermissions=[{
                    "IpProtocol": "icmp",
                    "FromPort": -1,
                    "ToPort": -1,
                    "IpRanges": [{"CidrIp": cidr, "Description": "ICMP interno"}]
                }]
            )
        except botocore.exceptions.ClientError as e:
            if "InvalidPermission.Duplicate" in str(e):
                return
            raise

    # Permitir ICMP desde ambas redes (local y remota) en cada SG
    icmp(ra.ec2, ra.sg_id, VPC_A_CIDR)
    icmp(ra.ec2, ra.sg_id, VPC_B_CIDR)
    icmp(rb.ec2, rb.sg_id, VPC_B_CIDR)
    icmp(rb.ec2, rb.sg_id, VPC_A_CIDR)


def launch_instance(r, ami):
    """Lanzo EC2 sin KeyPair y sin IP pública."""
    inst = r.ec2.run_instances(
        ImageId=ami,
        InstanceType=INSTANCE_TYPE,
        MinCount=1,
        MaxCount=1,
        NetworkInterfaces=[{
            "DeviceIndex": 0,
            "SubnetId": r.subnet_id,
            "Groups": [r.sg_id],
            "AssociatePublicIpAddress": False
        }],
        TagSpecifications=[{
            "ResourceType": "instance",
            "Tags": [{"Key": "Project", "Value": PROJECT_TAG}]
        }],
        MetadataOptions={"HttpTokens": "required"}  # IMDSv2
    )["Instances"][0]

    r.instance_id = inst["InstanceId"]
    wait_instance(r.ec2, r.instance_id)

    info = r.ec2.describe_instances(InstanceIds=[r.instance_id])["Reservations"][0]["Instances"][0]
    r.private_ip = info["PrivateIpAddress"]


def main():
    # Validaciones para que no falle por AMI
    validate_ami_exists(REGION_A, AMI_US_EAST_1)
    validate_ami_exists(REGION_B, AMI_US_WEST_2)

    account_id = boto3.client("sts").get_caller_identity()["Account"]

    # 1) Crear infraestructura base en ambas regiones
    ra = create_vpc(REGION_A, VPC_A_CIDR, SUBNET_A_CIDR)
    rb = create_vpc(REGION_B, VPC_B_CIDR, SUBNET_B_CIDR)

    # 2) Peering cross-region (con accept robusto)
    pcx_id = create_peering(ra, rb, account_id)

    # 3) Rutas + reglas ICMP internas
    routes_and_sg(ra, rb, pcx_id)

    # 4) Lanzar instancias sin IP pública
    launch_instance(ra, AMI_US_EAST_1)
    launch_instance(rb, AMI_US_WEST_2)

    print("\n=========== RESULTADO ===========")
    print(f"Peering: {pcx_id} (ACTIVE)")
    print(f"[{REGION_A}] EC2 IP privada: {ra.private_ip}  (VPC {VPC_A_CIDR})")
    print(f"[{REGION_B}] EC2 IP privada: {rb.private_ip}  (VPC {VPC_B_CIDR})")
    print(f"SG: {SG_NAME} -> solo ICMP interno (local + remota)")
    print("Internet bloqueado: sin IP pública, sin IGW en estas VPCs y sin ruta 0.0.0.0/0")


if __name__ == "__main__":
    main()
