# Sistema de Gestión de Órdenes - Monorepo

Un sistema completo de gestión de órdenes con backend Node.js y frontend Next.js, implementado como monorepo con Turborepo.

## 🚀 Características

### Backend (Node.js + Express + Socket.io)
- ✅ API REST para consultas y filtrado de órdenes
- ✅ WebSocket para actualizaciones en tiempo real
- ✅ Simulación automática de datos de órdenes
- ✅ 5 estados de órdenes: pendiente, en ruta, en proceso, completada, cancelada
- ✅ Filtrado por estado y búsqueda por dirección/recolector
- ✅ Pruebas unitarias con Jest
- ✅ Configuración para deployment en DigitalOcean

### Frontend (Next.js + TypeScript + Tailwind)
- ✅ Tabla de órdenes actualizada en tiempo real
- ✅ Filtros interactivos y búsqueda
- ✅ Gráficos de barras y circulares (Chart.js)
- ✅ Sistema de diseño con componentes reutilizables
- ✅ Internacionalización (i18n) - Español/Inglés
- ✅ Pruebas unitarias con Jest + React Testing Library
- ✅ Configuración para deployment en Vercel

### Monorepo
- ✅ Turborepo para builds optimizados
- ✅ pnpm workspaces
- ✅ Código TypeScript compartido
- ✅ ESLint + Prettier configurado
- ✅ CI/CD con GitHub Actions
- ✅ Desarrollo independiente con dependencias compartidas

## 📁 Estructura del Proyecto

```
muta-technical-test/
├── apps/
│   ├── backend/          # API Node.js
│   └── frontend/         # App Next.js
├── packages/
│   ├── shared/           # Tipos y utilidades compartidas
│   ├── ui/               # Componentes UI reutilizables
│   └── tsconfig/         # Configuraciones TypeScript
├── docs/                 # Documentación
└── .github/workflows/    # CI/CD
```

## 🛠️ Configuración de Desarrollo

### Prerrequisitos
- Node.js 18+
- pnpm 8+

### Instalación
```bash
# Clonar repositorio
git clone <repository-url>
cd muta-technical-test

# Instalar dependencias
pnpm install

# Copiar archivos de entorno
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
```

### Desarrollo
```bash
# Ejecutar todo el proyecto en modo desarrollo
pnpm dev

# Solo backend (puerto 3001)
pnpm --filter @muta/backend dev

# Solo frontend (puerto 3000)
pnpm --filter @muta/frontend dev
```

### Tests
```bash
# Ejecutar todos los tests
pnpm test

# Tests con cobertura
pnpm test -- --coverage

# Tests en modo watch
pnpm --filter @muta/frontend test:watch
```

### Linting y Formateo
```bash
# Lint
pnpm lint

# Formatear código
pnpm format
```

## 🚀 Deployment

### Backend - DigitalOcean App Platform
1. Conectar repositorio GitHub
2. Usar `apps/backend/app.yaml` como spec
3. Configurar variables de entorno
4. Deploy automático en push a main

### Frontend - Vercel
1. Conectar repositorio a Vercel
2. Configurar root directory: `apps/frontend`
3. Configurar variables de entorno:
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_WS_URL`
4. Deploy automático en push a main

Ver documentación detallada en [docs/DEPLOYMENT.md](/Users/jorgeweb/Dev/muta-technical-test/docs/DEPLOYMENT.md)

## 📊 Arquitectura

El sistema utiliza una arquitectura basada en eventos con comunicación en tiempo real:

- **Backend**: Simula órdenes y emite eventos vía WebSocket
- **Frontend**: Recibe actualizaciones en tiempo real y las muestra en la UI
- **Monorepo**: Permite desarrollo independiente con código compartido

Ver diagrama completo en [docs/ARCHITECTURE.md](/Users/jorgeweb/Dev/muta-technical-test/docs/ARCHITECTURE.md)

## 🧪 Testing

### Cobertura de Tests
- **Backend**: Servicios y rutas
- **Frontend**: Componentes React y hooks
- **UI Package**: Componentes del sistema de diseño

### Ejecutar Tests
```bash
# Todos los tests
pnpm test

# Solo backend
pnpm --filter @muta/backend test

# Solo frontend
pnpm --filter @muta/frontend test

# UI components
pnpm --filter @muta/ui test
```

## 🌐 Características de Internacionalización

- Soporte para Español (por defecto) e Inglés
- Configuración con `next-i18next`
- Traducciones en `apps/frontend/public/locales/`

## 📝 Scripts Disponibles

```bash
pnpm dev          # Desarrollo todos los proyectos
pnpm build        # Build de producción
pnpm test         # Ejecutar tests
pnpm lint         # Linting
pnpm format       # Formatear código
pnpm clean        # Limpiar archivos de build
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crear branch de feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit cambios (`git commit -m 'Agregar nueva característica'`)
4. Push al branch (`git push origin feature/nueva-caracteristica`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver [LICENSE](LICENSE) para detalles.

## 📞 Soporte

Para preguntas o soporte, abrir un issue en GitHub o contactar al equipo de desarrollo.