#!/bin/bash

# Script para solucionar el problema de logs en Docker
# Uso: ./fix-logging.sh

echo "🔧 SOLUCIONANDO PROBLEMA DE LOGS DE DOCKER"
echo "=========================================="
echo ""

# Verificar si el contenedor está corriendo
CONTAINER_ID=$(docker ps --format "{{.ID}}" --filter "ancestor=muta-backend")

if [ -z "$CONTAINER_ID" ]; then
    echo "❌ No se encontró contenedor corriendo con imagen muta-backend"
    echo "Verificando todos los contenedores..."
    docker ps -a
    exit 1
fi

echo "✅ Contenedor encontrado: $CONTAINER_ID"
echo ""

echo "1. Verificando logs del archivo del sistema:"
LOG_PATH=$(docker inspect $CONTAINER_ID --format='{{.LogPath}}')
echo "Archivo de log: $LOG_PATH"

if [ -f "$LOG_PATH" ]; then
    echo "Últimos logs del archivo del sistema:"
    sudo tail -20 "$LOG_PATH" 2>/dev/null || echo "❌ No se puede leer archivo de log"
else
    echo "❌ Archivo de log no encontrado"
fi

echo ""
echo "2. Solucionando problema temporalmente:"
echo "Estableciendo LOG_LEVEL=info para el contenedor actual..."

# Método 1: Reiniciar con variables de entorno corregidas
echo "Reiniciando contenedor con logs mejorados..."
docker stop $CONTAINER_ID
docker run -d \
  --name muta-backend-fixed \
  -p 8080:8080 \
  -e NODE_ENV=production \
  -e PORT=8080 \
  -e LOG_LEVEL=info \
  -e LOG_FORMAT=simple \
  -e ENABLE_STARTUP_LOGS=true \
  -e CORS_ORIGIN=http://localhost:3000 \
  -e WS_API_KEY=secure-production-api-key-generate-random \
  -e RATE_LIMIT_WINDOW_MS=900000 \
  -e RATE_LIMIT_MAX=1000 \
  -e WS_PING_TIMEOUT=60000 \
  -e WS_PING_INTERVAL=25000 \
  -e SIMULATION_MIN_INTERVAL=3000 \
  -e SIMULATION_MAX_INTERVAL=10000 \
  -e TRUST_PROXY=true \
  muta-backend

echo ""
echo "3. Esperando a que el contenedor inicie..."
sleep 5

NEW_CONTAINER_ID=$(docker ps --format "{{.ID}}" --filter "name=muta-backend-fixed")
if [ -n "$NEW_CONTAINER_ID" ]; then
    echo "✅ Nuevo contenedor iniciado: $NEW_CONTAINER_ID"
    echo ""
    echo "4. Verificando logs del nuevo contenedor:"
    docker logs $NEW_CONTAINER_ID
    echo ""
    echo "5. Verificando que la aplicación responda:"
    sleep 2
    curl -f http://localhost:8080/health || echo "❌ Health check falló"
else
    echo "❌ No se pudo iniciar el nuevo contenedor"
fi

echo ""
echo "🎉 SOLUCIÓN APLICADA"
echo "==================="
echo "Para ver logs en tiempo real: docker logs -f $NEW_CONTAINER_ID"
echo "Para acceder al contenedor: docker exec -it $NEW_CONTAINER_ID sh"
echo ""
echo "Para una solución permanente, actualiza tu docker-compose.production.yml:"
echo "  - LOG_LEVEL=info (en lugar de warn)"
echo "  - LOG_FORMAT=simple (en lugar de json para mejor legibilidad)"
echo "  - ENABLE_STARTUP_LOGS=true (nueva variable)"