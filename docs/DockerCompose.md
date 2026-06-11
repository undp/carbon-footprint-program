# Docker Setup for Huella Latam

This document provides instructions for building and running the Huella Latam API and PostgreSQL database using Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose v2.0+
- Node.js 24+ (for local development)

## Quick Start with Docker Compose

The easiest way to run the full stack (API + PostgreSQL) is using Docker Compose:

### 1. Configure Environment Variables

Create a `docker-compose.env` file in the project root:

```bash
# Node Environment
NODE_ENV=production

# API Configuration
API_HOST=0.0.0.0
API_PORT=8080

# PostgreSQL Container Configuration
POSTGRES_USER=huella_user
POSTGRES_PASSWORD=huella_password
POSTGRES_DB=huella_latam
POSTGRES_PORT_HOST_MAPPING=5432

# Security
JWT_SECRET=your-secret-key-change-in-production

# Logging
LOG_LEVEL=info
```

### 2. Start the Services

```bash
# Start both API and PostgreSQL
docker compose --env-file docker-compose.env up -d

# View logs
docker compose logs -f

# View API logs only
docker compose logs -f api
```

### 3. Run Migrations and Seeds

```bash
# Run database migrations
docker compose --env-file docker-compose.env exec api sh -c "cd /app/packages/database && npx prisma migrate deploy"

# Seed the database with initial data
docker compose --env-file docker-compose.env exec api sh -c "cd /app && pnpm --filter @repo/seed seed"
```

### 4. Verify the Setup

```bash
# Check health endpoint
curl http://localhost:8080/health
```

### 5. Stop the Services

```bash
# Stop and remove containers
docker compose --env-file docker-compose.env down

# Stop and remove containers + volumes (removes database data)
docker compose --env-file docker-compose.env down -v
```

## Building the Docker Image Manually

### From the Project Root

```bash
docker build -f apps/api/Dockerfile -t huella-latam-api:latest .
```

### From the apps/api Directory

```bash
cd apps/api
docker build -f Dockerfile -t huella-latam-api:latest ../..
```

## Running the Container Manually

### Using Docker Run

```bash
docker run -d \
  --name huella-latam-api \
  -p 8080:8080 \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://user:password@host.docker.internal:5432/dbname?schema=public" \
  -e JWT_SECRET="your-secret-key" \
  -e LOG_LEVEL=info \
  huella-latam-api:latest
```

## Environment Variables

| Variable       | Description                               | Default      | Required |
| -------------- | ----------------------------------------- | ------------ | -------- |
| `NODE_ENV`     | Node environment (development/production) | `production` | No       |
| `API_HOST`     | Host for the API server                   | `localhost`  | No       |
| `API_PORT`     | Port for the API server                   | `8080`       | No       |
| `DATABASE_URL` | PostgreSQL connection string              | -            | Yes\*    |
| `JWT_SECRET`   | Secret key for JWT tokens                 | -            | Yes\*    |
| `LOG_LEVEL`    | Logging level (debug, info, warn, error)  | `info`       | Yes\*    |

\*Required in production. Development has defaults.

## Health Check Endpoints

The API provides two health check endpoints:

### /health

Comprehensive health check that verifies database connectivity:

```bash
curl http://localhost:8080/health
```

Response (healthy):

```json
{
  "status": "ok",
  "timestamp": "2024-12-09T10:30:00.000Z",
  "uptime": 123.456,
  "database": "connected"
}
```

Response (unhealthy):

```json
{
  "status": "degraded",
  "timestamp": "2024-12-09T10:30:00.000Z",
  "uptime": 123.456,
  "database": "disconnected",
  "error": "connection refused"
}
```

You can check Docker's health status:

```bash
docker inspect --format='{{.State.Health.Status}}' huella-latam-api
```

## Database Management

### Running Migrations

```bash
# Using docker compose
docker compose exec api sh -c "cd /app/packages/database && npx prisma migrate deploy"

# Using docker exec
docker exec -it huella-latam-api sh -c "cd /app/packages/database && npx prisma migrate deploy"
```

### Seeding the Database

The database includes seed data for:

- User roles
- Measurement units
- Countries
- Job positions
- Organization sizes
- Sectors and subsectors

```bash
# Using docker compose
docker compose exec api sh -c "cd /app && pnpm --filter @repo/seed seed"

# Using docker exec
docker exec -it huella-latam-api sh -c "cd /app && pnpm --filter @repo/seed seed"
```

### Resetting the Database

```bash
# Using docker compose
docker compose exec api sh -c "cd /app/packages/database && npx prisma migrate reset --force"
```

## Architecture

The Docker setup includes:

### Services

- **api**: Fastify-based API server (Node.js 24)
- **postgres**: PostgreSQL 18 Alpine

### Networking

- Custom bridge network (`huella-network`) for service communication
- API accessible on `localhost:8080`
- PostgreSQL accessible on `localhost:5432`

### Volumes

- `postgres-data`: Persistent storage for PostgreSQL database

### Health Checks

- **API**: HTTP health check at `/health` endpoint with database connectivity verification
- **PostgreSQL**: `pg_isready` command check

## Multi-stage Build Optimization

The Dockerfile uses a multi-stage build to:

1. **Base Stage**: Sets up Node.js 24 with pnpm
2. **Dependencies Stage**: Installs only required dependencies with caching
3. **Builder Stage**: Compiles TypeScript and generates Prisma client
4. **Runner Stage**: Creates minimal production image with:
   - Only production dependencies
   - Non-root user (fastify:nodejs, uid 1001)
   - Built application files
   - Health check configuration

This approach:

