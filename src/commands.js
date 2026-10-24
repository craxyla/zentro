import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { getBalance, getMarketInfo, formatAmount } from './balances.js';
import { getStore, updateStore } from './store.js';

const ownerId = process.env.OWNER_ID;
const COLORS = { BTC: 0xf7931a, LTC: 0x345d9d, SOL: 0x9945ff };
const assetChoices = [
  { name: 'Bitcoin (BTC)', value: 'BTC' },
  { name: 'Litecoin (LTC)', value: 'LTC' },
  { name: 'Solana (SOL)', value: 'SOL' }
];
const privateReply = { flags: MessageFlags.Ephemeral };

function isOwner(interaction) {
  return Boolean(ownerId) && interaction.user.id === ownerId;
}
function money(value, max = 8) {
  return value == null ? 'N/A' : formatAmount(value, max);
}
function balanceEmbed(result, address, market) {
  const title = result.asset === 'LTC' ? 'Litecoin (LTC) Wallet'
    : result.asset === 'BTC' ? 'Bitcoin (BTC) Wallet'
    : 'Solana (SOL) Wallet';
  const amount = money(result.balance) + ' ' + result.asset;
  const dollar = '<:dollar:1352548946630938625>';
  const ltc = '<a:Ltc:1561733420923490414>';
  const btc = '<:BTC:1450767429465800878>';
  const sol = '<:SOL:1551127866349985886>';
  const arrow = '<a:Arrow:1556798207055364108>';
  const assetEmoji = result.asset === 'LTC' ? ltc : result.asset === 'BTC' ? btc : sol;
  const changeText = market?.change == null
    ? 'N/A'
    : (market.change >= 0 ? arrow : '▼') + ' ' + money(Math.abs(market.change), 2) + '%';
  return new EmbedBuilder()
    .setColor(COLORS[result.asset] || 0xeeeeee)
    .setTitle(title)
    .setDescription('`' + address + '`')
    .addFields(
      { name: assetEmoji + ' Balance', value: amount, inline: true },
      { name: 'Unconfirmed', value: result.unconfirmed == null ? 'N/A' : money(result.unconfirmed) + ' ' + result.asset, inline: true },
      { name: 'Total Received', value: result.received == null ? 'N/A' : money(result.received) + ' ' + result.asset, inline: true },
      { name: assetEmoji + ' Price', value: market?.price == null ? 'N/A' : dollar + ' ' + money(market.price, 2), inline: true },
      { name: '24h Change', value: changeText, inline: true },
      { name: 'Transactions', value: result.transactions == null ? 'Not provided by this data source' : String(result.transactions), inline: true }
    )
    .setFooter({ text: 'Zentro • Public blockchain data • Not financial advice' })
    .setTimestamp();
}

export const commands = [
  new SlashCommandBuilder().setName('bal').setDescription('Check a public crypto wallet balance')
    .addStringOption(o => o.setName('asset').setDescription('Cryptocurrency').setRequired(true).addChoices(...assetChoices))
    .addStringOption(o => o.setName('address').setDescription('Public wallet address').setRequired(true)),
  new SlashCommandBuilder().setName('mybal').setDescription('Check your saved wallet balance')
    .addStringOption(o => o.setName('asset').setDescription('Cryptocurrency').setRequired(true).addChoices(...assetChoices)),
  new SlashCommandBuilder().setName('setmywallet').setDescription('Save a wallet address for your /mybal command')
    .addStringOption(o => o.setName('asset').setDescription('Cryptocurrency').setRequired(true).addChoices(...assetChoices))
    .addStringOption(o => o.setName('address').setDescription('Your public wallet address').setRequired(true)),
  new SlashCommandBuilder().setName('setaddy').setDescription('Owner: set a receiving wallet address')
    .addStringOption(o => o.setName('asset').setDescription('Cryptocurrency').setRequired(true).addChoices(...assetChoices))
    .addStringOption(o => o.setName('address').setDescription('Public receiving address').setRequired(true)),
  new SlashCommandBuilder().setName('upiqr').setDescription('Owner: upload or replace your UPI QR image')
    .addAttachmentOption(o => o.setName('image').setDescription('UPI QR image (PNG/JPG/WebP)').setRequired(true)),
  new SlashCommandBuilder().setName('payment').setDescription('Show configured receiving addresses and UPI QR'),
  new SlashCommandBuilder().setName('say').setDescription('Send a public message through Zentro')
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
          '`/say` — send a public message'
        ].join('\n'));
      return interaction.reply({ embeds: [embed], ...privateReply });
    }

    if (commandName === 'say') {
      const message = interaction.options.getString('message', true);
      return interaction.reply({ content: message, allowedMentions: { parse: [] } });
    }

    if (commandName === 'setmywallet') {
      const asset = interaction.options.getString('asset', true);
      const address = interaction.options.getString('address', true).trim();
      if (address.length > 160 || /\s/.test(address)) return interaction.reply({ content: 'That address format looks invalid.', ...privateReply });
      await updateStore(data => {
        data.wallets[interaction.user.id] ||= {};
        data.wallets[interaction.user.id][asset] = address;
      });
      return interaction.reply({ content: 'Saved your ' + asset + ' wallet for /mybal.', ...privateReply });
    }

    if (commandName === 'setaddy') {
      if (!isOwner(interaction)) return interaction.reply({ content: 'Only the configured bot owner can change receiving addresses.', ...privateReply });
      const asset = interaction.options.getString('asset', true);
      const address = interaction.options.getString('address', true).trim();
      if (address.length > 160 || /\s/.test(address)) return interaction.reply({ content: 'That address format looks invalid.', ...privateReply });
      await updateStore(data => { data.receiving[asset] = address; });
      return interaction.reply({ content: 'Receiving address saved for ' + asset + '.', ...privateReply });
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
      const personalWallets = data.wallets[interaction.user.id] || {};
      const personalEntries = Object.entries(personalWallets);
      const receivingEntries = Object.entries(data.receiving);
      const sections = [];
      if (personalEntries.length) {
        sections.push('**Your saved wallets**\n' + personalEntries.map(([asset, address]) => '**' + asset + '**\n`' + address + '`').join('\n\n'));
      } else {
        sections.push('**Your saved wallets**\nNo personal wallets saved yet. Use `/setmywallet` to add your own BTC, LTC, or SOL address.');
      }
      if (receivingEntries.length) {
        sections.push('**Configured payment addresses**\n' + receivingEntries.map(([asset, address]) => '**' + asset + '**\n`' + address + '`').join('\n\n'));
      }
      const embed = new EmbedBuilder().setColor(0xeeeeee).setTitle('Zentro • Payment Details')
        .setDescription(sections.join('\n\n'))
        .setFooter({ text: 'Always verify the asset and network before sending.' });
      if (data.upiQrUrl) embed.setImage(data.upiQrUrl);
      return interaction.reply({ embeds: [embed], ...privateReply });
    }

    if (commandName === 'bal' || commandName === 'mybal') {
      const asset = interaction.options.getString('asset', true);
      let address = commandName === 'bal' ? interaction.options.getString('address', true) : null;
      if (commandName === 'mybal') {
        const data = await getStore();
        address = data.wallets[interaction.user.id]?.[asset];
        if (!address) return interaction.reply({ content: 'No saved wallet for this asset. Run /setmywallet first.', ...privateReply });
      }
      await interaction.deferReply(privateReply);
      const result = await getBalance(asset, address);
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
