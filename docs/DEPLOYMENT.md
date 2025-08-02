# Guía de Deployment

## Configuración Inicial

### 1. Configurar Variables de Entorno

#### Backend (.env)
```bash
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-url.vercel.app
```

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=https://your-backend-url.ondigitalocean.app
NEXT_PUBLIC_WS_URL=https://your-backend-url.ondigitalocean.app
```

### 2. Deployment en DigitalOcean (Backend)

#### Opción A: App Platform (Recomendado)
1. Conectar repositorio GitHub a DigitalOcean
2. Usar el archivo `apps/backend/app.yaml` como spec
3. Configurar variables de entorno en el dashboard
4. El deploy se ejecutará automáticamente

#### Opción B: Droplet con Docker
```bash
# En el servidor
git clone <repository>
cd muta-technical-test
docker build -f apps/backend/Dockerfile -t muta-backend .
docker run -d -p 3001:3001 --env-file apps/backend/.env muta-backend
```

### 3. Deployment en Vercel (Frontend)

#### Configuración Automática
1. Conectar repositorio a Vercel
2. Configurar como proyecto Next.js
3. Establecer directorio root como `apps/frontend`
4. Configurar variables de entorno:
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_WS_URL`

#### Manual con CLI
```bash
# Instalar Vercel CLI
npm i -g vercel

# En el directorio del frontend
cd apps/frontend
vercel --prod
```

## Scripts de Desarrollo

### Desarrollo Local
```bash
# Instalar dependencias
pnpm install

# Desarrollo (todos los servicios)
pnpm dev

# Solo backend
pnpm --filter @muta/backend dev

# Solo frontend
pnpm --filter @muta/frontend dev
```

### Build y Test
```bash
# Build todo el proyecto
pnpm build

# Tests
pnpm test

# Lint
pnpm lint

# Formatear código
pnpm format
```

## CI/CD con GitHub Actions

### Secretos Requeridos

#### Para DigitalOcean:
- `DIGITALOCEAN_ACCESS_TOKEN`: Token de acceso a DigitalOcean
- `DO_REGISTRY`: Nombre del registry de contenedores
- `DO_APP_ID`: ID de la aplicación en App Platform

#### Para Vercel:
- `VERCEL_TOKEN`: Token de Vercel
- `VERCEL_ORG_ID`: ID de la organización
- `VERCEL_PROJECT_ID`: ID del proyecto

### Flujo de CI/CD
1. **Push/PR**: Se ejecutan tests y linting
2. **Merge a main**: Deploy automático a producción
3. **Feature branches**: Deploy a preview environments

## Monitoreo y Logs

### DigitalOcean
- Health checks configurados en `/health`
- Logs disponibles en el dashboard de App Platform
- Métricas de CPU y memoria

### Vercel
- Analytics integrados
- Logs de funciones
- Performance monitoring

## Rollback

### DigitalOcean App Platform
```bash
# Listar deployments
doctl apps list-deployments <app-id>

# Crear rollback
doctl apps create-deployment <app-id> --spec apps/backend/app.yaml
```

### Vercel
```bash
# Ver deployments
vercel ls

# Promover deployment anterior
vercel promote <deployment-url>
```

## Optimizaciones de Performance

### Backend
- Compresión gzip habilitada
- Caché de respuestas
- Connection pooling para WebSockets

### Frontend
- Code splitting automático con Next.js
- Optimización de imágenes
- Prefetching de rutas
- Caché de assets estáticos

## Seguridad

### CORS
Configurado para permitir solo el dominio del frontend en producción.

### Rate Limiting
Implementar rate limiting en el backend para APIs públicas.

### HTTPS
- Vercel: HTTPS automático
- DigitalOcean: Certificado SSL automático

## Escalabilidad

### Horizontal Scaling
- DigitalOcean App Platform: Auto-scaling basado en CPU/memoria
- Vercel: Serverless automático

### Performance Monitoring
- Métricas de respuesta de API
- Monitoreo de conexiones WebSocket
- Alertas por errores o latencia alta