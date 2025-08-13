# AWS Deployment Guide

This document provides a comprehensive guide for deploying the Telegram-Based Attendance Portal on AWS EC2 instances using Docker containers.

## Architecture Overview

The application will be deployed across three separate AWS EC2 instances:

1. **Frontend Instance**: React.js application in Docker container
2. **Backend Instance**: Node.js/Express API in Docker container
3. **Database Instance**: MongoDB database (without Docker)

For the Telegram bot, you have two options:
- Deploy it on the same instance as the backend (recommended for cost efficiency)
- Deploy it on a separate EC2 instance (recommended for high-traffic applications)

## Prerequisites

- AWS account with appropriate permissions
- AWS CLI configured locally
- Docker and Docker Compose installed on your local machine
- SSH keys for EC2 instances
- Telegram Bot Token (obtained from BotFather)

## Step-by-Step Deployment Guide

### 1. Create EC2 Instances

Create three EC2 instances through the AWS Management Console:

#### Frontend Instance
- **Name**: attendance-frontend
- **Instance type**: t2.micro (or as needed based on traffic)
- **AMI**: Amazon Linux 2 or Ubuntu Server LTS
- **Security Group**: Allow inbound traffic on ports 22 (SSH), 80 (HTTP), 443 (HTTPS)

#### Backend Instance
- **Name**: attendance-backend
- **Instance type**: t2.small (or as needed based on traffic)
- **AMI**: Amazon Linux 2 or Ubuntu Server LTS
- **Security Group**: Allow inbound traffic on ports 22 (SSH), 5000 (API)

#### MongoDB Instance
- **Name**: attendance-mongodb
- **Instance type**: t2.medium (or as needed based on database size)
- **AMI**: Amazon Linux 2 or Ubuntu Server LTS
- **Security Group**: Allow inbound traffic on ports 22 (SSH), 27017 (MongoDB) - restrict to backend instance IP only
- **Storage**: Add additional EBS volume for database storage (recommended 20GB+)

### 2. Set Up MongoDB Instance

Connect to your MongoDB instance via SSH:

```bash
ssh -i your-key.pem ec2-user@your-mongodb-instance-ip
```

Install and configure MongoDB:

```bash
# For Amazon Linux 2
sudo amazon-linux-extras install epel -y
sudo tee /etc/yum.repos.d/mongodb-org-4.4.repo << EOF
[mongodb-org-4.4]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/amazon/2/mongodb-org/4.4/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-4.4.asc
EOF
sudo yum install -y mongodb-org

# For Ubuntu
# sudo apt-get update
# sudo apt-get install -y gnupg
# wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | sudo apt-key add -
# echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list
# sudo apt-get update
# sudo apt-get install -y mongodb-org

# Configure MongoDB to accept remote connections
sudo sed -i 's/bindIp: 127.0.0.1/bindIp: 0.0.0.0/' /etc/mongod.conf

# Create data directory if it doesn't exist
sudo mkdir -p /data/db
sudo chown -R mongod:mongod /data/db

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Create database and user
mongosh
> use attendance
> db.createUser({
    user: "attendance_user",
    pwd: "secure_password",
    roles: [{ role: "readWrite", db: "attendance" }]
  })
> exit
```

### 3. Set Up Backend Instance

Connect to your backend instance via SSH:

```bash
ssh -i your-key.pem ec2-user@your-backend-instance-ip
```

Install Docker and Docker Compose:

```bash
# For Amazon Linux 2
sudo yum update -y
sudo amazon-linux-extras install docker -y
sudo service docker start
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Log out and log back in for group changes to take effect
exit
```

Reconnect to the instance and create a project directory:

```bash
ssh -i your-key.pem ec2-user@your-backend-instance-ip
mkdir -p ~/attendance-app/server
cd ~/attendance-app/server
```

Create the Dockerfile:

```bash
cat > Dockerfile << 'EOL'
FROM node:16-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose API port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
EOL
```

Create docker-compose.yml:

```bash
cat > docker-compose.yml << 'EOL'
version: '3'

services:
  backend:
    build: .
    container_name: backend
    ports:
      - "5000:5000"
    restart: always
    environment:
      - PORT=5000
      - MONGO_URI=mongodb://MONGODB_INSTANCE_IP:27017/attendance
      - JWT_SECRET=your_jwt_secret_key
      - NODE_ENV=production

networks:
  default:
    driver: bridge
EOL
```

Replace `MONGODB_INSTANCE_IP` with your MongoDB instance's private IP address.

