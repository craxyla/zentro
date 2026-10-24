import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { getBalance, getMarketInfo, formatAmount } from './balances.js';
import { getStore, updateStore } from './store.js';

const ownerId = process.env.OWNER_ID;
const COLORS = { BTC: 0xf7931a, LTC: 0x345d9d, SOL: 0x9945ff, USDT: 0x26a17b };
const assetChoices = [
  { name: 'Bitcoin (BTC)', value: 'BTC' },
  { name: 'Litecoin (LTC)', value: 'LTC' },
  { name: 'Solana (SOL)', value: 'SOL' },
  { name: 'Tether (USDT)', value: 'USDT' }
];
const networkChoices = [
  { name: 'TRC20 — TRON', value: 'TRC20' },
  { name: 'ERC20 — Ethereum', value: 'ERC20' }
];
const privateReply = { flags: MessageFlags.Ephemeral };

function isOwner(interaction) {
  return Boolean(ownerId) && interaction.user.id === ownerId;
}
function networkFor(asset, network) {
  if (asset === 'USDT') return network || 'TRC20';
  return asset === 'BTC' ? 'Bitcoin' : asset === 'LTC' ? 'Litecoin' : 'Solana';
}
function money(value, max = 8) {
  return value == null ? 'N/A' : formatAmount(value, max);
}
function balanceEmbed(result, address, market) {
  const title = result.asset === 'LTC' ? 'Litecoin (LTC) Wallet'
    : result.asset === 'BTC' ? 'Bitcoin (BTC) Wallet'
    : result.asset === 'SOL' ? 'Solana (SOL) Wallet'
    : 'Tether (USDT) Wallet';
  const amount = result.asset === 'USDT'
    ? money(result.balance, 6) + ' USDT'
    : money(result.balance) + ' ' + result.asset;
  const dollar = '<:dollar:1352548946630938625>';
  const ltc = '<a:Ltc:1561733420923490414>';
  const arrow = '<a:Arrow:1556798207055364108>';
  const changeText = market?.change == null
    ? 'N/A'
    : (market.change >= 0 ? arrow : '▼') + ' $' + money(Math.abs(market.change), 2);
  return new EmbedBuilder()
    .setColor(result.asset === 'LTC' ? 0x6b91c9 : (COLORS[result.asset] || 0xeeeeee))
    .setTitle(title)
    .setDescription('`' + address + '`')
    .addFields(
      { name: dollar + ' Balance', value: result.asset === 'LTC' ? '$' + money(result.balance, 2) : amount, inline: true },
      { name: 'Unconfirmed', value: result.unconfirmed == null ? '$0.00' : '$' + money(result.unconfirmed, 2), inline: true },
      { name: 'Total Received', value: result.received == null ? '$0.00' : '$' + money(result.received, 2), inline: true },
      { name: ltc + ' Price', value: market?.price == null ? 'N/A' : '$' + money(market.price, 2), inline: true },
      { name: arrow + ' 24h Change', value: changeText, inline: true },
      { name: 'Last 5 Transactions', value: 'No recent transactions found', inline: false },
      { name: '0 Transactions', value: '\u200b', inline: false }
    );
}

export const commands = [
  new SlashCommandBuilder().setName('bal').setDescription('Check a public crypto wallet balance')
    .addStringOption(o => o.setName('asset').setDescription('Cryptocurrency').setRequired(true).addChoices(...assetChoices))
    .addStringOption(o => o.setName('address').setDescription('Public wallet address').setRequired(true))
    .addStringOption(o => o.setName('network').setDescription('Required for USDT; ignored for other assets').addChoices(...networkChoices)),
  new SlashCommandBuilder().setName('mybal').setDescription('Check your saved wallet balance')
    .addStringOption(o => o.setName('asset').setDescription('Cryptocurrency').setRequired(true).addChoices(...assetChoices))
    .addStringOption(o => o.setName('network').setDescription('Required for USDT').addChoices(...networkChoices)),
  new SlashCommandBuilder().setName('setmywallet').setDescription('Save a wallet address for your /mybal command')
    .addStringOption(o => o.setName('asset').setDescription('Cryptocurrency').setRequired(true).addChoices(...assetChoices))
    .addStringOption(o => o.setName('address').setDescription('Your public wallet address').setRequired(true))
    .addStringOption(o => o.setName('network').setDescription('Required for USDT').addChoices(...networkChoices)),
  new SlashCommandBuilder().setName('setaddy').setDescription('Owner: set a receiving wallet address')
    .addStringOption(o => o.setName('asset').setDescription('Cryptocurrency').setRequired(true).addChoices(...assetChoices))
    .addStringOption(o => o.setName('address').setDescription('Public receiving address').setRequired(true))
    .addStringOption(o => o.setName('network').setDescription('Required for USDT').addChoices(...networkChoices)),
  new SlashCommandBuilder().setName('upiqr').setDescription('Owner: upload or replace your UPI QR image')
    .addAttachmentOption(o => o.setName('image').setDescription('UPI QR image (PNG/JPG/WebP)').setRequired(true)),
  new SlashCommandBuilder().setName('payment').setDescription('Show configured receiving addresses and UPI QR'),
  new SlashCommandBuilder().setName('say').setDescription('Reply with a message through Zentro')
    .addStringOption(o => o.setName('message').setDescription('Message to send').setRequired(true).setMaxLength(1900)),
  new SlashCommandBuilder().setName('help').setDescription('Show Zentro commands')
].map(c => ({ ...c.toJSON(), integration_types: [1], contexts: [0, 1, 2] }));

