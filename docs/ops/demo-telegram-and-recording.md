# Demo Telegram And Backup Recording

These assets are external to the repo, but the setup is standardized here.

## Telegram Bot

1. Create a dedicated demo bot in BotFather.
2. Create a muted/private demo channel or group.
3. Add the bot to the channel/group.
4. Put the token and chat id only in demo deployment env:

```bash
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

5. Validate without committing secrets:

```bash
TELEGRAM_BOT_TOKEN=... npm run telegram:demo-check
TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... TELEGRAM_SEND_TEST=1 npm run telegram:demo-check
```

Because bot tokens grant account access, rotate any token that was pasted into chat, screenshots, docs, or tickets.

## Backup Recording

Record a 3-5 minute fallback walkthrough:

1. public page and lead form
2. Telegram notification
3. CRM lead and pipeline
4. deal/payment/document profile
5. owner reports

Store the video outside this repository with the sales materials.