### 4. Set Up Frontend Instance

Connect to your frontend instance via SSH:

```bash
ssh -i your-key.pem ec2-user@your-frontend-instance-ip
```

Install Docker and Docker Compose (same as backend):

```bash
# For Amazon Linux 2
sudo yum update -y
sudo amazon-linux-extras install docker -y
sudo service docker start
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Log out and log back in for group changes to take effect
exit
```

Reconnect to the instance and create a project directory:

```bash
ssh -i your-key.pem ec2-user@your-frontend-instance-ip
mkdir -p ~/attendance-app/client
cd ~/attendance-app/client
```

Create the Dockerfile:

```bash
cat > Dockerfile << 'EOL'
FROM node:16-alpine as build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from build stage to nginx serve directory
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
EOL
```

Create nginx.conf:

```bash
cat > nginx.conf << 'EOL'
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend server
    location /api {
        proxy_pass http://BACKEND_INSTANCE_IP:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Error pages
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
EOL
```

Replace `BACKEND_INSTANCE_IP` with your backend instance's public IP address.

Create docker-compose.yml:

```bash
cat > docker-compose.yml << 'EOL'
version: '3'

services:
  frontend:
    build: .
    container_name: frontend
    ports:
      - "80:80"
    restart: always

networks:
  default:
    driver: bridge
EOL
```

## 5. Telegram Bot Deployment

You have two options for deploying the Telegram bot:

### Option 1: Deploy with Backend (Same Instance)

This is the recommended approach for cost efficiency. Connect to your backend instance and set up the Telegram bot:

```bash
ssh -i your-key.pem ec2-user@your-backend-instance-ip
mkdir -p ~/attendance-app/telegram-bot
cd ~/attendance-app/telegram-bot
```

Create the Dockerfile:

```bash
cat > Dockerfile << 'EOL'
FROM node:16-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Start the bot
CMD ["npm", "start"]
EOL
```

Update the backend docker-compose.yml to include the Telegram bot:

```bash
cd ~/attendance-app
cat > docker-compose.yml << 'EOL'
version: '3'

services:
  backend:
    build: ./server
    container_name: backend
    ports:
      - "5000:5000"
    restart: always
    environment:
      - PORT=5000
      - MONGO_URI=mongodb://MONGODB_INSTANCE_IP:27017/attendance
      - JWT_SECRET=your_jwt_secret_key
      - NODE_ENV=production

  telegram-bot:
    build: ./telegram-bot
    container_name: telegram-bot
    restart: always
    environment:
      - TELEGRAM_BOT_TOKEN=your_telegram_bot_token
      - API_URL=http://backend:5000
    depends_on:
      - backend

networks:
  default:
    driver: bridge
EOL
```

Replace `MONGODB_INSTANCE_IP` with your MongoDB instance's private IP address and `your_telegram_bot_token` with your actual Telegram bot token.

### Option 2: Deploy on Separate Instance

If you prefer to deploy the Telegram bot on a separate instance (recommended for high-traffic applications):

1. Create a new EC2 instance (t2.micro is sufficient)
2. Install Docker and Docker Compose as shown in previous steps
3. Create a project directory and set up the Telegram bot:

```bash
ssh -i your-key.pem ec2-user@your-bot-instance-ip
mkdir -p ~/attendance-app/telegram-bot
cd ~/attendance-app/telegram-bot
```

Create the Dockerfile:

```bash
cat > Dockerfile << 'EOL'
FROM node:16-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Start the bot
CMD ["npm", "start"]
EOL
```

Create docker-compose.yml:

```bash
cat > docker-compose.yml << 'EOL'
version: '3'

services:
  telegram-bot:
    build: .
    container_name: telegram-bot
    restart: always
    environment:
      - TELEGRAM_BOT_TOKEN=your_telegram_bot_token
      - API_URL=http://BACKEND_INSTANCE_IP:5000

networks:
  default:
    driver: bridge
EOL
```

Replace `BACKEND_INSTANCE_IP` with your backend instance's public IP address and `your_telegram_bot_token` with your actual Telegram bot token.

## 6. Deploy the Application

### Deploy Backend and Telegram Bot (if using Option 1)

```bash
ssh -i your-key.pem ec2-user@your-backend-instance-ip
cd ~/attendance-app

# Copy your application files to the server
# You can use scp, git clone, or any other method

# Build and start the containers
docker-compose up -d
```

### Deploy Frontend