export async function handleCommand(interaction) {
  const { commandName } = interaction;
  try {
    if (commandName === 'help') {
      const embed = new EmbedBuilder().setColor(0xeeeeee).setTitle('Zentro • Commands')
        .setDescription([
          '`/bal` — check a public address',
          '`/mybal` — check your saved wallet',
          '`/setmywallet` — save a wallet for /mybal',
          '`/setaddy` — owner receiving addresses',
          '`/upiqr` — owner UPI QR setup',
          '`/payment` — display payment details',
          '`/say` — respond with a message'
        ].join('\n'));
      return interaction.reply({ embeds: [embed], ...privateReply });
    }

    if (commandName === 'say') {
      const message = interaction.options.getString('message', true);
      return interaction.reply({ content: message, allowedMentions: { parse: [] }, ...privateReply });
    }

    if (commandName === 'setmywallet') {
      const asset = interaction.options.getString('asset', true);
      const address = interaction.options.getString('address', true).trim();
      const network = asset === 'USDT' ? interaction.options.getString('network') : null;
      if (asset === 'USDT' && !network) return interaction.reply({ content: 'Select a USDT network (TRC20 or ERC20).', ...privateReply });
      if (address.length > 160 || /\s/.test(address)) return interaction.reply({ content: 'That address format looks invalid.', ...privateReply });
      await updateStore(data => {
        data.wallets[interaction.user.id] ||= {};
        data.wallets[interaction.user.id][asset + (network ? ':' + network : '')] = address;
      });
      return interaction.reply({ content: 'Saved your ' + asset + (network ? ' (' + network + ')' : '') + ' wallet for /mybal.', ...privateReply });
    }

    if (commandName === 'setaddy') {
      if (!isOwner(interaction)) return interaction.reply({ content: 'Only the configured bot owner can change receiving addresses.', ...privateReply });
      const asset = interaction.options.getString('asset', true);
      const address = interaction.options.getString('address', true).trim();
      const network = asset === 'USDT' ? interaction.options.getString('network') : null;
      if (asset === 'USDT' && !network) return interaction.reply({ content: 'Select a USDT network (TRC20 or ERC20).', ...privateReply });
      if (address.length > 160 || /\s/.test(address)) return interaction.reply({ content: 'That address format looks invalid.', ...privateReply });
      await updateStore(data => { data.receiving[asset + (network ? ':' + network : '')] = address; });
      return interaction.reply({ content: 'Receiving address saved for ' + asset + (network ? ' (' + network + ')' : '') + '.', ...privateReply });
    }

    if (commandName === 'upiqr') {
      if (!isOwner(interaction)) return interaction.reply({ content: 'Only the configured bot owner can change the UPI QR.', ...privateReply });
      const attachment = interaction.options.getAttachment('image', true);
      if (!attachment.contentType?.startsWith('image/')) return interaction.reply({ content: 'Please upload a PNG, JPG, or WebP image.', ...privateReply });
      await updateStore(data => { data.upiQrUrl = attachment.url; });
      return interaction.reply({ content: 'UPI QR saved. Use /payment to display it.', ...privateReply });
    }

    if (commandName === 'payment') {
      const data = await getStore();
      const entries = Object.entries(data.receiving);
      const embed = new EmbedBuilder().setColor(0xeeeeee).setTitle('Zentro • Payment Details')
        .setDescription(entries.length ? entries.map(([key, address]) => '**' + key.replace(':', ' • ') + '**\n`' + address + '`').join('\n\n') : 'No receiving addresses have been configured yet.')
        .setFooter({ text: 'Always verify the asset and network before sending.' });
      if (data.upiQrUrl) embed.setImage(data.upiQrUrl);
      return interaction.reply({ embeds: [embed], ...privateReply });
    }

    if (commandName === 'bal' || commandName === 'mybal') {
      const asset = interaction.options.getString('asset', true);
      const network = asset === 'USDT' ? interaction.options.getString('network') : null;
      if (asset === 'USDT' && !network) return interaction.reply({ content: 'Select the USDT network (TRC20 or ERC20).', ...privateReply });
      let address = commandName === 'bal' ? interaction.options.getString('address', true) : null;
      if (commandName === 'mybal') {
        const data = await getStore();
        address = data.wallets[interaction.user.id]?.[asset + (network ? ':' + network : '')];
        if (!address) return interaction.reply({ content: 'No saved wallet for this asset. Run /setmywallet first.', ...privateReply });
      }
      await interaction.deferReply(privateReply);
      const result = await getBalance(asset, address, network);
      let market = null;
      try { market = await getMarketInfo(asset); } catch (priceError) { console.warn('Market price unavailable:', priceError.message); }
      return interaction.editReply({ embeds: [balanceEmbed(result, address, market)] });
    }
  } catch (error) {
    console.error('Command failed:', commandName, error);
    const message = 'Could not complete this request: ' + (error?.message || 'unknown error') + '. Try again later.';
    if (interaction.deferred || interaction.replied) return interaction.editReply({ content: message, embeds: [] }).catch(() => {});
    return interaction.reply({ content: message, ...privateReply }).catch(() => {});
  }
} + money(market.price, 6), inline: true },
      { name: '24h Change', value: market?.change == null ? 'N/A' : (market.change >= 0 ? '▲ ' : '▼ ') + money(Math.abs(market.change), 2) + '%', inline: true },
      { name: 'Transactions', value: result.transactions == null ? 'Not provided by this data source' : String(result.transactions), inline: true }
    )
    .setFooter({ text: 'Zentro • Public blockchain data • Not financial advice' })
    .setTimestamp();
  return embed;
}

