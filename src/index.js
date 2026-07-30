require("dotenv").config();
const { Client, EmbedBuilder, GatewayIntentBits, Events, ActivityType } = require("discord.js");

const { getBRStats } = require("./fortnite");
const { pushWidget, buildBrowserSnippet } = require("./discordWidget");
const store = require("./store");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const COLORS = {
  success: 0x2ecc71,
  info: 0x3498db,
  warning: 0xf1c40f,
  danger: 0xe74c3c,
  fortnite: 0x5865f2
};

const TRACKED_STATS = [
  ["wins", "Victorias"],
  ["kills", "Kills"],
  ["matches", "Partidas"],
  ["deaths", "Muertes"],
  ["level", "Nivel"]
];

function getLinkedUser(discordId) {
  const user = store.getUser(discordId);
  if (!user?.epicUsername) {
    throw new Error("No tienes cuenta de Epic configurada. Usa /widget setup primero.");
  }
  return user;
}

function buildWidgetData(epicUsername, stats) {
  const overall = stats?.stats?.all?.overall ?? {};
  const displayName = stats?.account?.name ?? epicUsername;
  const level = stats?.battlePass?.level ?? 0;
  const snapshot = {
    username: displayName,
    kd: Number((overall.kd ?? 0).toFixed(2)),
    deaths: overall.deaths ?? 0,
    wins: overall.wins ?? 0,
    kills: overall.kills ?? 0,
    matches: overall.matches ?? 0,
    level
  };

  return {
    displayName,
    snapshot,
    dynamicFields: [
      { type: 1, name: "fortnite_username", value: displayName },
      { type: 1, name: "fortnite_kd", value: snapshot.kd.toFixed(2) },
      { type: 2, name: "fortnite_deaths", value: snapshot.deaths },
      { type: 2, name: "fortnite_wins", value: snapshot.wins },
      { type: 2, name: "fortnite_kills", value: snapshot.kills },
      { type: 2, name: "fortnite_matches", value: snapshot.matches },
      { type: 2, name: "fortnite_level", value: snapshot.level }
    ]
  };
}

function formatSignedDelta(value) {
  if (value > 0) return `+${value}`;
  return String(value);
}

function buildDiffLines(previous, current) {
  if (!previous) return ["Primera sincronizacion guardada para esta cuenta."];

  const lines = [];
  for (const [key, label] of TRACKED_STATS) {
    const before = Number(previous[key] ?? 0);
    const after = Number(current[key] ?? 0);
    const delta = after - before;
    if (delta !== 0) lines.push(`${label}: ${formatSignedDelta(delta)}`);
  }

  const previousKd = Number(previous.kd ?? 0);
  const currentKd = Number(current.kd ?? 0);
  if (previousKd !== currentKd) {
    lines.push(`K/D: ${formatSignedDelta(Number((currentKd - previousKd).toFixed(2)))}`);
  }

  return lines.length ? lines : ["Sin cambios desde la ultima sincronizacion."];
}

function statFields(stats) {
  return [
    { name: "K/D", value: stats.kd.toFixed(2), inline: true },
    { name: "Victorias", value: String(stats.wins), inline: true },
    { name: "Kills", value: String(stats.kills), inline: true },
    { name: "Partidas", value: String(stats.matches), inline: true },
    { name: "Muertes", value: String(stats.deaths), inline: true },
    { name: "Nivel", value: String(stats.level), inline: true }
  ];
}

function formatDiscordDate(isoDate) {
  if (!isoDate) return "Nunca";
  const timestamp = Math.floor(new Date(isoDate).getTime() / 1000);
  return `<t:${timestamp}:F> (<t:${timestamp}:R>)`;
}

function baseEmbed(title, color = COLORS.fortnite) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setTimestamp();
}

function errorEmbed(title, err) {
  return baseEmbed(title, COLORS.danger)
    .setDescription(`\`${err.message}\``)
    .setFooter({ text: "Revisa el usuario de Epic, tokens o estado de las APIs." });
}

function diffText(lines) {
  return lines.map((line) => `- ${line}`).join("\n");
}

async function fetchWidgetDataForUser(discordId) {
  const user = getLinkedUser(discordId);
  const stats = await getBRStats(user.epicUsername);
  const widgetData = buildWidgetData(user.epicUsername, stats);
  return { user, ...widgetData };
}

