#!/bin/bash

# Radiant Deployment Script for Vultr
# This script pulls the latest code, rebuilds Docker containers, and restarts the application

set -e  # Exit on any error

echo "🚀 Starting Radiant deployment..."

# Configuration
APP_DIR="/var/www/radiant"
DOCKER_COMPOSE_FILE="docker-compose.yml"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root or with sudo"
    exit 1
fi

# Navigate to app directory
cd "$APP_DIR" || {
    log_error "App directory $APP_DIR not found"
    exit 1
}

# Pull latest code
log_info "Pulling latest code from GitHub..."
git pull origin main || {
    log_error "Failed to pull latest code"
    exit 1
}

# Check if .env file exists
if [ ! -f .env ]; then
    log_warn ".env file not found. Please create it from .env.example"
    exit 1
fi

# Stop running containers
log_info "Stopping running containers..."
docker-compose -f "$DOCKER_COMPOSE_FILE" down || true

# Prune old Docker images to free up space
log_info "Cleaning up old Docker images..."
docker image prune -f

# Build new images
log_info "Building Docker images..."
docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache || {
    log_error "Failed to build Docker images"
    exit 1
}

# Start containers
log_info "Starting containers..."
docker-compose -f "$DOCKER_COMPOSE_FILE" up -d || {
    log_error "Failed to start containers"
    exit 1
}

# Wait for app to be healthy
log_info "Waiting for application to be healthy..."
sleep 10

# Check if containers are running
if docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "Up"; then
    log_info "✅ Deployment successful!"
    log_info "Application is running at https://yurasis.com"
else
    log_error "❌ Deployment failed. Containers are not running."
    docker-compose -f "$DOCKER_COMPOSE_FILE" logs --tail=50
    exit 1
fi

# Show container status
log_info "Container status:"
docker-compose -f "$DOCKER_COMPOSE_FILE" ps

log_info "🎉 Deployment completed successfully!"