export const commands = [
  new SlashCommandBuilder().setName('bal').setDescription('Check a public crypto wallet balance')
    .addStringOption(o => o.setName('asset').setDescription('Cryptocurrency').setRequired(true).addChoices(...assetChoices))
    .addStringOption(o => o.setName('address').setDescription('Public wallet address').setRequired(true))
    .addStringOption(o => o.setName('network').setDescription('Required for USDT; ignored for other assets').addChoices(...networkChoices)),
  new SlashCommandBuilder().setName('mybal').setDescription('Check your saved wallet balance')
    .addStringOption(o => o.setName('asset').setDescription('Cryptocurrency').setRequired(true).addChoices(...assetChoices))
    .addStringOption(o => o.setName('network').setDescription('Required for USDT').addChoices(...networkChoices)),
  new SlashCommandBuilder().setName('setmywallet').setDescription('Save a wallet address for your /mybal command')
    .addStringOption(o => o.setName('asset').setDescription('Cryptocurrency').setRequired(true).addChoices(...assetChoices))
    .addStringOption(o => o.setName('address').setDescription('Your public wallet address').setRequired(true))
    .addStringOption(o => o.setName('network').setDescription('Required for USDT').addChoices(...networkChoices)),
  new SlashCommandBuilder().setName('setaddy').setDescription('Owner: set a receiving wallet address')
    .addStringOption(o => o.setName('asset').setDescription('Cryptocurrency').setRequired(true).addChoices(...assetChoices))
    .addStringOption(o => o.setName('address').setDescription('Public receiving address').setRequired(true))
    .addStringOption(o => o.setName('network').setDescription('Required for USDT').addChoices(...networkChoices)),
  new SlashCommandBuilder().setName('upiqr').setDescription('Owner: upload or replace your UPI QR image')
    .addAttachmentOption(o => o.setName('image').setDescription('UPI QR image (PNG/JPG/WebP)').setRequired(true)),
  new SlashCommandBuilder().setName('payment').setDescription('Show configured receiving addresses and UPI QR'),
  new SlashCommandBuilder().setName('say').setDescription('Reply with a message through Zentro')
    .addStringOption(o => o.setName('message').setDescription('Message to send').setRequired(true).setMaxLength(1900)),
  new SlashCommandBuilder().setName('help').setDescription('Show Zentro commands')
].map(c => c.toJSON());

