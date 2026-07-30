// Wrapper mínimo sobre fortnite-api.com (no oficial, no afiliada a Epic Games).
// Doc: https://fortnite-api.readthedocs.io/  |  Dashboard/API key: https://dash.fortnite-api.com/account

const STATS_URL = "https://fortnite-api.com/v2/stats/br/v2";

/**
 * Devuelve las stats de Battle Royale de un jugador por su nombre de Epic.
 * Lanza un error si la API responde con un código distinto de 2xx
 * (nombre no encontrado, clave inválida, perfil privado, etc).
 */
async function getBRStats(epicUsername) {
  const url = `${STATS_URL}?name=${encodeURIComponent(epicUsername)}`;

  const res = await fetch(url, {
    headers: { Authorization: process.env.FORTNITE_API_KEY }
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`fortnite-api.com devolvió ${res.status}: ${body}`);
  }

  const json = await res.json();
  return json.data;
}

module.exports = { getBRStats };
