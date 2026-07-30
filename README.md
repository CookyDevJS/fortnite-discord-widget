# fortnite-discord-widget

Bot personal de Discord que muestra tus stats de Fortnite (K/D, victorias, kills, partidas) como
"Widget v2" en tu perfil de Discord — la misma función experimental que usan Wuthering Waves,
Marvel Rivals o el bot de ejemplo [xivwidget](https://github.com/chloecinders/xivwidget).

> ⚠️ Esto usa endpoints **no oficiales / experimentales** de Discord, descubiertos por la
> comunidad de Discord Previews. Puede romperse, cambiar o desaparecer sin aviso, y técnicamente
> está fuera de lo documentado por Discord. Úsalo solo para tu cuenta personal, sin abusar.

## Qué necesitas antes de empezar

1. **Una aplicación de Discord** (gratis):
   - Ve a https://discord.com/developers/applications → "New Application".
   - Copia el **Application ID** (= `CLIENT_ID`).
   - En la pestaña **Bot** → "Reset Token" → copia el token (= `DISCORD_TOKEN`). Guárdalo, no se
     vuelve a mostrar.
   - En la pestaña **Installation**:
     - En "Installation Contexts" activa **User Install** (así puedes usar el bot en tu propio
       perfil/DMs sin meterlo en ningún servidor).
     - En "Default Install Settings" para User Install, añade el scope `applications.commands`.

2. **Una API key de fortnite-api.com** (gratis):
   - Entra en https://dash.fortnite-api.com/account e inicia sesión con tu cuenta de Discord.
   - Genera una API key (= `FORTNITE_API_KEY`).

3. **Node.js 18 o superior** instalado donde vayas a correr el bot (puede ser tu PC o un
   contenedor/VM en tu homelab de Proxmox, igual que el resto de tu stack).

## Instalación

```bash
npm install
cp .env.example .env
# Edita .env y rellena DISCORD_TOKEN, CLIENT_ID y FORTNITE_API_KEY
npm run deploy-commands   # registra el comando /widget (tarda hasta ~1h en propagarse globalmente)
npm start                 # arranca el bot
```

## Instalar el bot en tu cuenta (User Install)

Abre esta URL en el navegador (sustituye `TU_CLIENT_ID`):

```
https://discord.com/oauth2/authorize?client_id=TU_CLIENT_ID&integration_type=1&scope=applications.commands
```

Esto instala el bot en tu cuenta personal — podrás usar `/widget` desde tus propios DMs con la
app, sin necesidad de tener un servidor.

## Uso

1. `/widget setup epic_username:<TuNombreDeEpic>` — vincula tu cuenta y sincroniza las stats por
   primera vez. El bot te responderá con un código para pegar en la consola del navegador
   (Discord web) que añade el widget a tu perfil.
2. `/widget refresh` — vuelve a sincronizar tus stats cuando quieras (después de jugar, por
   ejemplo).

## Cómo funciona por dentro

- `src/fortnite.js` — pide tus stats de Battle Royale a fortnite-api.com.
- `src/discordWidget.js` — hace un `PATCH` autenticado con el **Bot Token** a
  `https://discord.com/api/v9/applications/{client_id}/users/{discord_id}/identities/0/profile`
  con los campos dinámicos (`type 1` = texto, `type 2` = número, `type 3` = imagen). Esto es lo
  que rellena el contenido del widget.
- El snippet de consola que te da `/widget setup` añade tu aplicación a la lista de widgets de tu
  perfil (`PUT /users/@me/widgets` vía la API interna del cliente web de Discord) — es un paso
  manual porque, de momento, no hay forma de hacerlo vía la API pública sin tocar el cliente.

## Limitaciones / cosas a tener en cuenta

- Solo funciona para **tu propia cuenta** (no es un servicio multiusuario tal cual está montado;
  cada quien tendría que correr su propia instancia con su propio bot).
- Requiere que tu nombre de Epic Games sea público en fortnite-api.com (debería serlo por
  defecto).
- Si Discord cambia el experimento `application-widget-v2-renderer`, el snippet del paso manual
  puede dejar de funcionar — revisa el hilo de Discord Previews si pasa.
