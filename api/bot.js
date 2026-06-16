export default async function handler(req, res) {
    // 1. Agar so'rov POST bo'lmasa, bot faol ekanini bildirib chiqib ketamiz
    if (req.method !== 'POST') {
        return res.status(200).json({ message: 'Bot webhook ishlamoqda!' });
    }

    const { message } = req.body;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    // 2. Agar xabar kelmasa yoki matn bo'lmasa, Telegramga "OK" deymiz (qotib qolmasligi uchun)
    if (!message || !message.text) {
        return res.status(200).send('OK');
    }

    const chatId = message.chat.id;
    const text = message.text;
    const firstName = message.from.first_name || "O'quvchi";

    // 3. /start buyrug'ini tekshiramiz
    if (text === '/start') {
        const replyText = `Assalomu alaykum, ${firstName}! 🎓\n\nNavro'z O'quv Markaziga xush kelibsiz. Quyidagi tugma orqali ro'yxatdan o'tishingiz mumkin:`;

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

        // 4. Telegramga javob yuboramiz
        try {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: replyText,
                    reply_markup: keyboard,
                    parse_mode: 'Markdown'
                })
            });
        } catch (error) {
            console.error("Telegram API xatosi:", error);
        }
    }

    // 5. Telegram serveriga har doim "OK" qaytarish shart!
    return res.status(200).send('OK');
}