import mongoose from 'mongoose';

// Bazaga ulanish funksiyasi
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

// O'quvchi modelini chaqiramiz
const studentSchema = new mongoose.Schema({
  name: String,
  phone: String,
  group: String,
  telegramChatId: Number
}, { strict: false });
const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(200).json({ message: 'Bot webhook ishlamoqda!' });
    }

    const { message } = req.body;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!message || !message.text) {
        return res.status(200).send('OK');
    }

    const chatId = message.chat.id;
    const text = message.text;
    const firstName = message.from.first_name || "O'quvchi";

    if (text === '/start') {
        await connectDB(); // Bazaga ulanamiz
        
        // Mijozning chatId sini bazadan qidiramiz
        const existingStudent = await Student.findOne({ telegramChatId: chatId });

        let replyText = "";
        let keyboard = {};

        if (existingStudent) {
            // AGAR RO'YXATDAN O'TGAN BO'LSA
            replyText = `Assalomu alaykum, *${existingStudent.name}*! 🎓\n\nSiz ro'yxatdan o'tgansiz. Shaxsiy kabinetingizga kirib ma'lumotlaringizni va to'lov holatini ko'rishingiz mumkin:`;
            keyboard = {
                inline_keyboard: [
                    [{ text: "👤 Mening profilim", web_app: { url: "https://uquv-markaz-navroz.vercel.app/profile" } }]
                ]
            };
        } else {
            // AGAR RO'YXATDAN O'TMAGAN BO'LSA
            replyText = `Assalomu alaykum, *${firstName}*! 🎓\n\nNavro'z O'quv Markaziga xush kelibsiz. Quyidagi tugma orqali ro'yxatdan o'tishingiz mumkin:`;
            keyboard = {
                inline_keyboard: [
                    [{ text: "📝 Ro'yxatdan o'tish", web_app: { url: "https://uquv-markaz-navroz.vercel.app/bot-register" } }]
                ]
            };
        }

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

    return res.status(200).send('OK');
}