export default async function handler(req, res) {
  // Faqat POST so'rovlarni qabul qilamiz
  if (req.method !== 'POST') {
    return res.status(200).json({ message: 'Telegram bot webhook ishlayapti!' });
  }

  const { message } = req.body;
  const token = process.env.TELEGRAM_BOT_TOKEN;

  // Agar xabar bo'sh bo'lsa, indamaymiz
  if (!message || !message.text) {
    return res.status(200).send('OK');
  }

  const chatId = message.chat.id;
  const text = message.text;
  const firstName = message.from.first_name || "O'quvchi";

  // Agar foydalanuvchi /start deb yozsa
  if (text === '/start') {
    const replyText = `Assalomu alaykum, ${firstName}! 🎓\n\nNavro'z O'quv Markaziga xush kelibsiz. Ro'yxatdan o'tish va guruhlarni tanlash uchun quyidagi tugmani bosing:`;
    
    // Anketamiz ochiladigan Mini App tugmasi
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "📝 Ro'yxatdan o'tish",
            web_app: { url: "https://uquv-markaz-navroz.vercel.app/bot-register" }
          }
        ]
      ]
    };

    // Telegram API orqali javob yuborish
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: replyText,
        reply_markup: keyboard
      })
    });
  }

  // Telegramga doim OK qaytarish shart, bo'lmasa u xabarni qotib qoldi deb o'ylab, tinmay qayta yuboraveradi
  return res.status(200).send('OK');
}