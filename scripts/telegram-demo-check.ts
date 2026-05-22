export {};

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

async function telegram(method: string, body?: Record<string, unknown>) {
  if (!token) throw new Error("Set TELEGRAM_BOT_TOKEN.");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) throw new Error(`${method} failed`);
  return data.result;
}

async function main() {
  const bot = await telegram("getMe");
  console.log(`Telegram bot reachable: @${bot.username}`);
  if (chatId && process.env.TELEGRAM_SEND_TEST === "1") {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: `Demo Telegram check ${new Date().toISOString()}`,
    });
    console.log("Test message sent to TELEGRAM_CHAT_ID.");
  } else {
    console.log("Message send skipped. Set TELEGRAM_SEND_TEST=1 and TELEGRAM_CHAT_ID to send a test message.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
