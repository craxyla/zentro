# Zentro

A Discord **user-install-only** crypto utility app. Includes wallet balance lookups, personal saved wallets, owner-managed receiving addresses, UPI QR storage, and payment details. It uses global application commands only; no guild ID or guild command registration is used.

## Commands

- `/bal` — check an address on Bitcoin, Litecoin, Solana, or USDT on a selected network.
- `/mybal` — check the wallet saved for your Discord account.
- `/setmywallet` — save your own wallet for `/mybal`.
- `/setaddy` — owner-only: set a receiving address for payments.
- `/upiqr` — owner-only: upload or replace the UPI QR image.
- `/payment` — show the configured receiving addresses and UPI QR.
- `/say` — send a text response through the interaction.
- `/help` — show commands.

## Setup

1. Use Node.js 20 or newer.
2. Run `npm install`.
3. Set `DISCORD_TOKEN`, `CLIENT_ID`, and your numeric `OWNER_ID` as environment variables. There is no `GUILD_ID`.
4. In Discord Developer Portal > Installation, enable **User Install** and disable **Guild Install**. Under Default Install Settings, select the user-install contexts you want to support.
5. Run `npm run deploy` once to register global application commands.
6. Run `npm start`.

On Bot-Hosting.net, set the startup command to `npm start` and add the environment variables in the panel. Do not paste your bot token into chat or commit a real `.env` file.

## Notes

- The app uses public blockchain endpoints. They can rate-limit or go offline; the bot reports lookup errors instead of making up a balance.
- USDT is network-specific. The selected network must match the address/network that actually holds the tokens. This version supports USDT on Ethereum (ERC-20) and TRON (TRC-20); token lookups depend on public API availability and may be rate-limited.
- `/mybal` uses the wallet saved by that Discord user with `/setmywallet`. It does not access private keys or sign transactions.
- User-installed apps are limited by Discord's interaction contexts and permissions. `/say` responds through the interaction, not by assuming server-wide message access.
- Local JSON data survives restarts only if the hosting provider preserves the app's filesystem. Back up `data/` or use persistent storage if the host resets files during redeploys.
- This is a starter implementation; run `npm run check` and test each command in the supported user-install contexts before relying on it for payments.