- Minimizes final image size
- Improves build performance with layer caching
- Enhances security by running as non-root user
- Separates build-time and runtime dependencies

## Troubleshooting

### Container Won't Start

1. Check logs:

```bash
# docker compose
docker compose logs api

# docker
docker logs huella-latam-api
```

2. Verify environment variables are set:

```bash
docker compose exec api env | grep -E "DATABASE_URL|JWT_SECRET|LOG_LEVEL"
```

3. Check if PostgreSQL is ready:

```bash
docker compose logs postgres
docker compose exec postgres pg_isready -U huella_user
```

### Database Connection Issues

1. Verify database connectivity from API container:

```bash
docker compose exec api sh -c "cd /app/packages/database && echo 'SELECT 1' | npx prisma db execute --stdin"
```

2. Check if services can communicate:

```bash
docker compose exec api ping postgres
```

3. Verify the DATABASE_URL format:
   - Should use service name `postgres` as host when using docker compose
   - Should use actual hostname/IP when running containers separately

### Permission Issues

The container runs as a non-root user (uid 1001, gid 1001). If mounting volumes, ensure proper file permissions:

```bash
chown -R 1001:1001 /path/to/mounted/volume
```

### Build Failures

1. Clear Docker cache:

```bash
docker builder prune -a
```

2. Rebuild without cache:

```bash
docker compose build --no-cache
```

3. Check if all required files are present and not ignored by `.dockerignore`

### Health Check Failing

1. Check if the API is responding:

```bash
docker compose exec api curl http://localhost:8080/health
```

2. Check database connectivity:

```bash
docker compose exec api sh -c "cd /app/packages/database && echo 'SELECT 1' | npx prisma db execute --stdin"
```

## Development Workflow

For local development without Docker:

```bash
# Install dependencies
pnpm install

# Start PostgreSQL (using database package's docker compose)
cd packages/database
docker compose up -d

# Run migrations
pnpm exec prisma migrate dev

# Seed the database (from the repo root)
cd ../..
pnpm db:seed

# Start API in development mode
cd apps/api
pnpm dev
```

## Production Considerations

1. **Environment Variables**:
   - Never commit `.env` files
   - Use secrets management (Azure Key Vault, AWS Secrets Manager, etc.)
   - Ensure `JWT_SECRET` is strong and unique

2. **Database Migrations**:
   - Always run migrations before deploying new versions
   - Test migrations in staging environment first
   - Consider using migration locks for zero-downtime deployments

3. **Health Checks**:
   - Configure your orchestrator (Kubernetes, ECS, etc.) to use `/health` endpoint
   - Set appropriate thresholds for retries and timeouts
   - Use `/health` for readiness probe

4. **Logging**:
   - Set `LOG_LEVEL=info` or `LOG_LEVEL=warn` in production
   - Use structured logging for better observability
   - Configure log aggregation (ELK, CloudWatch, etc.)

5. **Resource Limits**:
   - Set appropriate CPU and memory limits
   - Monitor resource usage and adjust as needed
   - Consider using container orchestration for better resource management

6. **Scaling**:
   - The API is stateless and can be horizontally scaled
   - Use a load balancer for multiple instances
   - Consider database connection pooling (Prisma has built-in pooling)

7. **Security**:
   - Keep base images updated (`node:24-alpine`)
   - Scan images for vulnerabilities
   - Use non-root user (already configured)
   - Implement rate limiting and authentication

8. **Backups**:
   - Regularly backup PostgreSQL data volume
   - Test restore procedures
   - Consider point-in-time recovery for critical data

## Example Production Deployment

### Using Docker with Registry

```bash
# Build with version tag
docker build -f apps/api/Dockerfile -t huella-latam-api:1.0.0 .

# Tag for registry (Azure Container Registry example)
docker tag huella-latam-api:1.0.0 huellalatam.azurecr.io/api:1.0.0
docker tag huella-latam-api:1.0.0 huellalatam.azurecr.io/api:latest

# Login to registry
az acr login --name huellalatam

# Push to registry
docker push huellalatam.azurecr.io/api:1.0.0
docker push huellalatam.azurecr.io/api:latest

# Deploy (example with docker)
docker run -d \
  --name huella-latam-api \
  -p 8080:8080 \
  --restart=unless-stopped \
  --memory=512m \
  --cpus=1 \
  -e NODE_ENV=production \
  -e API_PORT=8080 \
  -e DATABASE_URL="$DATABASE_URL" \
  -e JWT_SECRET="$JWT_SECRET" \
  -e LOG_LEVEL=info \
  huellalatam.azurecr.io/api:1.0.0
```

The resource limits (512MB RAM, 1 CPU) are starting points and should be adjusted based on:

- Application performance monitoring
- Expected load and traffic patterns
- Database query complexity
- Number of concurrent connections

Organizations should benchmark their specific workload to determine optimal resource allocation.

### Using with Azure Container Instances

```bash
az container create \
  --resource-group huella-latam-rg \
  --name huella-latam-api \
  --image huellalatam.azurecr.io/api:1.0.0 \
  --registry-login-server huellalatam.azurecr.io \
  --registry-username <username> \
  --registry-password <password> \
  --dns-name-label huella-latam-api \
  --ports 8080 \
  --environment-variables \
    NODE_ENV=production \
    API_PORT=8080 \
  --secure-environment-variables \
    DATABASE_URL="$DATABASE_URL" \
    JWT_SECRET="$JWT_SECRET" \
  --cpu 1 \
  --memory 1
```

## Additional Resources

- [Dockerfile Reference](https://docs.docker.com/engine/reference/builder/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Fastify Documentation](https://www.fastify.io/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
