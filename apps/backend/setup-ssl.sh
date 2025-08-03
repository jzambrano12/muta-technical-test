#!/bin/bash

# Script para configurar SSL en el servidor backend
# Ejecutar como root: sudo bash setup-ssl.sh

echo "🔧 Configurando SSL para el backend..."

# Actualizar paquetes
apt update && apt upgrade -y

# Instalar Nginx y OpenSSL
apt install -y nginx openssl

# Crear directorio para certificados
mkdir -p /etc/ssl/private /etc/ssl/certs

# Generar certificado self-signed (para testing)
# NOTA: Para producción, usar Let's Encrypt o certificado comercial
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/server.key \
    -out /etc/ssl/certs/server.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/OU=OrgUnit/CN=164.92.105.40"

# Configurar permisos
chmod 600 /etc/ssl/private/server.key
chmod 644 /etc/ssl/certs/server.crt

# Copiar configuración de Nginx
cp nginx-ssl.conf /etc/nginx/sites-available/backend-ssl
ln -sf /etc/nginx/sites-available/backend-ssl /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Verificar configuración
nginx -t

# Reiniciar servicios
systemctl restart nginx
systemctl enable nginx

# Configurar firewall
ufw allow 'Nginx Full'
ufw allow 22
ufw --force enable

echo "✅ SSL configurado exitosamente!"
echo "🌐 Tu backend ahora está disponible en: https://164.92.105.40"
echo ""
echo "📝 Próximos pasos:"
echo "1. Actualizar variables de entorno del frontend:"
echo "   NEXT_PUBLIC_API_URL=https://164.92.105.40"
echo "   NEXT_PUBLIC_WS_URL=https://164.92.105.40"
echo "2. Redesplegar el frontend en Vercel"
echo ""
echo "⚠️  NOTA: Este certificado es self-signed. Para producción,"
echo "   considera usar Let's Encrypt con certbot."