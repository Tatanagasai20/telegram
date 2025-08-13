#!/bin/bash

# AWS Deployment Script for Telegram Attendance Portal
# This script helps set up the infrastructure on AWS

# Exit on error
set -e

# Configuration
AWS_REGION="us-east-1"  # Change to your preferred region
KEY_NAME="attendance-portal-key"  # Your SSH key name
VPC_ID=""  # Will be set during execution
SUBNET_ID=""  # Will be set during execution

# AMI IDs (Amazon Linux 2)
AMI_ID="ami-0c02fb55956c7d316"  # Amazon Linux 2 AMI ID for us-east-1

# Instance types
FRONTEND_INSTANCE_TYPE="t2.micro"
BACKEND_INSTANCE_TYPE="t2.small"
MONGODB_INSTANCE_TYPE="t2.medium"

# Security group names
FRONTEND_SG="frontend-sg"
BACKEND_SG="backend-sg"
MONGODB_SG="mongodb-sg"

# Instance names
FRONTEND_NAME="attendance-frontend"
BACKEND_NAME="attendance-backend"
MONGODB_NAME="attendance-mongodb"

# Instance IDs (will be set during execution)
FRONTEND_INSTANCE_ID=""
BACKEND_INSTANCE_ID=""
MONGODB_INSTANCE_ID=""

# Instance IPs (will be set during execution)
FRONTEND_IP=""
BACKEND_IP=""
MONGODB_IP=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting AWS Deployment for Telegram Attendance Portal${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1

fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}AWS CLI is not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

# Create key pair if it doesn't exist
if ! aws ec2 describe-key-pairs --key-names "$KEY_NAME" --region "$AWS_REGION" &> /dev/null; then
    echo -e "${YELLOW}Creating new key pair: $KEY_NAME${NC}"
    aws ec2 create-key-pair --key-name "$KEY_NAME" --query 'KeyMaterial' --output text --region "$AWS_REGION" > "${KEY_NAME}.pem"
    chmod 400 "${KEY_NAME}.pem"
    echo -e "${GREEN}Key pair created and saved to ${KEY_NAME}.pem${NC}"
else
    echo -e "${GREEN}Key pair $KEY_NAME already exists${NC}"
fi

# Get default VPC ID
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region "$AWS_REGION")
echo -e "${GREEN}Using VPC: $VPC_ID${NC}"

# Get first subnet in the VPC
SUBNET_ID=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[0].SubnetId" --output text --region "$AWS_REGION")
echo -e "${GREEN}Using Subnet: $SUBNET_ID${NC}"

# Create security groups
echo -e "${YELLOW}Creating security groups...${NC}"

# Frontend security group
if ! aws ec2 describe-security-groups --group-names "$FRONTEND_SG" --region "$AWS_REGION" &> /dev/null; then
    FRONTEND_SG_ID=$(aws ec2 create-security-group --group-name "$FRONTEND_SG" --description "Security group for frontend" --vpc-id "$VPC_ID" --region "$AWS_REGION" --output text --query 'GroupId')
    echo -e "${GREEN}Created frontend security group: $FRONTEND_SG_ID${NC}"
    
    # Allow SSH, HTTP, and HTTPS
    aws ec2 authorize-security-group-ingress --group-id "$FRONTEND_SG_ID" --protocol tcp --port 22 --cidr 0.0.0.0/0 --region "$AWS_REGION"
    aws ec2 authorize-security-group-ingress --group-id "$FRONTEND_SG_ID" --protocol tcp --port 80 --cidr 0.0.0.0/0 --region "$AWS_REGION"
    aws ec2 authorize-security-group-ingress --group-id "$FRONTEND_SG_ID" --protocol tcp --port 443 --cidr 0.0.0.0/0 --region "$AWS_REGION"
else
    FRONTEND_SG_ID=$(aws ec2 describe-security-groups --group-names "$FRONTEND_SG" --region "$AWS_REGION" --query 'SecurityGroups[0].GroupId' --output text)
    echo -e "${GREEN}Frontend security group already exists: $FRONTEND_SG_ID${NC}"
