#!/usr/bin/env node

/**
 * Script generador de órdenes para el backend de Muta
 * Genera 1 orden cada 5 segundos utilizando el endpoint POST /api/orders
 */

const http = require('http');

// Configuración
const BACKEND_HOST = 'localhost';
const BACKEND_PORT = 3001;
const INTERVAL_MS = 5000; // 5 segundos

// Estados de orden disponibles con mayor probabilidad para 'en ruta'
const ORDER_STATUSES = [
  'pendiente',
  'en ruta', 
  'en ruta',
  'en proceso',
  'completada',
  'cancelada'
];

// Nombres de colectores de ejemplo
const COLLECTOR_NAMES = [
  'Juan Pérez',
  'María García',
  'Carlos López',
  'Ana Martínez',
  'Luis Rodríguez',
  'Carmen Fernández',
  'Miguel Santos',
  'Isabel Ruiz',
  'Francisco Morales',
  'Patricia Jiménez'
];

// Direcciones de ejemplo
const ADDRESSES = [
  'Calle Mayor 123, Madrid',
  'Avenida Libertad 456, Barcelona',
  'Plaza España 78, Valencia',
  'Calle Sol 234, Sevilla',
  'Paseo de Gracia 567, Barcelona',
  'Gran Vía 89, Madrid',
  'Calle Sierpes 345, Sevilla',
  'Rambla Catalunya 123, Barcelona',
  'Calle Alcalá 678, Madrid',
  'Avenida de la Constitución 90, Valencia',
  'Calle Triana 234, Las Palmas',
  'Plaza del Pilar 56, Zaragoza',
  'Calle Real 789, A Coruña',
  'Avenida del Puerto 123, Bilbao',
  'Calle Nueva 456, Pamplona'
];

/**
 * Genera un ID único para la orden
 */
function generateOrderId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `order-${timestamp}-${randomStr}`;
}

/**
 * Selecciona un elemento aleatorio de un array
 */
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Genera una orden aleatoria
 */
function generateRandomOrder() {
  return {
    address: randomChoice(ADDRESSES),
    status: randomChoice(ORDER_STATUSES),
    collectorName: randomChoice(COLLECTOR_NAMES)
  };
}

/**
 * Envía una orden al backend
 */
function sendOrder(order) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(order);
    
    const options = {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: '/api/orders',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'OrderGenerator/1.0.0'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (err) {
            resolve({ success: true, statusCode: res.statusCode });
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Verifica que el backend esté disponible
 */
function checkBackendHealth() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: '/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        reject(new Error(`Backend health check failed with status ${res.statusCode}`));
      }
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Backend health check timed out'));
    });

    req.end();
  });
}

/**
 * Formatea fecha y hora para el log
 */
function formatTimestamp() {
  return new Date().toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Función principal del generador
 */
async function startOrderGeneration() {
  console.log('🚀 Iniciando generador de órdenes para Muta');
  console.log(`📍 Backend: http://${BACKEND_HOST}:${BACKEND_PORT}`);
  console.log(`⏱️  Intervalo: ${INTERVAL_MS / 1000} segundos`);
  console.log('─'.repeat(60));

  // Verificar que el backend esté disponible
  try {
    await checkBackendHealth();
    console.log('✅ Backend disponible');
  } catch (error) {
    console.error('❌ Error conectando al backend:', error.message);
    console.error('💡 Asegúrate de que el backend esté ejecutándose en el puerto 3001');
    process.exit(1);
  }

  let orderCount = 0;
  let successCount = 0;
  let errorCount = 0;

  console.log('🔄 Comenzando generación de órdenes...\n');

  // Función para generar y enviar una orden
  const generateAndSendOrder = async () => {
    try {
      orderCount++;
      const order = generateRandomOrder();
      
      console.log(`[${formatTimestamp()}] 📦 Generando orden #${orderCount}:`);
      console.log(`   Cliente: ${order.collectorName}`);
      console.log(`   Dirección: ${order.address}`);
      console.log(`   Estado: ${order.status}`);
      
      const response = await sendOrder(order);
      successCount++;
      
      console.log(`   ✅ Orden creada exitosamente`);
      console.log(`   📊 Total: ${orderCount} | Exitosas: ${successCount} | Errores: ${errorCount}\n`);
      
    } catch (error) {
      errorCount++;
      console.log(`   ❌ Error creando orden: ${error.message}`);
      console.log(`   📊 Total: ${orderCount} | Exitosas: ${successCount} | Errores: ${errorCount}\n`);
    }
  };

  // Enviar primera orden inmediatamente
  await generateAndSendOrder();

  // Configurar intervalo para órdenes siguientes
  const interval = setInterval(generateAndSendOrder, INTERVAL_MS);

  // Manejar cierre graceful
  const gracefulShutdown = () => {
    console.log('\n🛑 Deteniendo generador de órdenes...');
    if (interval) {
      clearInterval(interval);
    }
    console.log('📊 Resumen final:');
    console.log(`   Total de órdenes generadas: ${orderCount}`);
    console.log(`   Órdenes exitosas: ${successCount}`);
    console.log(`   Errores: ${errorCount}`);
    console.log('👋 ¡Hasta luego!');
    setTimeout(() => process.exit(0), 100);
  };

  // Capturar señales de terminación
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}

// Verificar argumentos de línea de comandos
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Generador de Órdenes para Muta
=============================

Este script genera órdenes automáticamente cada 5 segundos para probar el backend.

Uso:
  node order-generator.js

Opciones:
  --help, -h     Muestra esta ayuda
  
Requisitos:
  - El backend debe estar ejecutándose en http://localhost:3001
  - El endpoint POST /api/orders debe estar disponible

Ejemplo de orden generada:
  {
    "address": "Calle Mayor 123, Madrid",
    "status": "pendiente",
    "collectorName": "Juan Pérez"
  }

Para detener el generador: Ctrl+C
`);
  process.exit(0);
}

// Iniciar la generación
startOrderGeneration().catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});