```bash
ssh -i your-key.pem ec2-user@your-frontend-instance-ip
cd ~/attendance-app/client

# Copy your application files to the server
# You can use scp, git clone, or any other method

# Build and start the container
docker-compose up -d
```

### Deploy Telegram Bot (if using Option 2)

```bash
ssh -i your-key.pem ec2-user@your-bot-instance-ip
cd ~/attendance-app/telegram-bot

# Copy your application files to the server
# You can use scp, git clone, or any other method

# Build and start the container
docker-compose up -d
```

## 7. Initialize Admin User

Connect to your backend instance and run the admin initialization script:

```bash
ssh -i your-key.pem ec2-user@your-backend-instance-ip
docker exec -it backend node scripts/init-admin.js
```

## Monitoring and Maintenance

### Viewing Logs

```bash
# Backend logs
ssh -i your-key.pem ec2-user@your-backend-instance-ip
docker logs -f backend

# Telegram bot logs
ssh -i your-key.pem ec2-user@your-backend-instance-ip
docker logs -f telegram-bot
# Or if deployed separately
ssh -i your-key.pem ec2-user@your-bot-instance-ip
docker logs -f telegram-bot

# Frontend logs
ssh -i your-key.pem ec2-user@your-frontend-instance-ip
docker logs -f frontend
```

### Updating the Application

```bash
# Pull latest code changes
git pull

# Rebuild and restart containers
docker-compose up -d --build
```

## Security Considerations

1. **Environment Variables**: Store sensitive information like API keys and database credentials in environment variables or use AWS Secrets Manager.

2. **Security Groups**: Restrict access to your instances by configuring security groups properly:
   - Frontend: Allow HTTP/HTTPS from anywhere, SSH from your IP only
   - Backend: Allow API port (5000) from frontend instance only, SSH from your IP only
   - MongoDB: Allow MongoDB port (27017) from backend instance only, SSH from your IP only

3. **HTTPS**: Set up SSL certificates using AWS Certificate Manager and configure your frontend to use HTTPS.

4. **Regular Updates**: Keep your instances, Docker images, and application dependencies up to date with security patches.

## Backup Strategy

1. **Database Backups**: Set up regular MongoDB backups using cron jobs:

```bash
# Create a backup script
cat > /home/ec2-user/backup-mongodb.sh << 'EOL'
#!/bin/bash
BACKUP_DIR="/home/ec2-user/mongodb-backups"
DATETIME=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
mongodump --host localhost --port 27017 --db attendance --out $BACKUP_DIR/$DATETIME
# Keep only the last 7 backups
ls -1tr $BACKUP_DIR | head -n -7 | xargs -I {} rm -rf $BACKUP_DIR/{}
EOL

chmod +x /home/ec2-user/backup-mongodb.sh

# Add to crontab to run daily at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ec2-user/backup-mongodb.sh") | crontab -
```

2. **Consider using AWS Backup** for automated, managed backups of your EC2 instances and EBS volumes.

## Troubleshooting

### Common Issues

1. **Connection Issues**: Ensure security groups are properly configured to allow traffic between instances.

2. **Docker Issues**: Check Docker logs for errors:
   ```bash
   docker logs [container_name]
   ```

3. **MongoDB Connection Issues**: Verify MongoDB is running and accessible:
   ```bash
   mongo --host [mongodb_ip] --port 27017
   ```

4. **Application Errors**: Check application logs for specific error messages.

### Restarting Services

```bash
# Restart a specific container
docker restart [container_name]

# Restart all containers
docker-compose down && docker-compose up -d
```
- Set up SNS alerts for critical events

## Security Considerations

- Use AWS Secrets Manager for storing sensitive information
- Implement proper IAM roles and policies
- Set up VPC with private subnets for backend and database
- Use Security Groups to restrict traffic between instances
- Enable AWS Shield for DDoS protection

## Backup Strategy

- Set up automated MongoDB backups
- Configure EBS snapshots for database volume
- Store application state in S3 if needed

## Scaling Considerations

- Use Auto Scaling Groups for frontend and backend instances
- Consider MongoDB Atlas for managed database service
- Implement load balancing with ELB for frontend and backend

## Cost Optimization

- Use Reserved Instances for predictable workloads
- Implement auto-scaling based on demand
- Monitor and optimize resource usage
- Consider using Spot Instances for non-critical components

## Troubleshooting

- Check instance logs: `/var/log/cloud-init-output.log`
- Docker container logs: `docker logs <container_id>`
- MongoDB logs: `/var/log/mongodb/mongodb.log`
- Check security group rules if connectivity issues occur