# Zentro

A Discord user-installable crypto utility app. Includes wallet balance lookups, personal saved wallets, owner-managed receiving addresses, UPI QR storage, and payment details.

## Commands

- `/bal` — check an address on Bitcoin, Litecoin, Solana, or USDT on a selected network.
- `/mybal` — check the wallet saved for your Discord account.
- `/setaddy` — owner-only: set a receiving address for payments.
- `/upiqr` — owner-only: upload or replace the UPI QR image.
- `/payment` — show the configured receiving addresses and UPI QR.
- `/say` — send a text response through the interaction.
- `/help` — show commands.

## Setup

1. Use Node.js 20 or newer.
2. Upload the files and run `npm install`.
3. Copy `.env.example` to `.env` and fill in `DISCORD_TOKEN`, `CLIENT_ID`, and your numeric `OWNER_ID`.
4. In the Discord Developer Portal, enable the **User Install** installation type. For interactions, allow **Guild Install** only if you also want server installation, and allow the appropriate interaction contexts (Guild, Bot DM, and Private Channel).
5. Run `npm run deploy` once to register slash commands.
6. Run `npm start`.

On Bot-Hosting.net, set the startup command to `npm start` and add the environment variables in the panel. Do not paste your bot token into chat or commit the real `.env` file.

## Notes

- The app uses public blockchain endpoints. They can rate-limit or go offline; the bot reports lookup errors instead of making up a balance.
- USDT is network-specific. The selected network must match the address/network that actually holds the tokens. This first version supports USDT on Ethereum (ERC-20) and TRON (TRC-20); token lookups depend on public API availability and may be rate-limited.
- `/mybal` uses the wallet saved by that Discord user with the separate `/setmywallet` command. It does not access private keys or sign transactions.
- User-installed apps cannot send ordinary bot messages in every context. Discord controls which interaction contexts and permissions are available. `/say` responds through the interaction and may be ephemeral depending on context.
- Local JSON data survives restarts only if the hosting provider preserves the app's filesystem. Back up `data/` or use persistent storage if the host resets files during redeploys.
- This project is a starter implementation; run `npm run check` and test each command in a private server/DM before relying on it for payments.