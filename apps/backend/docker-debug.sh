#!/bin/bash

# Script de diagnóstico para debugging de contenedor Docker
# Uso: ./docker-debug.sh [container_id]

set -e

CONTAINER_ID=${1:-d8ba8ead47da}

echo "🔍 DIAGNÓSTICO DE CONTENEDOR DOCKER"
echo "=================================="
echo ""

echo "1. Estado del contenedor:"
docker ps -a --filter id=$CONTAINER_ID --format "table {{.ID}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}\t{{.Names}}"
echo ""

echo "2. Inspección del contenedor:"
docker inspect $CONTAINER_ID --format='
Estado: {{.State.Status}}
Salida exitosa: {{.State.ExitCode}}
Error: {{.State.Error}}
Reinicio: {{.RestartCount}}
Última vez iniciado: {{.State.StartedAt}}
Última vez terminado: {{.State.FinishedAt}}
'
echo ""

echo "3. Verificar logs de Docker (últimas 50 líneas):"
docker logs --tail 50 $CONTAINER_ID 2>&1 || echo "❌ No se pudieron obtener logs"
echo ""

echo "4. Verificar logs del sistema Docker:"
docker inspect $CONTAINER_ID --format='{{.LogPath}}'
LOG_PATH=$(docker inspect $CONTAINER_ID --format='{{.LogPath}}')
if [ -f "$LOG_PATH" ]; then
    echo "Archivo de log existe: $LOG_PATH"
    sudo tail -20 "$LOG_PATH" 2>/dev/null || echo "❌ No se puede leer archivo de log"
else
    echo "❌ Archivo de log no encontrado"
fi
echo ""

echo "5. Verificar configuración de logging:"
docker inspect $CONTAINER_ID --format='
Driver de logging: {{.HostConfig.LogConfig.Type}}
Opciones de logging: {{.HostConfig.LogConfig.Config}}
'
echo ""

echo "6. Verificar recursos y límites:"
docker inspect $CONTAINER_ID --format='
Memoria límite: {{.HostConfig.Memory}}
CPU límite: {{.HostConfig.CpuQuota}}
'
echo ""

echo "7. Verificar variables de entorno:"
docker inspect $CONTAINER_ID --format='{{range .Config.Env}}{{println .}}{{end}}' | grep -E "(NODE_ENV|PORT|LOG_|WS_API_KEY)" || echo "❌ Variables de entorno no encontradas"
echo ""

echo "8. Verificar procesos dentro del contenedor:"
docker exec $CONTAINER_ID ps aux 2>/dev/null || echo "❌ No se puede acceder al contenedor o no hay procesos"
echo ""

echo "9. Verificar conectividad de red:"
docker exec $CONTAINER_ID netstat -tlnp 2>/dev/null || echo "❌ No se puede verificar puertos"
echo ""

echo "10. Intentar obtener logs de aplicación directamente:"
docker exec $CONTAINER_ID ls -la /app/logs/ 2>/dev/null || echo "❌ Directorio de logs no accesible"
docker exec $CONTAINER_ID cat /app/logs/combined.log 2>/dev/null | tail -20 || echo "❌ Archivo de logs no accesible"
echo ""

echo "11. Verificar salud del contenedor:"
docker exec $CONTAINER_ID curl -f http://localhost:8080/health 2>/dev/null || echo "❌ Health check falló"
echo ""

echo "🔧 COMANDOS ÚTILES PARA DEBUGGING:"
echo "================================"
echo "Ver logs en tiempo real: docker logs -f $CONTAINER_ID"
echo "Acceder al contenedor: docker exec -it $CONTAINER_ID sh"
echo "Reiniciar contenedor: docker restart $CONTAINER_ID"
echo "Ver eventos de Docker: docker events --filter container=$CONTAINER_ID"
echo ""