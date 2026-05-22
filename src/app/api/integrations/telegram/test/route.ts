import { NextResponse } from "next/server";
import { requirePlatformApiAccess } from "@/lib/platform-guards";
import { sendTelegramMessage } from "@/lib/telegram";
import { getPlatformSettings } from "@/lib/platform-settings";

export async function POST() {
  const auth = await requirePlatformApiAccess("technicalSettings");
  if (auth.response) return auth.response;

  try {
    const settings = getPlatformSettings();
    const result = await sendTelegramMessage({
      chatId: process.env.TELEGRAM_CHAT_ID || "",
      text: `${settings.publicBrandName} Telegram test\nTime: ${new Date().toISOString()}`,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Telegram test failed" },
      { status: 502 }
    );
  }
}