fi

# Backend security group
if ! aws ec2 describe-security-groups --group-names "$BACKEND_SG" --region "$AWS_REGION" &> /dev/null; then
    BACKEND_SG_ID=$(aws ec2 create-security-group --group-name "$BACKEND_SG" --description "Security group for backend" --vpc-id "$VPC_ID" --region "$AWS_REGION" --output text --query 'GroupId')
    echo -e "${GREEN}Created backend security group: $BACKEND_SG_ID${NC}"
    
    # Allow SSH and API port
    aws ec2 authorize-security-group-ingress --group-id "$BACKEND_SG_ID" --protocol tcp --port 22 --cidr 0.0.0.0/0 --region "$AWS_REGION"
    aws ec2 authorize-security-group-ingress --group-id "$BACKEND_SG_ID" --protocol tcp --port 5000 --cidr 0.0.0.0/0 --region "$AWS_REGION"
else
    BACKEND_SG_ID=$(aws ec2 describe-security-groups --group-names "$BACKEND_SG" --region "$AWS_REGION" --query 'SecurityGroups[0].GroupId' --output text)
    echo -e "${GREEN}Backend security group already exists: $BACKEND_SG_ID${NC}"
fi

# MongoDB security group
if ! aws ec2 describe-security-groups --group-names "$MONGODB_SG" --region "$AWS_REGION" &> /dev/null; then
    MONGODB_SG_ID=$(aws ec2 create-security-group --group-name "$MONGODB_SG" --description "Security group for MongoDB" --vpc-id "$VPC_ID" --region "$AWS_REGION" --output text --query 'GroupId')
    echo -e "${GREEN}Created MongoDB security group: $MONGODB_SG_ID${NC}"
    
    # Allow SSH
    aws ec2 authorize-security-group-ingress --group-id "$MONGODB_SG_ID" --protocol tcp --port 22 --cidr 0.0.0.0/0 --region "$AWS_REGION"
    # MongoDB port will be restricted to backend instance only (updated later)
else
    MONGODB_SG_ID=$(aws ec2 describe-security-groups --group-names "$MONGODB_SG" --region "$AWS_REGION" --query 'SecurityGroups[0].GroupId' --output text)
    echo -e "${GREEN}MongoDB security group already exists: $MONGODB_SG_ID${NC}"
fi

# Launch instances
echo -e "${YELLOW}Launching instances...${NC}"

# Launch MongoDB instance
echo -e "${YELLOW}Launching MongoDB instance...${NC}"
MONGODB_INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$AMI_ID" \
    --instance-type "$MONGODB_INSTANCE_TYPE" \
    --key-name "$KEY_NAME" \
    --security-group-ids "$MONGODB_SG_ID" \
    --subnet-id "$SUBNET_ID" \
    --block-device-mappings "[{\"DeviceName\":\"/dev/xvda\",\"Ebs\":{\"VolumeSize\":30,\"VolumeType\":\"gp2\"}}]" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$MONGODB_NAME}]" \
    --region "$AWS_REGION" \
    --query 'Instances[0].InstanceId' \
    --output text)

echo -e "${GREEN}MongoDB instance launched: $MONGODB_INSTANCE_ID${NC}"

# Wait for MongoDB instance to be running
echo -e "${YELLOW}Waiting for MongoDB instance to be running...${NC}"
aws ec2 wait instance-running --instance-ids "$MONGODB_INSTANCE_ID" --region "$AWS_REGION"