async function refreshWidgetForUser(discordId) {
  const { user, displayName, snapshot, dynamicFields } = await fetchWidgetDataForUser(discordId);
  await pushWidget(discordId, { username: displayName, dynamicFields });

  store.updateUser(discordId, {
    epicUsername: user.epicUsername,
    displayName,
    lastStats: snapshot,
    lastSyncedAt: new Date().toISOString()
  });

  return {
    displayName,
    snapshot,
    diffLines: buildDiffLines(user.lastStats, snapshot)
  };
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "widget") return;

  const sub = interaction.options.getSubcommand();

  if (sub === "setup") {
    await interaction.deferReply({ ephemeral: true });
    const epicUsername = interaction.options.getString("epic_username", true);
    store.setEpicUsername(interaction.user.id, epicUsername);

    try {
      await refreshWidgetForUser(interaction.user.id);
    } catch (err) {
      const embed = errorEmbed("Usuario guardado, sync fallida", err)
        .setDescription([
          `Guarde tu usuario como **${epicUsername}**, pero no pude sincronizar las stats todavia.`,
          "",
          `Detalle: \`${err.message}\``
        ].join("\n"))
        .addFields({
          name: "Siguiente paso",
          value: "Revisa que el nombre este bien escrito y vuelve a intentarlo con `/widget refresh`."
        });
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const snippet = buildBrowserSnippet(process.env.CLIENT_ID);
    const embed = baseEmbed("Widget configurado", COLORS.success)
      .setDescription(`Cuenta vinculada a **${epicUsername}** y stats sincronizadas.`)
      .addFields(
        {
          name: "Instalacion visual",
          value: [
            "1. Abre Discord en navegador o escritorio.",
            "2. Abre DevTools con `Ctrl+Shift+I` y entra en **Console**.",
            "3. Si lo pide, escribe `allow pasting`.",
            "4. Pega el codigo de abajo y pulsa Enter.",
            "5. Recarga Discord con `Ctrl+R`."
          ].join("\n")
        },
        {
          name: "Luego",
          value: "Usa `/widget refresh` para actualizar stats cuando quieras."
        }
      );

    await interaction.editReply({
      content: ["```js", snippet, "```"].join("\n"),
      embeds: [embed]
    });
    return;
  }

  if (sub === "refresh") {
    await interaction.deferReply({ ephemeral: true });
    try {
      const result = await refreshWidgetForUser(interaction.user.id);
      const embed = baseEmbed("Widget actualizado", COLORS.success)
        .setDescription(`Stats sincronizadas para **${result.displayName}**.`)
        .addFields(
          ...statFields(result.snapshot),
          { name: "Cambios desde la ultima sync", value: diffText(result.diffLines), inline: false }
        );
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ embeds: [errorEmbed("Error actualizando el widget", err)] });
    }
    return;
  }

  if (sub === "status") {
    const user = store.getUser(interaction.user.id);
    if (!user?.epicUsername) {
      const embed = baseEmbed("Sin cuenta vinculada", COLORS.warning)
        .setDescription("Usa `/widget setup epic_username:<tu nombre>` para vincular tu cuenta de Epic.");
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const embed = baseEmbed("Estado del widget", COLORS.info)
      .setDescription(`Cuenta Epic vinculada: **${user.displayName ?? user.epicUsername}**`)
      .addFields(
        { name: "Usuario guardado", value: `\`${user.epicUsername}\``, inline: true },
        { name: "Ultima sincronizacion", value: formatDiscordDate(user.lastSyncedAt), inline: true }
      );

    if (user.lastStats) {
      embed.addFields(...statFields(user.lastStats));
    } else {
      embed.addFields({ name: "Stats guardadas", value: "Aun no hay stats sincronizadas." });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (sub === "unlink") {
    const deleted = store.deleteUser(interaction.user.id);
    const embed = deleted
      ? baseEmbed("Datos locales borrados", COLORS.success)
        .setDescription("He borrado tu cuenta Epic y las stats locales guardadas.")
        .addFields({ name: "Importante", value: "El widget ya no se actualizara hasta que uses `/widget setup` otra vez." })
      : baseEmbed("Nada que borrar", COLORS.warning)
        .setDescription("No habia datos locales guardados para tu usuario.")
        .addFields({ name: "Siguiente paso", value: "Usa `/widget setup` si quieres vincular una cuenta." });

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (sub === "preview") {
    await interaction.deferReply({ ephemeral: true });
    try {
      const { user, displayName, snapshot } = await fetchWidgetDataForUser(interaction.user.id);
      const diffLines = buildDiffLines(user.lastStats, snapshot);
      const embed = baseEmbed("Preview del widget", COLORS.fortnite)
        .setDescription(`Asi quedaria el widget para **${displayName}**. No he tocado Discord.`)
        .addFields(
          ...statFields(snapshot),
          { name: "Cambios previstos", value: diffText(diffLines), inline: false }
        )
        .setFooter({ text: "Preview: consulta Fortnite y compara con tu ultima sync local." });
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ embeds: [errorEmbed("Error creando la preview", err)] });
    }
    return;
  }
});

client.once(Events.ClientReady, (c) => {
  console.log(`Bot conectado como ${c.user.tag}`);
    c.user.setPresence({
    activities: [{ name: "Widget Fortnite", type: ActivityType.Playing }],
    status: "online"
  });
});

client.login(process.env.DISCORD_TOKEN);
