// Integración con la API (no documentada oficialmente) de "Application Widgets v2" de Discord.
// El bot escribe los datos dinámicos del widget vía PATCH, autenticado con su propio Bot Token.
// Esto solo funciona para usuarios que hayan autorizado la app con el scope "sdk.social_layer".

function profileUrl(discordId) {
  return `https://discord.com/api/v9/applications/${process.env.CLIENT_ID}/users/${discordId}/identities/0/profile`;
}

/**
 * dynamicFields: array de objetos { type, name, value }
 *   type 1 -> texto
 *   type 2 -> número
 *   type 3 -> imagen ({ value: { url } })
 */
async function pushWidget(discordId, { username, dynamicFields }) {
  const payload = {
    username,
    data: { dynamic: dynamicFields }
  };

  const res = await fetch(profileUrl(discordId), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Discord API (widget) devolvió ${res.status}: ${body}`);
  }
}

/**
 * Snippet para pegar en la consola de devtools del cliente de Discord (web/desktop),
 * que añade tu aplicación a la lista de widgets de tu propio perfil.
 * Es el mismo mecanismo que usa xivwidget, solo cambia el application_id.
 */
function buildBrowserSnippet(clientId, { position = "start" } = {}) {
  return `(async ()=>{let _mods=webpackChunkdiscord_app.push([[Symbol()],{},e=>e.c]);webpackChunkdiscord_app.pop(); let findByProps=(...e)=>{for(let t of Object.values(_mods))try{if(!t.exports||t.exports===window)continue;if(e.every(e=>t.exports?.[e]))return t.exports;for(let r in t.exports)if(e.every(e=>t.exports?.[r]?.[e])&&"IntlMessagesProxy"!==t.exports[r][Symbol.toStringTag])return t.exports[r]}catch{}}; let api = Object.values(_mods).find(x => x?.exports?.Bo?.get).exports.Bo; let id = findByProps("getCurrentUser").getCurrentUser().id; let current_widgets = (await api.get("/users/" + id + "/profile")).body.widgets; if (current_widgets.map(x=>x.data?.application_id).includes("${clientId}")) {return console.log("Ya está en tus widgets — quítalo desde el cliente para volver a añadirlo");} let entry = {"data":{"type":"application","application_id":"${clientId}"}}; ${position === "end" ? "current_widgets.push(entry);" : "current_widgets.unshift(entry);"} await api.put({url:"/users/@me/widgets",body:{widgets:current_widgets}});})()`;
}

module.exports = { pushWidget, buildBrowserSnippet };
