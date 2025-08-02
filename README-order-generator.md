# 🚀 Generador de Órdenes para Muta

Este script genera automáticamente **1 orden cada 5 segundos** utilizando el backend implementado en este monorepo.

## 📋 Características

- ✅ Genera órdenes realistas con datos aleatorios españoles
- ⏱️ Intervalo configurable (por defecto 5 segundos)
- 🔍 Verificación automática de salud del backend
- 📊 Estadísticas en tiempo real
- 🛑 Cierre graceful con Ctrl+C
- 🎯 Compatible con el endpoint `POST /api/orders`

## 🚀 Uso Rápido

### 1. Iniciar el backend
```bash
# En el directorio del monorepo
cd apps/backend
npm run dev
```

### 2. Ejecutar el generador (en otra terminal)
```bash
# En el directorio raíz del monorepo
node order-generator.js
```

### 3. Ver ayuda
```bash
node order-generator.js --help
```

## 📦 Ejemplo de Orden Generada

El script genera órdenes con esta estructura:

```json
{
  "id": "order-lz1x7a-8k3f9m",
  "address": "Calle Mayor 123, Madrid",
  "status": "pendiente",
  "collectorName": "Juan Pérez",
  "lastUpdated": "2024-01-01T12:00:00.000Z"
}
```

## 📊 Estados de Orden Disponibles

- `pendiente` - Orden recién creada
- `en ruta` - Recolector en camino
- `en proceso` - Recolección en progreso  
- `completada` - Orden finalizada exitosamente
- `cancelada` - Orden cancelada

## 👥 Datos de Ejemplo

### Nombres de Colectores
- Juan Pérez, María García, Carlos López, Ana Martínez
- Luis Rodríguez, Carmen Fernández, Miguel Santos
- Isabel Ruiz, Francisco Morales, Patricia Jiménez

### Direcciones Españolas
- Calle Mayor 123, Madrid
- Avenida Libertad 456, Barcelona
- Plaza España 78, Valencia
- Calle Sol 234, Sevilla
- Y muchas más...

## 🔧 Configuración

El script se conecta por defecto a:
- **Host**: `localhost`
- **Puerto**: `3001`
- **Endpoint**: `POST /api/orders`
- **Intervalo**: `5000ms` (5 segundos)

Para modificar estos valores, edita las constantes al inicio del archivo `order-generator.js`.

## 📈 Salida del Script

```
🚀 Iniciando generador de órdenes para Muta
📍 Backend: http://localhost:3001
⏱️  Intervalo: 5 segundos
────────────────────────────────────────────────────────────
✅ Backend disponible
🔄 Comenzando generación de órdenes...

[01/01/2024 12:00:00] 📦 Generando orden #1:
   ID: order-lz1x7a-8k3f9m
   Cliente: Juan Pérez
   Dirección: Calle Mayor 123, Madrid
   Estado: pendiente
   ✅ Orden creada exitosamente
   📊 Total: 1 | Exitosas: 1 | Errores: 0

[01/01/2024 12:00:05] 📦 Generando orden #2:
   ID: order-mz2y8b-9l4g0n
   Cliente: María García
   Dirección: Avenida Libertad 456, Barcelona
   Estado: en ruta
   ✅ Orden creada exitosamente
   📊 Total: 2 | Exitosas: 2 | Errores: 0
```

## ⚠️ Requisitos

1. **Node.js** instalado en el sistema
2. **Backend ejecutándose** en `http://localhost:3001`
3. **Endpoint** `/api/orders` disponible para POST

## 🛑 Detener el Generador

Presiona `Ctrl+C` para detener el generador de manera segura. Se mostrará un resumen final con las estadísticas.

## 🔍 Troubleshooting

### Error: Backend no disponible
```
❌ Error conectando al backend: connect ECONNREFUSED 127.0.0.1:3001
💡 Asegúrate de que el backend esté ejecutándose en el puerto 3001
```

**Solución**: Verifica que el backend esté ejecutándose con `npm run dev` en el directorio `apps/backend`.

### Error: Endpoint no encontrado
```
❌ Error creando orden: HTTP 404: Cannot POST /api/orders
```

**Solución**: Verifica que el backend tenga el endpoint `/api/orders` configurado correctamente.

### Error: Validación de datos
```
❌ Error creando orden: HTTP 400: Validation Error
```

**Solución**: El backend rechazó la orden por datos inválidos. Revisa la estructura de datos en el script.

## 🎯 Integración con WebSockets

Este generador envía órdenes al backend, que luego notifica a los clientes conectados via WebSockets. Puedes ver las órdenes aparecer en tiempo real en el frontend en `http://localhost:3000`.

## 📝 Notas Técnicas

- El script usa **HTTP nativo de Node.js** (sin dependencias externas)
- Genera **IDs únicos** basados en timestamp + string aleatorio
- Implementa **verificación de salud** del backend antes de iniciar
- Maneja **errores de red** y **timeouts** gracefully
- Compatible con el **sistema de validación** del backend (Joi schemas)