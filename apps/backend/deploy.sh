#!/bin/bash

# Deployment script for DigitalOcean production environment
# Usage: ./deploy.sh [environment]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default environment
ENVIRONMENT=${1:-production}

echo -e "${GREEN}🚀 Starting deployment for ${ENVIRONMENT} environment${NC}"

# Validate environment
if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "staging" ]]; then
    echo -e "${RED}❌ Invalid environment. Use 'production' or 'staging'${NC}"
    exit 1
fi

# Check if required files exist
REQUIRED_FILES=(".env" "Dockerfile.production" "docker-compose.production.yml" "nginx.prod.conf")
for file in "${REQUIRED_FILES[@]}"; do
    if [[ ! -f "$file" ]]; then
        echo -e "${RED}❌ Required file $file not found${NC}"
        exit 1
    fi
done

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running${NC}"
    exit 1
fi

# Load environment variables
if [[ -f ".env.${ENVIRONMENT}" ]]; then
    echo -e "${YELLOW}📋 Loading environment variables from .env.${ENVIRONMENT}${NC}"
    export $(cat .env.${ENVIRONMENT} | grep -v '^#' | xargs)
elif [[ -f ".env" ]]; then
    echo -e "${YELLOW}📋 Loading environment variables from .env${NC}"
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${RED}❌ No environment file found${NC}"
    exit 1
fi

# Validate required environment variables
REQUIRED_VARS=("CORS_ORIGIN" "WS_API_KEY")
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        echo -e "${RED}❌ Required environment variable $var is not set${NC}"
        exit 1
    fi
done

# Generate SSL certificates if they don't exist (for development/staging)
if [[ ! -d "ssl" && "$ENVIRONMENT" != "production" ]]; then
    echo -e "${YELLOW}🔒 Generating self-signed SSL certificates for ${ENVIRONMENT}${NC}"
    mkdir -p ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/key.pem \
        -out ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
fi

# Build and start containers
echo -e "${YELLOW}🔨 Building Docker images${NC}"
docker-compose -f docker-compose.production.yml build

echo -e "${YELLOW}🛑 Stopping existing containers${NC}"
docker-compose -f docker-compose.production.yml down

echo -e "${YELLOW}🧹 Cleaning up unused images${NC}"
docker image prune -f

echo -e "${YELLOW}🚀 Starting new containers${NC}"
docker-compose -f docker-compose.production.yml up -d

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be healthy${NC}"
sleep 10

# Check backend health
BACKEND_HEALTH_URL="http://localhost:8080/health"
for i in {1..30}; do
    if curl -f -s "$BACKEND_HEALTH_URL" > /dev/null; then
        echo -e "${GREEN}✅ Backend is healthy${NC}"
        break
    fi
    if [[ $i -eq 30 ]]; then
        echo -e "${RED}❌ Backend health check failed${NC}"
        docker-compose -f docker-compose.production.yml logs backend
        exit 1
    fi
    echo -e "${YELLOW}⏳ Waiting for backend... ($i/30)${NC}"
    sleep 2
done

# Check Nginx health (if using)
if docker-compose -f docker-compose.production.yml ps | grep -q nginx; then
    NGINX_HEALTH_URL="http://localhost/health"
    for i in {1..15}; do
        if curl -f -s "$NGINX_HEALTH_URL" > /dev/null; then
            echo -e "${GREEN}✅ Nginx is healthy${NC}"
            break
        fi
        if [[ $i -eq 15 ]]; then
            echo -e "${RED}❌ Nginx health check failed${NC}"
            docker-compose -f docker-compose.production.yml logs nginx
            exit 1
        fi
        echo -e "${YELLOW}⏳ Waiting for Nginx... ($i/15)${NC}"
        sleep 2
    done
fi

# Show deployment status
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📊 Service Status:${NC}"
docker-compose -f docker-compose.production.yml ps

echo ""
echo -e "${YELLOW}🔗 Service URLs:${NC}"
echo "  Backend API: http://localhost:8080/api"
echo "  Health Check: http://localhost:8080/health"
echo "  API Documentation: http://localhost:8080/api"

if docker-compose -f docker-compose.production.yml ps | grep -q nginx; then
    echo "  Nginx Proxy: http://localhost/"
    echo "  HTTPS: https://localhost/"
fi

echo ""
echo -e "${YELLOW}📋 Useful Commands:${NC}"
echo "  View logs: docker-compose -f docker-compose.production.yml logs -f"
echo "  Stop services: docker-compose -f docker-compose.production.yml down"
echo "  Restart: docker-compose -f docker-compose.production.yml restart"
echo "  Shell access: docker-compose -f docker-compose.production.yml exec backend sh"

# Optional: Run basic API tests
if command -v curl &> /dev/null; then
    echo ""
    echo -e "${YELLOW}🧪 Running basic API tests${NC}"
    
    # Test health endpoint
    if curl -f -s "http://localhost:8080/health" | grep -q "ok"; then
        echo -e "${GREEN}✅ Health endpoint working${NC}"
    else
        echo -e "${RED}❌ Health endpoint failed${NC}"
    fi
    
    # Test API documentation
    if curl -f -s "http://localhost:8080/api" | grep -q "Muta Orders API"; then
        echo -e "${GREEN}✅ API documentation working${NC}"
    else
        echo -e "${RED}❌ API documentation failed${NC}"
    fi
    
    # Test orders endpoint
    if curl -f -s "http://localhost:8080/api/orders" | grep -q "data"; then
        echo -e "${GREEN}✅ Orders API working${NC}"
    else
        echo -e "${RED}❌ Orders API failed${NC}"
    fi
fi

echo ""
echo -e "${GREEN}✨ Deployment completed! Your application is ready.${NC}"

# Security reminder
echo ""
echo -e "${YELLOW}🔒 Security Reminders:${NC}"
echo "  ⚠️  Update your DNS records to point to this server"
echo "  ⚠️  Configure proper SSL certificates for production"
echo "  ⚠️  Set up monitoring and log aggregation"
echo "  ⚠️  Configure firewall rules"
echo "  ⚠️  Set up automated backups"
echo "  ⚠️  Review and update environment variables"