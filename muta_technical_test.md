Objetivo: Crear un panel web funcional con una tabla en tiempo real que liste las órdenes activas.
Requisitos funcionales mínimos:
Mostrar una tabla con estas columnas: ID de orden, dirección, estado, nombre del recolector, hora de última actualización.
Mostrar al menos 5 estados posibles: "pendiente", "en ruta", "en proceso", "completada", "cancelada".
Los datos deben simularse con WebSockets o polling (puede usar un mock de backend que emita eventos).
Debe haber al menos un filtro (por estado) y un buscador (por dirección o recolector).
Mostrar alguna visualización resumida (gráfico de barras, donut, etc.) con la cantidad de órdenes por estado.


Requisitos técnicos:
Usar un framework moderno (React/Vue/etc.).
Debe estar deployado (Vercel, Netlify o similar).
Código bien estructurado, con enfoque en reutilización, legibilidad y separación de responsabilidades.


Bonus:
Uso de TypeScript.
Pruebas unitarias (al menos para una parte).
Algún sistema de diseño o componentes reutilizables.
Algún mecanismo para internacionalización (i18n).
Explicación o diagrama de arquitectura.
