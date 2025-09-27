# Deployment Guide

This guide covers different deployment options for the Enterprise TypeScript Starter application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Production Checklist](#production-checklist)
- [Monitoring and Logging](#monitoring-and-logging)
- [Backup and Recovery](#backup-and-recovery)

## Prerequisites

- Docker and Docker Compose
- Domain name and SSL certificate (for production)
- Cloud provider account (AWS, Google Cloud, Azure, etc.)
- CI/CD pipeline setup (GitHub Actions included)

## Environment Configuration

### Required Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Security (IMPORTANT: Change these in production!)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
```

### Security Best Practices

1. **JWT Secret**: Generate a strong, random secret (minimum 32 characters)
2. **CORS Origin**: Set to your exact domain (avoid wildcards in production)
3. **Environment Variables**: Never commit sensitive data to version control
4. **HTTPS**: Always use HTTPS in production

## Docker Deployment

### Single Container Deployment

```bash
# Build the Docker image
docker build -t enterprise-typescript-starter .

# Run the container
docker run -d \
  --name app \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  enterprise-typescript-starter
```

### Docker Compose (Recommended)

#### Development
```bash
docker-compose up -d
```

#### Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

#### Production with Scaling
```bash
docker-compose -f docker-compose.prod.yml up -d --scale app=3
```

### Docker Swarm Deployment

```bash
# Initialize swarm (on manager node)
docker swarm init

# Deploy the stack
docker stack deploy -c docker-compose.prod.yml enterprise-app

# Scale the service
docker service scale enterprise-app_app=5
```

## Cloud Deployment

### AWS Deployment

#### AWS ECS (Elastic Container Service)

1. **Create ECR Repository**
```bash
aws ecr create-repository --repository-name enterprise-typescript-starter
```

2. **Build and Push Image**
```bash
# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Build and tag image
docker build -t enterprise-typescript-starter .
docker tag enterprise-typescript-starter:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/enterprise-typescript-starter:latest

# Push image
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/enterprise-typescript-starter:latest
```

3. **Create ECS Task Definition**
```json
{
  "family": "enterprise-typescript-starter",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/enterprise-typescript-starter:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:ssm:us-east-1:123456789012:parameter/enterprise-app/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/enterprise-typescript-starter",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### AWS Lambda (Serverless)

```bash
# Install serverless framework
npm install -g serverless

# Create serverless.yml configuration
# Deploy
serverless deploy
```

### Google Cloud Platform

#### Google Cloud Run

```bash
# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/PROJECT-ID/enterprise-typescript-starter

# Deploy to Cloud Run
gcloud run deploy --image gcr.io/PROJECT-ID/enterprise-typescript-starter --platform managed
```

#### Google Kubernetes Engine (GKE)

```yaml
# kubernetes-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: enterprise-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: enterprise-app
  template:
    metadata:
      labels:
        app: enterprise-app
    spec:
      containers:
      - name: app
        image: gcr.io/PROJECT-ID/enterprise-typescript-starter:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: jwt-secret
---
apiVersion: v1
kind: Service
metadata:
  name: enterprise-app-service
spec:
  selector:
    app: enterprise-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
```

### Azure Deployment

#### Azure Container Instances

```bash
# Create resource group
az group create --name enterpriseApp --location eastus

# Deploy container
az container create \
  --resource-group enterpriseApp \
  --name enterprise-app \
  --image your-registry/enterprise-typescript-starter:latest \
  --cpu 1 \
  --memory 1 \
  --ports 3000 \
  --environment-variables NODE_ENV=production \
  --secure-environment-variables JWT_SECRET=your-secret
```

### Kubernetes Deployment

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: enterprise-app

---
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: enterprise-app
type: Opaque
data:
  jwt-secret: <base64-encoded-secret>

---
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: enterprise-app
  namespace: enterprise-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: enterprise-app
  template:
    metadata:
      labels:
        app: enterprise-app
    spec:
      containers:
      - name: app
        image: enterprise-typescript-starter:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: jwt-secret
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

---
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: enterprise-app-service
  namespace: enterprise-app
spec:
  selector:
    app: enterprise-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP

---
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: enterprise-app-ingress
  namespace: enterprise-app
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - yourdomain.com
    secretName: enterprise-app-tls
  rules:
  - host: yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: enterprise-app-service
            port:
              number: 80
```

## Production Checklist

### Security
- [ ] Strong JWT secret (minimum 32 characters)
- [ ] HTTPS/TLS certificate configured
- [ ] CORS origin set to specific domain
- [ ] Security headers enabled (Helmet.js)
- [ ] Rate limiting configured
- [ ] Input validation in place
- [ ] Regular security updates

### Performance
- [ ] Docker image optimized (multi-stage build)
- [ ] Static assets served efficiently
- [ ] Database connection pooling (if applicable)
- [ ] Caching strategy implemented
- [ ] CDN configured for static assets
- [ ] Load balancer configured
- [ ] Auto-scaling enabled

### Monitoring
- [ ] Health check endpoint working
- [ ] Logging configured
- [ ] Error tracking (Sentry, Bugsnag)
- [ ] Performance monitoring (New Relic, DataDog)
- [ ] Uptime monitoring
- [ ] Alerting configured

### Backup and Recovery
- [ ] Database backups scheduled
- [ ] Configuration backups
- [ ] Disaster recovery plan
- [ ] Recovery testing performed

### Documentation
- [ ] Deployment documentation updated
- [ ] Runbooks created
- [ ] Contact information current
- [ ] Change management process

## Monitoring and Logging

### Application Logging

The application includes built-in logging with configurable levels:

```bash
# Environment variables for logging
LOG_LEVEL=info  # error, warn, info, debug
ENABLE_REQUEST_LOGGING=true
```

### Health Checks

The application provides a health check endpoint at `/api/health`:

```bash
curl http://your-domain.com/api/health
```

### Monitoring Integration

#### Prometheus Metrics (Optional)

```javascript
// Add to your application if needed
const promClient = require('prom-client');
const register = promClient.register;

// Expose metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});
```

#### External Monitoring Services

- **Uptime Monitoring**: Pingdom, UptimeRobot
- **Error Tracking**: Sentry, Bugsnag, Rollbar
- **Performance**: New Relic, DataDog, AppDynamics
- **Logs**: ELK Stack, Splunk, Fluentd

## Backup and Recovery

### Configuration Backup

```bash
# Backup environment configuration
tar -czf config-backup-$(date +%Y%m%d).tar.gz .env docker-compose*.yml

# Store in secure location (S3, etc.)
aws s3 cp config-backup-$(date +%Y%m%d).tar.gz s3://your-backup-bucket/
```

### Application State

Since this application uses in-memory storage, consider:

1. **Database Integration**: Add persistent storage (PostgreSQL, MongoDB)
2. **State Backup**: Regular backups of user data
3. **Recovery Testing**: Regular recovery drills

### Disaster Recovery Plan

1. **RTO (Recovery Time Objective)**: Target time to restore service
2. **RPO (Recovery Point Objective)**: Acceptable data loss window
3. **Backup Strategy**: Regular, tested backups
4. **Failover Plan**: Secondary infrastructure ready
5. **Communication Plan**: Stakeholder notification process

## Troubleshooting

### Common Issues

1. **Container won't start**
   - Check environment variables
   - Verify port availability
   - Check logs: `docker logs container-name`

2. **Health check failing**
   - Verify application is running
   - Check port configuration
   - Review application logs

3. **Authentication issues**
   - Verify JWT secret configuration
   - Check token expiration
   - Validate CORS settings

4. **Performance issues**
   - Monitor resource usage
   - Check for memory leaks
   - Review database queries (if applicable)

### Getting Help

1. Check application logs
2. Review health check endpoint
3. Verify environment configuration
4. Consult documentation
5. Create GitHub issue with details

## Rolling Updates

### Zero-Downtime Deployment

```bash
# Using Docker Swarm
docker service update --image new-image:tag enterprise-app_app

# Using Kubernetes
kubectl set image deployment/enterprise-app app=new-image:tag

# Using Docker Compose (blue-green deployment)
docker-compose -f docker-compose.prod.yml up -d --no-deps app
```

### Database Migrations

If you add a database later:

```bash
# Run migrations before deploying new version
npm run migrate

# Deploy application
docker-compose up -d
```

This completes the deployment guide. Choose the deployment method that best fits your infrastructure and requirements.