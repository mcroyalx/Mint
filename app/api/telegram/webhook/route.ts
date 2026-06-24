import { NextRequest, NextResponse } from "next/server";
import { generateFallbackValuation } from "@/lib/server/valuation";

/**
 * Telegram bot token. MUST be provided via environment variable; it is never
 * hardcoded so the secret cannot leak through the repository.
 */
function getBotToken(): string | undefined {
  return process.env.TELEGRAM_BOT_TOKEN;
}

/** Optional shared secret used to authenticate incoming webhook calls. */
function getWebhookSecret(): string | undefined {
  return process.env.TELEGRAM_WEBHOOK_SECRET;
}

function getAppUrl(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

/** Fetch helper with a short timeout so the route never stalls. */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 2000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

const FALLBACK_BOT = {
  first_name: "MINT Web3 Bot",
  username: "mint_web3_web_bot",
  id: 0,
};

// GET /api/telegram/webhook - dynamically registers or checks the webhook
export async function GET(req: NextRequest) {
  const appUrl = getAppUrl(req);
  const webhookUrl = `${appUrl}/api/telegram/webhook`;

  try {
    const token = getBotToken();
    if (!token) {
      return NextResponse.json({
        ok: true,
        message: "Telegram bot loaded in sandbox mode (TELEGRAM_BOT_TOKEN not set)",
        bot: FALLBACK_BOT,
        webhook_url: webhookUrl,
        sandbox: true,
      });
    }

    // 1. Fetch info about the bot
    let botData;
    try {
      const getMeRes = await fetchWithTimeout(`https://api.telegram.org/bot${token}/getMe`);
      botData = await getMeRes.json();
    } catch (e) {
      console.warn("Telegram getMe timeout/failure, using sandbox fallback:", e);
      return NextResponse.json({
        ok: true,
        message: "Telegram API unreachable, active in sandbox mode",
        bot: FALLBACK_BOT,
        webhook_url: webhookUrl,
        sandbox: true,
      });
    }

    if (!botData?.ok) {
      console.warn("Invalid bot token or getMe failed, running in sandbox mode.");
      return NextResponse.json({
        ok: true,
        message: "Invalid credentials, active in sandbox mode",
        bot: FALLBACK_BOT,
        webhook_url: webhookUrl,
        sandbox: true,
      });
    }

    // 2. Register the webhook (optionally protected by a shared secret token).
    let webhookData = null;
    try {
      const secret = getWebhookSecret();
      const setWebhookUrl = new URL(`https://api.telegram.org/bot${token}/setWebhook`);
      setWebhookUrl.searchParams.set("url", webhookUrl);
      if (secret) {
        setWebhookUrl.searchParams.set("secret_token", secret);
      }
      const setWebhookRes = await fetchWithTimeout(setWebhookUrl.toString());
      webhookData = await setWebhookRes.json();
    } catch (wErr) {
      console.warn("Failed to set webhook with Telegram:", wErr);
    }

    // 3. Set the persistent menu button that launches the Telegram Mini App.
    let menuButtonData = null;
    try {
      const setMenuButtonRes = await fetchWithTimeout(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_button: { type: "web_app", text: "Open MINT", web_app: { url: appUrl } },
        }),
      });
      menuButtonData = await setMenuButtonRes.json();
    } catch (menuErr) {
      console.warn("Failed to configure bot menu button:", menuErr);
    }

    return NextResponse.json({
      ok: true,
      message: "Telegram bot configured successfully",
      bot: botData.result,
      webhook_url: webhookUrl,
      set_webhook_response: webhookData,
      set_menu_button_response: menuButtonData,
      sandbox: false,
    });
  } catch (err) {
    console.error("Telegram integration registration failed:", err);
    return NextResponse.json({
      ok: true,
      message: "Resilient safety mode active",
      bot: FALLBACK_BOT,
      webhook_url: webhookUrl,
      sandbox: true,
    });
  }
}

