import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({}, { strict: false }), 'students');

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

    // 1-QISM: ℹ️ O'QUV MARKAZ HAQIDA TUGMASI (RASM BILAN)
    if (text === "ℹ️ O'quv markaz haqida") {
        
        // Rasm ostidagi chiroyli yozuv
        const captionText = `📐 *Matematika fanidan tajribali va A+ sertifikatlangan ustoz Gʻulomov*\n\n🌟 _Biz bilan orzuingiz roʻyobga chiqadi!_\n\n✅ Prezident maktablariga tayyorlov\n✅ Al-Xorazmiy maktablariga tayyorlov\n✅ Ixtisoslashtirilgan maktablarga tayyorlov\n✅ DTM va xalqaro sertifikat imtihonlariga tayyorlov\n\n🏆 *Natijalarimiz:*\n👨‍🎓 6 nafar Al-Xorazmiy maktabi oʻquvchisi\n🏅 15+ nafar xalqaro sertifikat sohiblari\n💯 100+ nafar ixtisoslashtirilgan maktab oʻquvchilari\n\n📍 *Manzil:* Kattaqoʻrgʻon tumani, Kadan chorrahasi, Ziyo Nur oʻquv markazi, “Gʻulomov Math Group” xonasi\n\n📞 *Murojaat uchun:* +998 93 271 70 79\n\n🔥 *QABUL OCHIQ!*\n\n_SIZDAN HARAKAT — BIZDAN NATIJA!_`;
        
        // Telegram API orqali rasmni yuborish
        await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chat_id: chatId, 
                photo: "https://uquv-markaz-navroz.vercel.app/banner.jpg", // Tepadagi URL dan rasmni oladi
                caption: captionText, 
                parse_mode: 'Markdown' 
            })
        });
        return res.status(200).send('OK');
    }

    // 2-QISM: 📋 MENING MA'LUMOTLARIM TUGMASI
    if (text === "📋 Mening ma'lumotlarim") {
        if (existingStudent) {
            const regDate = formatDate(existingStudent.addedAt);
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

    // 3-QISM: /start BUYRUG'I
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
            // Yangi kelgan o'quvchilar uchun matn G'ulomov Math Group ga o'zgardi
            replyText = `Assalomu alaykum, *${firstName}*! 🎓\n\n"G'ulomov Math Group"ga xush kelibsiz. Quyidagi menyudan kerakli bo'limni tanlang 👇`;
            
            keyboard = {
                keyboard: [
                    [{ text: "📝 Ro'yxatdan o'tish", web_app: { url: `https://uquv-markaz-navroz.vercel.app/bot-register?chatId=${chatId}` } }],
                    [{ text: "ℹ️ O'quv markaz haqida" }]
                ],
                resize_keyboard: true,
                is_persistent: true
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