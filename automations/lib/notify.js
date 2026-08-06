export async function notify(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error(
      "Missing required environment variables: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID",
    );
  }

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    },
  );
  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(
      `Telegram notification failed (${response.status}): ${result.description ?? "Unknown error"}`,
    );
  }
}
