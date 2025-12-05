# Dashboard de KPIs para restaurante (KDS)

Single Page Application (SPA) construida con React (CDN) y Chart.js para monitorear KPIs de operación, servicio y rentabilidad en restaurantes con comanda electrónica (KDS). Incluye un backend ligero simulado con datos mock en `js/data.js`.

## Estructura
- `index.html`: monta la SPA y carga dependencias CDN.
- `css/style.css`: estilos responsivos con énfasis en visualización de datos.
- `js/data.js`: generador de datos de ejemplo (día y semana) y mock API en memoria.
- `js/app.js`: lógica de React para filtros, KPIs, gráficas y tabla de órdenes.
- `images/logo.png`: logotipo usado en el encabezado.

## Ejecución local
1. Abre el proyecto en `landingpage/`.
2. Inicia un servidor estático (recomendado para cargar módulos ES):
   ```bash
   cd landingpage
   python3 -m http.server 8000
   ```
3. Visita `http://localhost:8000` en tu navegador.

> Alternativa: abre `index.html` directamente en el navegador; algunos navegadores bloquean módulos ES desde `file://`, por eso se sugiere el servidor local.

## Funcionalidad clave
- Filtros por rango de fechas, turno, canal y estación.
- Tarjetas KPI con tiempos de preparación, KTT, SLA on-time, reprocesos, cancelaciones, desperdicio, costo de mano de obra, ticket promedio y rotación de mesas.
- Gráficas (Chart.js) para prep time por plato y canal, KTT por hora, productividad por estación, heatmap de horas pico, menú mix y distribución SLA.
- Tabla detallada de órdenes con tiempos de preparación, KTT, precisión y estado.

