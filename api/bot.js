import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({}, { strict: false }), 'students');

// Yordamchi funksiya: Sanani chiroyli formatlash (Masalan: 19.06.2026)
const formatDate = (dateString) => {
  if (!dateString) return "Noma'lum";
  const d = new Date(dateString);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(200).send('OK');

    const { message } = req.body;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!message || !message.text) return res.status(200).send('OK');

    const chatId = message.chat.id;
    const text = message.text;
    const firstName = message.from.first_name || "O'quvchi";

    await connectDB();
    
    // SUPER QIDIRUV
    const existingStudent = await Student.findOne({ 
        $or: [
            { telegramChatId: chatId },
            { telegramChatId: String(chatId) },
            { telegramChatId: Number(chatId) }
        ] 
    });

    // 1-QISM: Profil tugmasi bosilganda
    if (text === "📋 Mening ma'lumotlarim") {
        if (existingStudent) {
            // Sanani olamiz va formatlaymiz
            const regDate = formatDate(existingStudent.addedAt);
            
            // Xabarga qo'shib yuboramiz
            const msg = `👤 *Sizning profilingiz:*\n\n🎓 *Ism:* ${existingStudent.name}\n📚 *Fanlar:* ${existingStudent.group}\n📱 *Telefon:* ${existingStudent.phone}\n🗓 *Ro'yxatdan o'tgan sana:* ${regDate}\n\n_To'lov holatini ko'rish uchun pastdagi "👤 Shaxsiy Kabinet" tugmasini bosing!_`;
            
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' })
            });
        } else {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: "Siz hali ro'yxatdan o'tmagansiz. /start buyrug'ini bosing." })
            });
        }
        return res.status(200).send('OK');
    }

    // 2-QISM: /start buyrug'i berilganda
    if (text === '/start') {
        let replyText = "";
        let keyboard = {};

        if (existingStudent) {
            replyText = `Assalomu alaykum, *${existingStudent.name}*! 🎓\n\nPastki menyudan kerakli bo'limni tanlang 👇`;
            
            keyboard = {
                keyboard: [
                    [{ text: "👤 Shaxsiy Kabinet", web_app: { url: `https://uquv-markaz-navroz.vercel.app/profile?chatId=${chatId}` } }],
                    [{ text: "📋 Mening ma'lumotlarim" }]
                ],
                resize_keyboard: true,
                is_persistent: true
            };
        } else {
            replyText = `Assalomu alaykum, *${firstName}*! 🎓\n\nNavro'z O'quv Markaziga xush kelibsiz. Ro'yxatdan o'tish uchun quyidagi tugmani bosing:`;
            
            keyboard = {
                inline_keyboard: [
                    [{ text: "📝 Ro'yxatdan o'tish", web_app: { url: `https://uquv-markaz-navroz.vercel.app/bot-register?chatId=${chatId}` } }]
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