export async function handleCommand(interaction) {
  const { commandName } = interaction;
  try {
    if (commandName === 'help') {
      const embed = new EmbedBuilder().setColor(0xeeeeee).setTitle('Zentro • Commands')
        .setDescription([
          '`/bal` — check a public address',
          '`/mybal` — check your saved wallet',
          '`/setmywallet` — save a wallet for /mybal',
          '`/setaddy` — owner receiving addresses',
          '`/upiqr` — owner UPI QR setup',
          '`/payment` — display payment details',
          '`/say` — respond with a message'
        ].join('\n'));
      return interaction.reply({ embeds: [embed], ...privateReply });
    }

    if (commandName === 'say') {
      const message = interaction.options.getString('message', true);
      return interaction.reply({ content: message, allowedMentions: { parse: [] }, ...privateReply });
    }

    if (commandName === 'setmywallet') {
      const asset = interaction.options.getString('asset', true);
      const address = interaction.options.getString('address', true).trim();
      const network = asset === 'USDT' ? interaction.options.getString('network') : null;
      if (asset === 'USDT' && !network) return interaction.reply({ content: 'Select a USDT network (TRC20 or ERC20).', ...privateReply });
      if (address.length > 160 || /\s/.test(address)) return interaction.reply({ content: 'That address format looks invalid.', ...privateReply });
      await updateStore(data => {
        data.wallets[interaction.user.id] ||= {};
        data.wallets[interaction.user.id][asset + (network ? ':' + network : '')] = address;
      });
      return interaction.reply({ content: 'Saved your ' + asset + (network ? ' (' + network + ')' : '') + ' wallet for /mybal.', ...privateReply });
    }

    if (commandName === 'setaddy') {
      if (!isOwner(interaction)) return interaction.reply({ content: 'Only the configured bot owner can change receiving addresses.', ...privateReply });
      const asset = interaction.options.getString('asset', true);
      const address = interaction.options.getString('address', true).trim();
      const network = asset === 'USDT' ? interaction.options.getString('network') : null;
      if (asset === 'USDT' && !network) return interaction.reply({ content: 'Select a USDT network (TRC20 or ERC20).', ...privateReply });
      if (address.length > 160 || /\s/.test(address)) return interaction.reply({ content: 'That address format looks invalid.', ...privateReply });
      await updateStore(data => { data.receiving[asset + (network ? ':' + network : '')] = address; });
      return interaction.reply({ content: 'Receiving address saved for ' + asset + (network ? ' (' + network + ')' : '') + '.', ...privateReply });
    }

    if (commandName === 'upiqr') {
      if (!isOwner(interaction)) return interaction.reply({ content: 'Only the configured bot owner can change the UPI QR.', ...privateReply });
      const attachment = interaction.options.getAttachment('image', true);
      if (!attachment.contentType?.startsWith('image/')) return interaction.reply({ content: 'Please upload a PNG, JPG, or WebP image.', ...privateReply });
      await updateStore(data => { data.upiQrUrl = attachment.url; });
      return interaction.reply({ content: 'UPI QR saved. Use /payment to display it.', ...privateReply });
    }

    if (commandName === 'payment') {
      const data = await getStore();
      const entries = Object.entries(data.receiving);
      const embed = new EmbedBuilder().setColor(0xeeeeee).setTitle('Zentro • Payment Details')
        .setDescription(entries.length ? entries.map(([key, address]) => '**' + key.replace(':', ' • ') + '**\n`' + address + '`').join('\n\n') : 'No receiving addresses have been configured yet.')
        .setFooter({ text: 'Always verify the asset and network before sending.' });
      if (data.upiQrUrl) embed.setImage(data.upiQrUrl);
      return interaction.reply({ embeds: [embed], ...privateReply });
    }

    if (commandName === 'bal' || commandName === 'mybal') {
      const asset = interaction.options.getString('asset', true);
      const network = asset === 'USDT' ? interaction.options.getString('network') : null;
      if (asset === 'USDT' && !network) return interaction.reply({ content: 'Select the USDT network (TRC20 or ERC20).', ...privateReply });
      let address = commandName === 'bal' ? interaction.options.getString('address', true) : null;
      if (commandName === 'mybal') {
        const data = await getStore();
        address = data.wallets[interaction.user.id]?.[asset + (network ? ':' + network : '')];
        if (!address) return interaction.reply({ content: 'No saved wallet for this asset. Run /setmywallet first.', ...privateReply });
      }
      await interaction.deferReply(privateReply);
      const result = await getBalance(asset, address, network);
      let market = null;
      try { market = await getMarketInfo(asset); } catch (priceError) { console.warn('Market price unavailable:', priceError.message); }
      return interaction.editReply({ embeds: [balanceEmbed(result, address, market)] });
    }
  } catch (error) {
    console.error('Command failed:', commandName, error);
    const message = 'Could not complete this request: ' + (error?.message || 'unknown error') + '. Try again later.';
    if (interaction.deferred || interaction.replied) return interaction.editReply({ content: message, embeds: [] }).catch(() => {});
    return interaction.reply({ content: message, ...privateReply }).catch(() => {});
  }
}