// POST /api/telegram/webhook - processes incoming telegram messages
export async function POST(req: NextRequest) {
  try {
    const token = getBotToken();
    if (!token) {
      // Nothing to reply with; acknowledge so Telegram stops retrying.
      return NextResponse.json({ ok: true, sandbox: true });
    }

    // Authenticate the request when a webhook secret is configured.
    const secret = getWebhookSecret();
    if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const message = body?.message;
    if (!message) {
      return NextResponse.json({ ok: true, message: "No message payload" });
    }

    const chatId = message.chat?.id;
    const text = message.text?.trim();
    const userLanguage = message.from?.language_code || "en";
    if (!chatId || !text) {
      return NextResponse.json({ ok: true });
    }

    const appUrl = getAppUrl(req);
    const isRu = userLanguage.startsWith("ru");

    // Handle /start command
    if (text === "/start") {
      const welcomeText = isRu
        ? `Добро пожаловать в <b>MINT</b>! 🚀\n\nПремиальная Web3-платформа долевого владения медиа-активами, где Telegram-каналы могут запускать TDA и становиться регулярно торгуемыми активами в экосистеме TON.\n\n🎮 <b>Как запустить Mini App приложение?</b>\n1. Нажмите на синюю кнопку <b>«Open MINT»</b> в левом нижнем углу экрана (прямо рядом с полем ввода).\n2. Или нажмите на кнопку <b>«🚀 Открыть MINT App»</b> прямо под этим сообщением!\n\n👉 <b>Умная ИИ-оценка:</b> вы можете отправить юзернейм любого канала (например, <code>@durov</code>), чтобы провести мгновенную оценку стоимости акций от Gemini AI!`
        : `Welcome to <b>MINT</b>! 🚀\n\nThe premium Web3 media equity platform where Telegram channels can launch TDAs and become publicly traded assets in the TON ecosystem.\n\n🎮 <b>How to launch the Mini App?</b>\n1. Press the blue <b>"Open MINT"</b> menu button in the bottom-left corner of your screen (right next to the message input bar).\n2. Or click the <b>"🚀 Open MINT App"</b> inline button attached below this text!\n\n👉 <b>On-Demand Valuation:</b> Send any Telegram channel handle (e.g., <code>@durov</code>) here to run an instant equity valuation via Gemini AI!`;

      await sendTelegramMessage(token, chatId, welcomeText, [
        [{ text: isRu ? "🚀 Открыть MINT App" : "🚀 Open MINT App", web_app: { url: appUrl } }],
      ]);
      return NextResponse.json({ ok: true });
    }

    // Evaluate a channel when the user sends a handle.
    const possibleHandle = text.startsWith("@") ? text : (text.match(/^[a-zA-Z0-9_]{4,32}$/) ? `@${text}` : null);
    if (possibleHandle) {
      const cleanHandle = possibleHandle.replace("@", "");

      const waitMessage = isRu
        ? `🔄 <b>Инициализация оценки для ${possibleHandle}...</b>\nНаш ИИ-аналитик Gemini подключается к блокчейн-метрикам TON...`
        : `🔄 <b>Initializing evaluation for ${possibleHandle}...</b>\nGemini AI analyst is compiling on-chain metrics and revenue streams...`;
      const waitMsgObj = await sendTelegramMessage(token, chatId, waitMessage);
      const waitMessageId = waitMsgObj?.result?.message_id;

      try {
        // Prefer the live Gemini route; fall back to the deterministic builder.
        let reportData = generateFallbackValuation(cleanHandle);
        try {
          const aiRes = await fetch(`${appUrl}/api/gemini`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ channelHandle: cleanHandle }),
          });
          if (aiRes.ok) {
            const resData = await aiRes.json();
            if (resData && !resData.error) {
              reportData = resData;
            }
          }
        } catch (innerErr) {
          console.error("Failed to query Gemini route from webhook:", innerErr);
        }

        const formatNum = (num: number) => new Intl.NumberFormat("en-US").format(num);
        const monthlyTon = formatNum(Math.round(reportData.monthlyRevenue_USD / 2.5));
        const valuationTon = formatNum(Math.round(reportData.suggestedValuation_USD / 2.5));

        const resultText = isRu
          ? `📊 <b>ОТЧЕТ MINT TRADING SYSTEM: ${possibleHandle}</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🏷️ <b>Канал:</b> ${reportData.channelName}\n` +
            `🗂️ <b>Ниша:</b> ${reportData.category}\n` +
            `👥 <b>Аудитория:</b> ${formatNum(reportData.subscriberCount)} подписчиков\n` +
            `💰 <b>Мес. оборот (Stars/Ads):</b> ${monthlyTon} TON (~$${formatNum(reportData.monthlyRevenue_USD)})\n` +
            `💎 <b>Справедливая оценка:</b> ${valuationTon} TON\n` +
            `📈 <b>Годовая доходность:</b> ${reportData.yieldPercent}% APY\n` +
            `🔓 <b>Целевой Free Float:</b> ${reportData.floatPercent}% акций\n\n` +
            `📋 <b>ИНВЕСТИЦИОННЫЙ ПРОСПЕКТ:</b>\n` +
            `• ${reportData.prospectusPoints[0]}\n` +
            `• ${reportData.prospectusPoints[1]}\n` +
            `• ${reportData.prospectusPoints[2]}`
          : `📊 <b>MINT TRADING SYSTEM REPORT: ${possibleHandle}</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🏷️ <b>Channel:</b> ${reportData.channelName}\n` +
            `🗂️ <b>Category:</b> ${reportData.category}\n` +
            `👥 <b>Audience:</b> ${formatNum(reportData.subscriberCount)} subscribers\n` +
            `💰 <b>Monthly Rev. (Stars/Ads):</b> ${monthlyTon} TON (~$${formatNum(reportData.monthlyRevenue_USD)})\n` +
            `💎 <b>Target Valuation:</b> ${valuationTon} TON\n` +
            `📈 <b>Yield Rate:</b> ${reportData.yieldPercent}% APY\n` +
            `🔓 <b>Public Float:</b> ${reportData.floatPercent}% shares\n\n` +
            `📋 <b>FINANCIAL PROSPECTUS:</b>\n` +
            `• ${reportData.prospectusPoints[0]}\n` +
            `• ${reportData.prospectusPoints[1]}\n` +
            `• ${reportData.prospectusPoints[2]}`;

        if (waitMessageId) {
          await deleteTelegramMessage(token, chatId, waitMessageId);
        }
        await sendTelegramMessage(token, chatId, resultText, [
          [{ text: isRu ? "🚀 Торговать акциями канала" : "🚀 Trade Channel Shares", web_app: { url: appUrl } }],
        ]);
      } catch (err) {
        console.error("Failed to generate report in tg bot:", err);
        if (waitMessageId) {
          await deleteTelegramMessage(token, chatId, waitMessageId);
        }
        await sendTelegramMessage(token, chatId, isRu ? "⚠️ Произошла ошибка при оценке." : "⚠️ An error occurred during evaluation.");
      }
      return NextResponse.json({ ok: true });
    }

    // Default reply for unrecognized commands
    const defaultText = isRu
      ? `ℹ️ Укажите юзернейм канала в формате <code>@username</code> для запуска ИИ-оценки стоимости, или откройте Mini App с помощью синей кнопки <b>«Open MINT»</b> в левом нижнем углу экрана (рядом с полем ввода).`
      : `ℹ️ Send a channel handle like <code>@username</code> to run a valuation, or launch the Mini App by clicking the blue <b>"Open MINT"</b> button in the bottom-left corner of your chat next to the keyboard.`;
    await sendTelegramMessage(token, chatId, defaultText, [
      [{ text: isRu ? "🚀 Открыть MINT App" : "🚀 Open MINT App", web_app: { url: appUrl } }],
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook POST handler error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

async function sendTelegramMessage(token: string, chatId: number, text: string, inlineKeyboard?: unknown[]) {
  const body: Record<string, unknown> = { chat_id: chatId, text, parse_mode: "HTML" };
  if (inlineKeyboard) {
    body.reply_markup = { inline_keyboard: inlineKeyboard };
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function deleteTelegramMessage(token: string, chatId: number, messageId: number) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
    });
  } catch (e) {
    console.error("Failed to delete temp tg message:", e);
  }
}
