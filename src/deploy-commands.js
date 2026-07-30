require("dotenv").config();

// integration_types: 1 = User Install (se puede usar sin anadir el bot a ningun server)
// contexts: 0 = Guild, 1 = BotDM, 2 = PrivateChannel
const commandsPayload = [
  {
    name: "widget",
    description: "Comandos del widget de stats de Fortnite",
    integration_types: [1],
    contexts: [0, 1, 2],
    options: [
      {
        type: 1, // SUB_COMMAND
        name: "setup",
        description: "Vincula tu cuenta de Epic Games y prepara el widget",
        options: [
          {
            type: 3, // STRING
            name: "epic_username",
            description: "Tu nombre de usuario (display name) de Epic Games",
            required: true
          }
        ]
      },
      {
        type: 1,
        name: "refresh",
        description: "Vuelve a sincronizar tus stats de Fortnite en el widget"
      },
      {
        type: 1,
        name: "status",
        description: "Muestra la cuenta vinculada y la ultima sincronizacion"
      },
      {
        type: 1,
        name: "unlink",
        description: "Borra tu cuenta Epic y las stats locales guardadas"
      },
      {
        type: 1,
        name: "preview",
        description: "Previsualiza las stats que se enviarian sin tocar Discord"
      }
    ]
  }
];

async function main() {
  if (!process.env.CLIENT_ID || !process.env.DISCORD_TOKEN) {
    console.error("Faltan CLIENT_ID o DISCORD_TOKEN en el .env");
    process.exit(1);
  }

  const res = await fetch(
    `https://discord.com/api/v10/applications/${process.env.CLIENT_ID}/commands`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`
      },
      body: JSON.stringify(commandsPayload)
    }
  );

  if (!res.ok) {
    console.error(`Error ${res.status}:`, await res.text());
    process.exit(1);
  }

  console.log("Comandos registrados correctamente.");
}

main();
