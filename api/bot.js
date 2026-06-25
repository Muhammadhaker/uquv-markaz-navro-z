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
    const firstName = message.from.first_name || "Mijoz";

    await connectDB();
    
    // QR koddan kelgan YASHIRIN ID ni tutib olish
    let payload = null;
    if (text.startsWith('/start ')) {
        payload = text.split(' ')[1];
    }

    // 🔥 O'ZGARTIRISH: findOne o'rniga find() ishlatdik. Barcha ulangan profillarni topadi!
    let existingStudents = await Student.find({ 
        $or: [
            { telegramChatId: chatId },
            { telegramChatId: String(chatId) },
            { telegramChatId: Number(chatId) }
        ] 
    });

    // 1-QISM: YANGI QR KOD O'QITILGANDA
    if (payload) {
        try {
            const studentToLink = await Student.findById(payload);
            if (studentToLink) {
                // Tekshiramiz: Bu o'quvchi avval aynan shu odamga ulanganmi?
                const isAlreadyLinked = existingStudents.some(s => String(s._id) === String(studentToLink._id));
                
                if (!isAlreadyLinked) {
                    studentToLink.telegramChatId = String(chatId);
                    await studentToLink.save();
                    
                    existingStudents.push(studentToLink); // Yangi o'quvchini ro'yxatga qo'shamiz
                    
                    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: `✅ *Yangi profil ulandi!*\n\nTabriklaymiz, *${studentToLink.name}* ham sizning hisobingizga qo'shildi. Endi siz ${existingStudents.length} ta o'quvchini nazorat qilasiz.`,
                            parse_mode: 'Markdown'
                        })
                    });
                } else {
                    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: `⚠️ *Bu profil allaqachon sizga ulangan!* (${studentToLink.name})`,
                            parse_mode: 'Markdown'
                        })
                    });
                }
            }
        } catch (error) {
            console.log("Xato QR kod formati", error);
        }
    }

    // 2-QISM: O'QUV MARKAZ HAQIDA TUGMASI
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

    // 3-QISM: MENING MA'LUMOTLARIM TUGMASI (RO'YXAT)
    if (text === "📋 Mening ma'lumotlarim") {
        if (existingStudents.length > 0) {
            // 🔥 Hamma bolalarni bittama-bitta ro'yxat qilib yozadi
            let msg = `👥 *Sizning hisobingizdagi o'quvchilar (${existingStudents.length} ta):*\n\n`;
            
            existingStudents.forEach((st, index) => {
                const regDate = formatDate(st.addedAt);
                msg += `*${index + 1}. Ism:* ${st.name}\n📚 *Fanlar:* ${st.group || 'Guruhsiz'}\n📱 *Telefon:* ${st.phone}\n🗓 *Qo'shilgan sana:* ${regDate}\n\n`;
            });
            
            msg += `_To'lovlarni ko'rish va hisoblarni boshqarish uchun pastdagi "👤 Shaxsiy Kabinet" tugmasini bosing!_`;

            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' })
            });
        } else {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: "Siz hali ro'yxatdan o'tmagansiz. Iltimos, bejikingizdagi QR kodni o'qiting." })
            });
        }
        return res.status(200).send('OK');
    }

    // 4-QISM: /start BUYRUG'I
    if (text === '/start' || text.startsWith('/start ')) {
        let replyText = "";
        let keyboard = {};

        if (existingStudents.length > 0) {
            replyText = `Assalomu alaykum! 🎓\n\nSizning hisobingizga *${existingStudents.length} ta o'quvchi* ulangan. Pastki menyudan kerakli bo'limni tanlang 👇`;
            
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