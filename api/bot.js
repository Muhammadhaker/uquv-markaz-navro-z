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
    
    // 🔥 1. QR koddan kelgan YASHIRIN ID ni tutib olish
    let payload = null;
    if (text.startsWith('/start ')) {
        payload = text.split(' ')[1]; // "/start 64b2c..." -> ID ni oladi
    }

    let existingStudent = await Student.findOne({ 
        $or: [
            { telegramChatId: chatId },
            { telegramChatId: String(chatId) },
            { telegramChatId: Number(chatId) }
        ] 
    });

    // 🔥 2. AGAR FOYDALANUVCHI QR KOD O'QITIB KIRSA
    if (payload) {
        try {
            // Shu yashirin ID ga ega o'quvchini qidiradi
            const studentToLink = await Student.findById(payload);
            if (studentToLink) {
                // Topilsa, shu odamning Telegram IDsini profilga bog'lab qo'yadi!
                studentToLink.telegramChatId = String(chatId);
                await studentToLink.save();
                existingStudent = studentToLink; 
                
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: `✅ *Profil muvaffaqiyatli ulandi!*\n\nTabriklaymiz, *${existingStudent.name}*, ma'lumotlaringizni endi shu yerdan kuzatib borishingiz mumkin.`,
                        parse_mode: 'Markdown'
                    })
                });
            }
        } catch (error) {
            console.log("Xato QR kod formati", error);
        }
    }

    // 3-QISM: ℹ️ O'QUV MARKAZ HAQIDA TUGMASI
    if (text === "ℹ️ O'quv markaz haqida") {
        const captionText = `📐 *Matematika fanidan tajribali va A+ sertifikatlangan ustoz Gʻulomov Navro'z*\n\n🌟 _Biz bilan orzuingiz roʻyobga chiqadi!_\n\n✅ Prezident maktablariga tayyorlov\n✅ Al-Xorazmiy maktablariga tayyorlov\n✅ Ixtisoslashtirilgan maktablarga tayyorlov\n✅ DTM va xalqaro sertifikat imtihonlariga tayyorlov\n\n🏆 *Natijalarimiz:*\n👨‍🎓 6 nafar Al-Xorazmiy maktabi oʻquvchisi\n🏅 15+ nafar xalqaro sertifikat sohiblari\n💯 100+ nafar ixtisoslashtirilgan maktab oʻquvchilari\n\n📍 *Manzil:* Kattaqoʻrgʻon tumani, Kadan chorrahasi, Ziyo Nur oʻquv markazi, “Gʻulomov Math Group” xonasi\n\n📞 *Murojaat uchun:* +998 93 271 70 79\n\n🔥 *QABUL OCHIQ!*\n\n_SIZDAN HARAKAT — BIZDAN NATIJA!_`;
        
        await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chat_id: chatId, 
                photo: "https://uquv-markaz-navroz.vercel.app/banner.jpg", 
                caption: captionText, 
                parse_mode: 'Markdown' 
            })
        });
        return res.status(200).send('OK');
    }

    // 4-QISM: 📋 MENING MA'LUMOTLARIM TUGMASI
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

    // 5-QISM: /start BUYRUG'I
    if (text === '/start' || text.startsWith('/start ')) {
        let replyText = "";
        let keyboard = {};

        if (existingStudent) {
            replyText = `Assalomu alaykum, *${existingStudent.name}*! 🎓\n\nPastki menyudan kerakli bo'limni tanlang 👇`;
            
            keyboard = {
                keyboard: [
                    [{ text: "👤 Shaxsiy Kabinet", web_app: { url: `https://uquv-markaz-navroz.vercel.app/profile?chatId=${chatId}` } }],
                    [{ text: "📋 Mening ma'lumotlarim" }, { text: "ℹ️ O'quv markaz haqida" }]
                ],
                resize_keyboard: true,
                is_persistent: true
            };
        } else {
            replyText = `Assalomu alaykum, *${firstName}*! 🎓\n\n"G'ulomov Math Group"ga xush kelibsiz. Profilingizni ulash uchun bejigingizdagi QR kodni kameraga tuting yoki pastdan ro'yxatdan o'ting 👇`;
            
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