import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commands } from './commands.js';

const { DISCORD_TOKEN, CLIENT_ID } = process.env;
if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('Missing DISCORD_TOKEN or CLIENT_ID in environment.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
try {
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log(`Registered ${commands.length} global commands for Zentro user install.`);
} catch (error) {
  console.error('Failed to register global commands:', error);
  process.exit(1);
}