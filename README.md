# Zentro

Zentro is a Discord user-installable crypto utility app. It supports public wallet balance lookups, saved per-user crypto addresses, saved UPI IDs, and saved UPI QR images.

## Commands

- `/bal` — check a BTC, LTC, or SOL address; omit the address to use your saved wallet.
- `/mybal` — check your saved wallet for a selected coin.
- `/setaddy` — save or update your BTC, LTC, or SOL wallet.
- `/setupi` — save or update your UPI ID.
- `/myupi` — show your saved UPI ID and saved QR image.
- `/upiqr` — upload or replace your UPI QR image.
- `/say` — send a text response through the interaction.
- `/help` — show the available commands.

## Setup

1. Use Node.js 20 or newer.
2. Run `npm install`.
3. Set `DISCORD_TOKEN` and `CLIENT_ID` in your hosting environment.
4. In Discord Developer Portal > Installation, enable **User Install** and select the user-install contexts you want to support.
5. Run `npm run check` to syntax-check the JavaScript files.
6. Run `npm run deploy` once to register global application commands.
7. Run `npm start`.

On Bot-Hosting.net, ensure the panel is deploying the latest repository commit. Set the startup command to `npm start` and add environment variables in the panel. Do not paste your bot token into chat or commit a real `.env` file.

## Persistent data

Saved crypto wallets, UPI IDs, and UPI QR image URLs are written to `data/zentro.json`. They survive ordinary restarts only if the hosting provider preserves that data file. If your host resets the container filesystem, configure a persistent volume/data directory or back up `data/`.

## Notes

- Public blockchain and market-price APIs can rate-limit or go offline. Zentro reports lookup errors instead of inventing balances.
- Saved wallets are public addresses only; Zentro does not store private keys or sign transactions.
- Discord attachment URLs used for UPI QR images may eventually expire, so re-upload the QR if it stops displaying.
- Run `npm run check` and test the commands in your intended user-install contexts before relying on them for payments.