# Get MongoDB instance IP
MONGODB_IP=$(aws ec2 describe-instances --instance-ids "$MONGODB_INSTANCE_ID" --region "$AWS_REGION" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
echo -e "${GREEN}MongoDB instance IP: $MONGODB_IP${NC}"

# Launch backend instance
echo -e "${YELLOW}Launching backend instance...${NC}"
BACKEND_INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$AMI_ID" \
    --instance-type "$BACKEND_INSTANCE_TYPE" \
    --key-name "$KEY_NAME" \
    --security-group-ids "$BACKEND_SG_ID" \
    --subnet-id "$SUBNET_ID" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$BACKEND_NAME}]" \
    --region "$AWS_REGION" \
    --query 'Instances[0].InstanceId' \
    --output text)

echo -e "${GREEN}Backend instance launched: $BACKEND_INSTANCE_ID${NC}"

# Wait for backend instance to be running
echo -e "${YELLOW}Waiting for backend instance to be running...${NC}"
aws ec2 wait instance-running --instance-ids "$BACKEND_INSTANCE_ID" --region "$AWS_REGION"

# Get backend instance IP
BACKEND_IP=$(aws ec2 describe-instances --instance-ids "$BACKEND_INSTANCE_ID" --region "$AWS_REGION" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
echo -e "${GREEN}Backend instance IP: $BACKEND_IP${NC}"

# Update MongoDB security group to allow access from backend instance only
echo -e "${YELLOW}Updating MongoDB security group to allow access from backend instance only...${NC}"
aws ec2 authorize-security-group-ingress --group-id "$MONGODB_SG_ID" --protocol tcp --port 27017 --cidr "$BACKEND_IP/32" --region "$AWS_REGION"

# Launch frontend instance
echo -e "${YELLOW}Launching frontend instance...${NC}"
FRONTEND_INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$AMI_ID" \
    --instance-type "$FRONTEND_INSTANCE_TYPE" \
    --key-name "$KEY_NAME" \
    --security-group-ids "$FRONTEND_SG_ID" \
    --subnet-id "$SUBNET_ID" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$FRONTEND_NAME}]" \
    --region "$AWS_REGION" \
    --query 'Instances[0].InstanceId' \
    --output text)

echo -e "${GREEN}Frontend instance launched: $FRONTEND_INSTANCE_ID${NC}"

# Wait for frontend instance to be running
echo -e "${YELLOW}Waiting for frontend instance to be running...${NC}"
aws ec2 wait instance-running --instance-ids "$FRONTEND_INSTANCE_ID" --region "$AWS_REGION"

# Get frontend instance IP
FRONTEND_IP=$(aws ec2 describe-instances --instance-ids "$FRONTEND_INSTANCE_ID" --region "$AWS_REGION" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
echo -e "${GREEN}Frontend instance IP: $FRONTEND_IP${NC}"

# Print summary
echo -e "\n${GREEN}=== Deployment Summary ===${NC}"
echo -e "${YELLOW}MongoDB Instance:${NC}"
echo -e "  ID: $MONGODB_INSTANCE_ID"
echo -e "  IP: $MONGODB_IP"
echo -e "  SSH: ssh -i ${KEY_NAME}.pem ec2-user@$MONGODB_IP"

echo -e "\n${YELLOW}Backend Instance:${NC}"
echo -e "  ID: $BACKEND_INSTANCE_ID"
echo -e "  IP: $BACKEND_IP"
echo -e "  SSH: ssh -i ${KEY_NAME}.pem ec2-user@$BACKEND_IP"
echo -e "  API URL: http://$BACKEND_IP:5000"

echo -e "\n${YELLOW}Frontend Instance:${NC}"
echo -e "  ID: $FRONTEND_INSTANCE_ID"
echo -e "  IP: $FRONTEND_IP"
echo -e "  SSH: ssh -i ${KEY_NAME}.pem ec2-user@$FRONTEND_IP"
echo -e "  Website URL: http://$FRONTEND_IP"

echo -e "\n${GREEN}Next Steps:${NC}"
echo -e "1. SSH into each instance to set up Docker and deploy the application"
echo -e "2. Follow the instructions in DEPLOYMENT.md for each instance"
echo -e "3. Update environment variables with the correct IPs"

echo -e "\n${GREEN}Deployment script completed!${NC}"