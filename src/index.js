import 'dotenv/config';
import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import { handleCommand } from './commands.js';

if (!process.env.DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN. Add it to your hosting environment.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, readyClient => {
  console.log(`Zentro is online as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  await handleCommand(interaction);
});

client.on(Events.Error, error => console.error('Discord client error:', error));
process.on('unhandledRejection', error => console.error('Unhandled rejection:', error));

client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error('Could not log in to Discord. Check DISCORD_TOKEN:', error.message);
  process.exit(1);
});