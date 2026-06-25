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
    if (!message || !message.text) return res.status(200).send('OK');

    const chatId = message.chat.id;
    const text = message.text;
    const firstName = message.from.first_name || "Foydalanuvchi";
    const token = process.env.TELEGRAM_BOT_TOKEN;

    // 🔥 XABAR YUBORISH UCHUN MAXSUS VA XAVFSIZ FUNKSIYA
    const sendMsg = async (msgText, keyboard = null) => {
        try {
            const body = { chat_id: chatId, text: msgText, parse_mode: 'Markdown' };
            if (keyboard) body.reply_markup = keyboard;
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
        } catch (e) {
            console.error("Telegram API da xato:", e);
        }
    };

    // BARCHA NARSANI XAVFSIZ ZONAGA (TRY-CATCH) OLAMIZ
    try {
        await connectDB();

        // 1. QIDIRUV ID SINI AJRATISH (QR KOD UCHUN)
        let payload = null;
        if (text.startsWith('/start ')) {
            payload = text.split(' ')[1].trim();
        }

        // ===============================================
        // AGAR QR KOD BILAN KIRSA
        // ===============================================
        if (payload) {
            // Mongoose xato bermasligi uchun try-catch ichida qidiramiz
            const studentToLink = await Student.findById(payload).catch(() => null);

            if (studentToLink) {
                await Student.updateOne(
                    { _id: studentToLink._id },
                    { $set: { telegramChatId: String(chatId) } }
                );

                const totalLinked = await Student.countDocuments({
                    $or: [{ telegramChatId: chatId }, { telegramChatId: String(chatId) }]
                });

                await sendMsg(
                    `✅ *Yangi profil ulandi!*\n\nTabriklaymiz, *${studentToLink.name}* hisobingizga qo'shildi. Jami: ${totalLinked} ta o'quvchi.`,
                    {
                        keyboard: [
                            [{ text: "👤 Shaxsiy Kabinet", web_app: { url: `https://uquv-markaz-navroz.vercel.app/profile?chatId=${chatId}` } }],
                            [{ text: "📋 Mening ma'lumotlarim" }, { text: "ℹ️ O'quv markaz haqida" }]
                        ],
                        resize_keyboard: true,
                        is_persistent: true
                    }
                );
            } else {
                await sendMsg("❌ Baza bo'yicha bunday o'quvchi topilmadi. Boshqa QR kod bilan urinib ko'ring.");
            }
            return res.status(200).send('OK');
        }

        // ===============================================
        // BARCHA ULANGAN O'QUVCHILARNI QIDIRISH
        // ===============================================
        const linkedStudents = await Student.find({
            $or: [{ telegramChatId: chatId }, { telegramChatId: String(chatId) }]
        });

        // ===============================================
        // 2. ODDIY /start BUYRUG'I
        // ===============================================
        if (text === '/start') {
            if (linkedStudents.length > 0) {
                await sendMsg(
                    `Assalomu alaykum! 🎓\n\nSizning hisobingizga *${linkedStudents.length} ta* o'quvchi ulangan. Pastki menyudan kerakli bo'limni tanlang 👇`,
                    {
                        keyboard: [
                            [{ text: "👤 Shaxsiy Kabinet", web_app: { url: `https://uquv-markaz-navroz.vercel.app/profile?chatId=${chatId}` } }],
                            [{ text: "📋 Mening ma'lumotlarim" }, { text: "ℹ️ O'quv markaz haqida" }]
                        ],
                        resize_keyboard: true,
                        is_persistent: true
                    }
                );
            } else {
                await sendMsg(
                    `Assalomu alaykum, *${firstName}*! 🎓\n\n"G'ulomov Math Group"ga xush kelibsiz. Profilingizni ulash uchun bejigingizdagi QR kodni kameraga tuting yoki pastdan ro'yxatdan o'ting 👇`,
                    {
                        keyboard: [
                            [{ text: "📝 Ro'yxatdan o'tish", web_app: { url: `https://uquv-markaz-navroz.vercel.app/bot-register?chatId=${chatId}` } }],
                            [{ text: "ℹ️ O'quv markaz haqida" }]
                        ],
                        resize_keyboard: true,
                        is_persistent: true
                    }
                );
            }
            return res.status(200).send('OK');
        }

        // ===============================================
        // 3. MA'LUMOTLARIM TUGMASI
        // ===============================================
        if (text === "📋 Mening ma'lumotlarim") {
            if (linkedStudents.length > 0) {
                let msg = `👥 *Sizning hisobingizdagi o'quvchilar (${linkedStudents.length} ta):*\n\n`;
                linkedStudents.forEach((st, idx) => {
                    const regDate = formatDate(st.addedAt);
                    msg += `${idx + 1}. *Ism:* ${st.name}\n📚 *Fanlar:* ${st.group || 'Guruhsiz'}\n📱 *Telefon:* ${st.phone || 'Kiritilmagan'}\n🗓 *Qo'shilgan sana:* ${regDate}\n\n`;
                });
                msg += `_To'lovlarni ko'rish uchun pastdagi "👤 Shaxsiy Kabinet" tugmasini bosing!_`;
                await sendMsg(msg);
            } else {
                await sendMsg("Siz hali ro'yxatdan o'tmagansiz. Bejigingizdagi QR kodni skaner qiling.");
            }
            return res.status(200).send('OK');
        }

        // ===============================================
        // 4. O'QUV MARKAZ HAQIDA TUGMASI
        // ===============================================
        if (text === "ℹ️ O'quv markaz haqida") {
            try {
                await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        photo: "https://uquv-markaz-navroz.vercel.app/banner.jpg",
                        caption: "📐 *Matematika fanidan tajribali va A+ sertifikatlangan ustoz Gʻulomov Navro'z*\n\n🌟 _Biz bilan orzuingiz roʻyobga chiqadi!_\n\n✅ Prezident maktablariga tayyorlov\n✅ Al-Xorazmiy maktablariga tayyorlov\n✅ Ixtisoslashtirilgan maktablarga tayyorlov\n✅ DTM va xalqaro sertifikat imtihonlariga tayyorlov\n\n🏆 *Natijalarimiz:*\n👨‍🎓 6 nafar Al-Xorazmiy maktabi oʻquvchisi\n🏅 15+ nafar xalqaro sertifikat sohiblari\n💯 100+ nafar ixtisoslashtirilgan maktab oʻquvchilari\n\n📍 *Manzil:* Kattaqoʻrgʻon tumani, Kadan chorrahasi, Ziyo Nur oʻquv markazi, “Gʻulomov Math Group” xonasi\n\n📞 *Murojaat uchun:* +998 93 271 70 79\n\n🔥 *QABUL OCHIQ!*\n\n_SIZDAN HARAKAT — BIZDAN NATIJA!_",
                        parse_mode: 'Markdown'
                    })
                });
            } catch (err) {}
            return res.status(200).send('OK');
        }

        // Agar boshqa narsa yozilsa
        await sendMsg("Iltimos, pastki menyu tugmalaridan foydalaning.");
        return res.status(200).send('OK');

    } catch (error) {
        console.error("KODDA XATOLIK YUZ BERDI:", error);
        
        // 🚨 ENGI MUHIM JOYLARDAN BIRI: TIZIM QULASA HAM BOT XABAR YUBORADI
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: "⚠️ *Tizimda vaqtinchalik xatolik yuz berdi.* Iltimos, birozdan so'ng `/start` buyrug'ini bosing.",
                parse_mode: 'Markdown'
            })
        });
        
        return res.status(200).send('OK');
    }
}