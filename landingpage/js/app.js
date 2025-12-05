import { mockApi } from './data.js';

const { useEffect, useMemo, useState, useRef } = React;

const formatMinutes = (value) => `${value.toFixed(1)} min`;
const formatPercent = (value) => `${(value * 100).toFixed(1)}%`;

function differenceInMinutes(a, b) {
  return (new Date(b) - new Date(a)) / 60000;
}

function groupBy(list, keyFn) {
  return list.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

function useChart(canvasRef, configBuilder, deps) {
  useEffect(() => {
    if (!canvasRef.current) return;
    const chart = new Chart(canvasRef.current, configBuilder());
    return () => chart.destroy();
  }, deps);
}

function Badge({ value }) {
  let cls = 'badge-green';
  if (value < 0.8) cls = 'badge-yellow';
  if (value < 0.6) cls = 'badge-red';
  return <span className={`table-badge ${cls}`}>{formatPercent(value)}</span>;
}

function KPICard({ label, value, helper, accent }) {
  return (
    <div className="kpi-card">
      <small>{label}</small>
      <div className="kpi-value" style={{ color: accent || '#e5e7eb' }}>
        {value}
      </div>
      {helper && <div className="kpi-trend">{helper}</div>}
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      {subtitle && <p style={{ marginTop: 0, color: '#7b8aa5' }}>{subtitle}</p>}
      {children}
    </div>
  );
}

function Table({ data }) {
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Plato</th>
            <th>Canal</th>
            <th>Estación</th>
            <th>Prep</th>
            <th>KTT</th>
            <th>Precisión</th>
            <th>Cancelado</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 18).map((row) => {
            const prep = differenceInMinutes(row.hora_inicio_cocina, row.hora_fin_cocina);
            const ktt = differenceInMinutes(row.hora_orden, row.hora_fin_cocina);
            const accuracy = row.reprocesos > 0 || row.cancelado ? 0.92 : 0.99;
            return (
              <tr key={`${row.id_ticket}-${row.plato}`}>
                <td>{row.id_ticket}</td>
                <td>{row.plato}</td>
                <td>{row.canal}</td>
                <td>{row.estacion}</td>
                <td>{prep.toFixed(1)} min</td>
                <td>{ktt.toFixed(1)} min</td>
                <td><Badge value={accuracy} /></td>
                <td>{row.cancelado ? 'Sí' : 'No'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ChartCanvas({ config }) {
  const ref = useRef(null);
  useChart(ref, config, [config]);
  return <canvas ref={ref}></canvas>;
}

function App() {
  const [state, setState] = useState({ day: [], week: [] });
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    shift: 'todos',
    channel: 'todos',
    station: 'todas',
  });

  useEffect(() => {
    mockApi.getData().then(setState);
  }, []);

  const dataset = useMemo(() => state.week, [state]);

  const filtered = useMemo(() => {
    return dataset.filter((item) => {
      const date = new Date(item.hora_orden);
      if (filters.from && date < new Date(filters.from)) return false;
      if (filters.to && date > new Date(filters.to)) return false;

      if (filters.channel !== 'todos' && item.canal !== filters.channel) return false;
      if (filters.station !== 'todas' && item.estacion !== filters.station) return false;

      if (filters.shift !== 'todos') {
        const hour = date.getHours();
        const shift =
          hour < 12 ? 'mañana' : hour < 18 ? 'tarde' : 'noche';
        if (shift !== filters.shift) return false;
      }
      return true;
    });
  }, [dataset, filters]);

  const kpis = useMemo(() => {
    if (!filtered.length) return {};

    const prepTimes = filtered.map((o) => differenceInMinutes(o.hora_inicio_cocina, o.hora_fin_cocina));
    const avgPrep = prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length;

    const ktt = filtered.map((o) => differenceInMinutes(o.hora_orden, o.hora_fin_cocina));
    const avgKtt = ktt.reduce((a, b) => a + b, 0) / ktt.length;

    const repro = filtered.filter((o) => o.reprocesos > 0).length / filtered.length;
    const onTime = filtered.filter((o) => differenceInMinutes(o.hora_inicio_cocina, o.hora_fin_cocina) <= 14).length / filtered.length;
    const waste = filtered.reduce((a, b) => a + b.desperdicio_estimado, 0) /
      filtered.reduce((a, b) => a + b.valor_total, 0);
    const labor = filtered.reduce((a, b) => a + b.costo_mano_obra, 0) /
      filtered.reduce((a, b) => a + b.valor_total, 0);
    const avgTicket = filtered.reduce((a, b) => a + b.valor_total, 0) /
      filtered.reduce((a, b) => a + b.comensales, 0);

    const cancelRate = filtered.filter((o) => o.cancelado).length / filtered.length;
    const accuracy = 1 - repro - cancelRate * 0.5;

    const avgActivation = filtered.reduce((acc, o) => acc + differenceInMinutes(o.hora_orden, o.hora_inicio_cocina), 0) / filtered.length;
    const avgWaitFirst = filtered.reduce((acc, o) => acc + differenceInMinutes(o.hora_sentado, o.hora_inicio_cocina), 0) / filtered.length;

    const turnover = Object.values(groupBy(filtered, (o) => o.id_mesa)).map((orders) => orders.length / 7);
    const turnoverAvg = turnover.reduce((a, b) => a + b, 0) / turnover.length;

    const guests = filtered.reduce((a, b) => a + b.comensales, 0);
    const revenue = filtered.reduce((a, b) => a + b.valor_total, 0);
    const laborVsSales = labor;

    return {
      avgPrep,
      avgKtt,
      repro,
      onTime,
      waste,
      labor: laborVsSales,
      avgTicket,
      cancelRate,
      accuracy,
      avgActivation,
      avgWaitFirst,
      turnover: turnoverAvg,
      revenue,
      guests,
    };
  }, [filtered]);

  const prepByDish = useMemo(() => {
    const groups = groupBy(filtered, (o) => o.plato);
    return Object.entries(groups)
      .map(([plato, items]) => ({
        plato,
        prep: items.reduce((a, b) => a + differenceInMinutes(b.hora_inicio_cocina, b.hora_fin_cocina), 0) / items.length,
        count: items.length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filtered]);

  const prepByChannel = useMemo(() => {
    const groups = groupBy(filtered, (o) => o.canal);
    return Object.entries(groups).map(([canal, items]) => ({
      canal,
      prep: items.reduce((a, b) => a + differenceInMinutes(b.hora_inicio_cocina, b.hora_fin_cocina), 0) / items.length,
    }));
  }, [filtered]);

  const kttByHour = useMemo(() => {
    const groups = groupBy(filtered, (o) => new Date(o.hora_orden).getHours());
    return Array.from({ length: 24 }).map((_, hour) => {
      const items = groups[hour] || [];
      if (!items.length) return { hour, value: 0 };
      const avg = items.reduce((a, b) => a + differenceInMinutes(b.hora_orden, b.hora_fin_cocina), 0) / items.length;
      return { hour, value: avg };
    });
  }, [filtered]);

  const stationProductivity = useMemo(() => {
    const groups = groupBy(filtered, (o) => o.estacion);
    return Object.entries(groups).map(([estacion, items]) => ({
      estacion,
      count: items.length,
      prep: items.reduce((a, b) => a + differenceInMinutes(b.hora_inicio_cocina, b.hora_fin_cocina), 0) / items.length,
    }));
  }, [filtered]);

  const heatmap = useMemo(() => {
    const groups = groupBy(filtered, (o) => new Date(o.hora_orden).getHours());
    return Object.keys(groups)
      .map((h) => ({ hour: h, count: groups[h].length }))
      .sort((a, b) => Number(a.hour) - Number(b.hour));
  }, [filtered]);

  const menuMix = useMemo(() => {
    const groups = groupBy(filtered, (o) => o.plato);
    const items = Object.entries(groups).map(([plato, orders]) => {
      const prep = orders.reduce((a, b) => a + differenceInMinutes(b.hora_inicio_cocina, b.hora_fin_cocina), 0) / orders.length;
      return { plato, count: orders.length, prep };
    });
    const top = [...items].sort((a, b) => b.count - a.count).slice(0, 3);
    const slow = [...items].sort((a, b) => b.prep - a.prep).slice(0, 3);
    return { top, slow };
  }, [filtered]);

  const bottlenecks = useMemo(() => {
    return stationProductivity.sort((a, b) => b.prep - a.prep).slice(0, 2);
  }, [stationProductivity]);

  const filtersUI = (
    <div className="filters">
      <div>
        <label>Desde</label>
        <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
      </div>
      <div>
        <label>Hasta</label>
        <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
      </div>
      <div>
        <label>Turno</label>
        <select value={filters.shift} onChange={(e) => setFilters({ ...filters, shift: e.target.value })}>
          <option value="todos">Todos</option>
          <option value="mañana">Mañana</option>
          <option value="tarde">Tarde</option>
          <option value="noche">Noche</option>
        </select>
      </div>
      <div>
        <label>Canal</label>
        <select value={filters.channel} onChange={(e) => setFilters({ ...filters, channel: e.target.value })}>
          <option value="todos">Todos</option>
          <option value="mesa">Mesa</option>
          <option value="domicilio">Domicilio</option>
          <option value="llevar">Para llevar</option>
        </select>
      </div>
      <div>
        <label>Estación</label>
        <select value={filters.station} onChange={(e) => setFilters({ ...filters, station: e.target.value })}>
          <option value="todas">Todas</option>
          <option value="plancha">Plancha</option>
          <option value="horno">Horno</option>
          <option value="fritos">Fritos</option>
          <option value="frío">Frío</option>
        </select>
      </div>
      <div>
        <label>Datos</label>
        <button onClick={() => mockApi.getData().then(setState)}>Refrescar mock</button>
      </div>
    </div>
  );

  if (!filtered.length) {
    return (
      <main style={{ padding: '32px', color: '#e5e7eb' }}>
        <h1>Cargando tablero...</h1>
      </main>
    );
  }

  return (
    <div>
      <header>
        <div className="brand">
          <img src="images/logo.png" alt="logo" />
          <div>
            <h1>Commodo KDS Insight</h1>
            <p>Control total de cocina en vivo</p>
          </div>
        </div>
        <div className="top-actions">
          <span className="badge">Hoy: {new Date().toLocaleDateString('es-ES')}</span>
          <span className="badge" style={{ background: 'rgba(96,165,250,0.16)', color: '#dbeafe' }}>
            Órdenes analizadas: {filtered.length}
          </span>
        </div>
      </header>

      <main>
        {filtersUI}

        <section className="section">
          <h2>KPIs críticos</h2>
          <div className="kpi-grid">
            <KPICard label="Tiempo promedio de preparación" value={formatMinutes(kpis.avgPrep)} helper="Objetivo: ≤ 14 min" accent="#6ee7b7" />
            <KPICard label="Kitchen Ticket Time (KTT)" value={formatMinutes(kpis.avgKtt)} helper="Incluye todo el ticket" accent="#93c5fd" />
            <KPICard label="Reprocesos" value={formatPercent(kpis.repro)} helper="% de tickets con corrección" accent="#fbbf24" />
            <KPICard label="SLA On-Time Rate" value={formatPercent(kpis.onTime)} helper="Platos ≤ 14 min" accent="#6ee7b7" />
            <KPICard label="Food Waste Rate" value={formatPercent(kpis.waste)} helper="Costo desperdicio / ventas" accent="#f87171" />
            <KPICard label="Labor Cost %" value={formatPercent(kpis.labor)} helper="Mano de obra vs ventas" accent="#c084fc" />
            <KPICard label="Ticket promedio por comensal" value={`$${kpis.avgTicket.toFixed(2)}`} helper="Check per guest" accent="#f9a8d4" />
            <KPICard label="Órdenes canceladas" value={formatPercent(kpis.cancelRate)} helper="Cancel vs totales" accent="#fca5a5" />
            <KPICard label="Precisión de comanda" value={formatPercent(kpis.accuracy)} helper="Entregas sin error" accent="#a5f3fc" />
            <KPICard label="Kitchen Activation Time" value={formatMinutes(kpis.avgActivation)} helper="Orden a inicio cocina" accent="#67e8f9" />
            <KPICard label="Espera al primer plato" value={formatMinutes(kpis.avgWaitFirst)} helper="Sentar a aceptación" accent="#fcd34d" />
            <KPICard label="Rotación de mesas" value={`${kpis.turnover.toFixed(2)} x turno`} helper="Promedio semanal" accent="#c7d2fe" />
          </div>
        </section>

        <section className="section">
          <h2>Rendimiento y tiempos</h2>
          <div className="card-row">
            <ChartCard title="Prep Time por plato" subtitle="Promedio en minutos y volumen de órdenes">
              <div className="chart-container">
                <ChartCanvas
                  config={() => ({
                    type: 'bar',
                    data: {
                      labels: prepByDish.map((d) => d.plato),
                      datasets: [
                        {
                          label: 'Tiempo prep (min)',
                          data: prepByDish.map((d) => d.prep.toFixed(1)),
                          backgroundColor: '#60a5fa',
                        },
                        {
                          label: 'Órdenes',
                          data: prepByDish.map((d) => d.count),
                          backgroundColor: '#6ee7b7',
                        },
                      ],
                    },
                    options: {
                      responsive: true,
                      scales: { y: { beginAtZero: true } },
                      plugins: { legend: { labels: { color: '#e5e7eb' } } },
                    },
                  })}
                />
              </div>
            </ChartCard>

            <ChartCard title="Prep Time por canal" subtitle="Comparación de consumo en mesa, domicilio y para llevar">
              <div className="chart-container">
                <ChartCanvas
                  config={() => ({
                    type: 'bar',
                    data: {
                      labels: prepByChannel.map((d) => d.canal),
                      datasets: [
                        {
                          label: 'Promedio prep (min)',
                          data: prepByChannel.map((d) => d.prep.toFixed(1)),
                          backgroundColor: ['#38bdf8', '#a855f7', '#fbbf24'],
                        },
                      ],
                    },
                    options: {
                      indexAxis: 'y',
                      scales: { x: { beginAtZero: true } },
                      plugins: { legend: { labels: { color: '#e5e7eb' } } },
                    },
                  })}
                />
              </div>
            </ChartCard>

            <ChartCard title="Kitchen Ticket Time por hora" subtitle="Promedio del ticket completo por franja horaria">
              <div className="chart-container">
                <ChartCanvas
                  config={() => ({
                    type: 'line',
                    data: {
                      labels: kttByHour.map((d) => `${d.hour}h`),
                      datasets: [
                        {
                          label: 'KTT (min)',
                          data: kttByHour.map((d) => d.value.toFixed(1)),
                          borderColor: '#6ee7b7',
                          backgroundColor: 'rgba(110, 231, 183, 0.2)',
                        },
                      ],
                    },
                    options: {
                      scales: { y: { beginAtZero: true } },
                      plugins: { legend: { labels: { color: '#e5e7eb' } } },
                    },
                  })}
                />
              </div>
            </ChartCard>
          </div>
        </section>

        <section className="section">
          <h2>Operación en cocina</h2>
          <div className="grid-two">
            <ChartCard title="Productividad por estación" subtitle="Platos preparados y velocidad">
              <div className="chart-container">
                <ChartCanvas
                  config={() => ({
                    type: 'bar',
                    data: {
                      labels: stationProductivity.map((d) => d.estacion),
                      datasets: [
                        {
                          label: 'Platos',
                          data: stationProductivity.map((d) => d.count),
                          backgroundColor: '#60a5fa',
                        },
                        {
                          label: 'Prep prom. (min)',
                          data: stationProductivity.map((d) => d.prep.toFixed(1)),
                          backgroundColor: '#f472b6',
                        },
                      ],
                    },
                    options: {
                      responsive: true,
                      scales: { y: { beginAtZero: true } },
                      plugins: { legend: { labels: { color: '#e5e7eb' } } },
                    },
                  })}
                />
              </div>
              <div className="legend" style={{ marginTop: 8 }}>
                {bottlenecks.map((b) => (
                  <span key={b.estacion}><span className="dot" style={{ background: '#fbbf24' }}></span>Cuello de botella: {b.estacion} ({b.prep.toFixed(1)} min)</span>
                ))}
              </div>
            </ChartCard>

            <ChartCard title="Heatmap de horas pico" subtitle="Volumen de órdenes por hora">
              <div className="chart-container">
                <ChartCanvas
                  config={() => ({
                    type: 'bar',
                    data: {
                      labels: heatmap.map((d) => `${d.hour}:00`),
                      datasets: [
                        {
                          label: 'Órdenes',
                          data: heatmap.map((d) => d.count),
                          backgroundColor: '#a5b4fc',
                        },
                      ],
                    },
                    options: {
                      scales: { y: { beginAtZero: true } },
                      plugins: { legend: { labels: { color: '#e5e7eb' } } },
                    },
                  })}
                />
              </div>
            </ChartCard>
          </div>
        </section>

        <section className="section">
          <h2>Negocio y rentabilidad</h2>
          <div className="card-row">
            <ChartCard title="Menu Mix" subtitle="Más vendidos vs más demorados">
              <div className="legend">
                <span><span className="dot" style={{ background: '#6ee7b7' }}></span>Top ventas</span>
                <span><span className="dot" style={{ background: '#f87171' }}></span>Más lentos</span>
              </div>
              <ul style={{ listStyle: 'none', paddingLeft: 0, marginTop: 10, color: '#e5e7eb' }}>
                {menuMix.top.map((item) => (
                  <li key={item.plato}>✅ {item.plato} — {item.count} órdenes</li>
                ))}
                {menuMix.slow.map((item) => (
                  <li key={`${item.plato}-slow`}>⏱️ {item.plato} — {item.prep.toFixed(1)} min</li>
                ))}
              </ul>
            </ChartCard>

            <ChartCard title="Distribución SLA y cancelaciones" subtitle="On-time vs cancelaciones">
              <div className="chart-container">
                <ChartCanvas
                  config={() => ({
                    type: 'doughnut',
                    data: {
                      labels: ['On-Time', 'Fuera de SLA', 'Canceladas'],
                      datasets: [
                        {
                          data: [kpis.onTime, 1 - kpis.onTime - kpis.cancelRate, kpis.cancelRate],
                          backgroundColor: ['#34d399', '#fbbf24', '#f87171'],
                        },
                      ],
                    },
                    options: {
                      plugins: { legend: { labels: { color: '#e5e7eb' } } },
                    },
                  })}
                />
              </div>
            </ChartCard>

            <ChartCard title="Labor vs Ventas" subtitle="Costo de mano de obra sobre ventas">
              <div className="chart-container">
                <ChartCanvas
                  config={() => ({
                    type: 'bar',
                    data: {
                      labels: ['Labor %', 'Waste %', 'Precisión'],
                      datasets: [
                        {
                          label: 'Proporción',
                          data: [kpis.labor, kpis.waste, kpis.accuracy],
                          backgroundColor: ['#f472b6', '#f87171', '#60a5fa'],
                        },
                      ],
                    },
                    options: {
                      indexAxis: 'y',
                      plugins: { legend: { labels: { color: '#e5e7eb' } } },
                      scales: { x: { max: 1 } },
                    },
                  })}
                />
              </div>
            </ChartCard>
          </div>
        </section>

        <section className="section">
          <h2>Órdenes y tiempos detalle</h2>
          <Table data={filtered} />
        </section>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
