// Mock data generator for the restaurant dashboard
// Provides a small in-memory "API" that can be queried from the React app.

const channels = ["mesa", "domicilio", "llevar"];
const stations = ["plancha", "horno", "fritos", "frío"];
const dishes = [
  { nombre: "Burger Nova", categoria: "principal", estacion: "plancha", prep: 12 },
  { nombre: "Tacos de Pulpo", categoria: "principal", estacion: "plancha", prep: 14 },
  { nombre: "Lasagna al Horno", categoria: "pastas", estacion: "horno", prep: 22 },
  { nombre: "Bao de Cerdo", categoria: "street", estacion: "fritos", prep: 10 },
  { nombre: "Ensalada Thai", categoria: "ensaladas", estacion: "frío", prep: 8 },
  { nombre: "Ceviche Cítrico", categoria: "entradas", estacion: "frío", prep: 9 },
  { nombre: "Costillas BBQ", categoria: "principal", estacion: "horno", prep: 26 },
  { nombre: "Fish & Chips", categoria: "principal", estacion: "fritos", prep: 16 },
];

const baseDate = new Date();

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function formatISO(date) {
  return date.toISOString();
}

function generateTicket(baseDay, index) {
  const hour = randomBetween(9, 22);
  const minute = randomBetween(0, 59);
  const seatedAt = new Date(baseDay);
  seatedAt.setHours(hour, minute, 0, 0);

  const orderAt = addMinutes(seatedAt, randomBetween(2, 12));
  const acceptedAt = addMinutes(orderAt, randomBetween(1, 5));

  const dish = dishes[randomBetween(0, dishes.length - 1)];
  const prepDuration = randomBetween(dish.prep - 3, dish.prep + 4);
  const finishAt = addMinutes(acceptedAt, prepDuration);

  const reprocesos = Math.random() < 0.08 ? randomBetween(1, 2) : 0;
  const cancelado = Math.random() < 0.04;
  const valorTotal = randomBetween(18, 45);
  const comensales = randomBetween(1, 4);
  const desperdicio = valorTotal * (Math.random() < 0.15 ? randomBetween(1, 6) / 100 : randomBetween(0, 2) / 100);
  const manoObra = valorTotal * randomBetween(18, 32) / 100;

  return {
    id_ticket: `TK-${baseDay.getDate()}-${index}`,
    id_mesa: randomBetween(1, 18),
    canal: channels[randomBetween(0, channels.length - 1)],
    hora_sentado: formatISO(seatedAt),
    hora_orden: formatISO(orderAt),
    hora_inicio_cocina: formatISO(acceptedAt),
    hora_fin_cocina: formatISO(finishAt),
    plato: dish.nombre,
    categoria: dish.categoria,
    estacion: dish.estacion,
    reprocesos,
    cancelado,
    valor_total: valorTotal,
    comensales,
    desperdicio_estimado: Number(desperdicio.toFixed(2)),
    costo_mano_obra: Number(manoObra.toFixed(2)),
  };
}

function generateDay(date) {
  const base = new Date(date);
  const count = 60;
  return Array.from({ length: count }).map((_, idx) => generateTicket(base, idx + 1));
}

function generateWeek() {
  const today = new Date(baseDate);
  const data = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    data.push(...generateDay(day));
  }
  return data;
}

export const mockApi = {
  getData() {
    return Promise.resolve({
      day: generateDay(baseDate),
      week: generateWeek(),
    });
  },
};
