import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({}, { strict: false }), 'students');
// 🔥 Davomat hisobotini olish uchun Attendance sxemasini ham chaqirib olamiz
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }), 'attendances');

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

    const chatId = String(message.chat.id);
    const text = message.text;
    const firstName = message.from.first_name || "O'quvchi";

    try {
        await connectDB();
    } catch (error) {
        console.error("MongoDB ulanishda xato:", error);
        return res.status(200).send('OK');
    }

    let payload = null;
    if (text.startsWith('/start ')) {
        payload = text.split(' ')[1].trim();
    }

    // =========================================================
    // 1-QISM: QR KOD ORQALI RO'YXATDAN O'TISH
    // =========================================================
    if (payload) {
        try {
            let studentToLink = null;
            if (mongoose.Types.ObjectId.isValid(payload)) {
                studentToLink = await Student.findById(payload);
            } else {
                studentToLink = await Student.findOne({ _id: payload });
            }

            if (studentToLink) {
                await Student.updateOne(
                    { _id: studentToLink._id },
                    { $set: { telegramChatId: chatId } }
                );
                
                const totalLinked = await Student.countDocuments({ 
                    $or: [ { telegramChatId: chatId }, { telegramChatId: Number(chatId) } ] 
                });

                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: `✅ *Yangi profil ulandi!*\n\nTabriklaymiz, *${studentToLink.name}* ham sizning hisobingizga qo'shildi. Endi siz ${totalLinked} ta o'quvchini nazorat qilasiz.`,
                        parse_mode: 'Markdown',
                        reply_markup: {
                            keyboard: [
                                [{ text: "👤 Shaxsiy Kabinet", web_app: { url: `https://uquv-markaz-navroz.vercel.app/profile?chatId=${chatId}` } }],
                                [{ text: "📊 Oylik hisobot" }], // 🔥 Yangi tugma qo'shildi
                                [{ text: "📋 Mening ma'lumotlarim" }, { text: "ℹ️ O'quv markaz haqida" }]
                            ],
                            resize_keyboard: true,
                            is_persistent: true
                        }
                    })
                });
                return res.status(200).send('OK'); 
            } else {
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: "❌ Kechirasiz, bunday o'quvchi bazadan topilmadi. Boshqa QR kod skaner qiling." })
                });
            }
        } catch (error) {
            console.log("Xato QR kod formati", error);
        }
    }

    // =========================================================
    // ODDIY KOMANDALAR UCHUN (Barcha ulangan o'quvchilarni olish)
    // =========================================================
    const linkedStudents = await Student.find({ 
        $or: [ { telegramChatId: chatId }, { telegramChatId: Number(chatId) } ] 
    });
    
    // 2-QISM: ℹ️ O'QUV MARKAZ HAQIDA TUGMASI
    if (text === "ℹ️ O'quv markaz haqida") {
        const captionText = `📐 *Matematika fanidan tajribali va A+ sertifikatlangan ustoz Gʻulomov Navro'z*\n\n🌟 _Biz bilan orzuingiz roʻyobga chiqadi!_\n\n✅ Prezident maktablariga tayyorlov\n✅ Al-Xorazmiy maktablariga tayyorlov\n✅ Ixtisoslashtirilgan maktablarga tayyorlov\n✅ DTM va xalqaro sertifikat imtihonlariga tayyorlov\n\n🏆 *Natijalarimiz:*\n👨‍🎓 6 nafar Al-Xorazmiy maktabi oʻquvchisi\n🏅 15+ nafar xalqaro sertifikat sohiblari\n💯 100+ nafar ixtisoslashtirilgan maktab oʻquvchilari\n\n📍 *Manzil:* Kattaqoʻrgʻon tumani, Kadan chorrahasi, Ziyo Nur oʻquv markazi, “Gʻulomov Math Group” xonasi\n\n📞 *Murojaat uchun:* +998 93 271 70 79\n\n🔥 *QABUL OCHIQ!*\n\n_SIZDAN HARAKAT — BIZDAN NATIJA!_`;
        
        await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, photo: "https://uquv-markaz-navroz.vercel.app/banner.jpg", caption: captionText, parse_mode: 'Markdown' })
        });
        return res.status(200).send('OK');
    }

    // 3-QISM: 📋 MENING MA'LUMOTLARIM TUGMASI
    if (text === "📋 Mening ma'lumotlarim") {
        if (linkedStudents.length > 0) {
            let msg = `👥 *Sizning hisobingizdagi o'quvchilar (${linkedStudents.length} ta):*\n\n`;
            linkedStudents.forEach((st, idx) => {
                const regDate = formatDate(st.addedAt);
                msg += `${idx + 1}. *Ism:* ${st.name}\n📚 *Fanlar:* ${st.group || 'Guruhsiz'}\n📱 *Telefon:* ${st.phone || 'Kiritilmagan'}\n🗓 *Qo'shilgan sana:* ${regDate}\n\n`;
            });
            msg += `_To'lovlarni ko'rish va hisoblarni boshqarish uchun pastdagi "👤 Shaxsiy Kabinet" tugmasini bosing!_`;
            
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' })
            });
        } else {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: "Siz hali ro'yxatdan o'tmagansiz. Bejigingizdagi QR kodni skaner qiling." })
            });
        }
        return res.status(200).send('OK');
    }

    // 🔥 4-QISM: 📊 OYLIK HISOBOT TUGMASI (/stat komandasi uchun ham ishlaydi)
    if (text === "📊 Oylik hisobot" || text === "/stat") {
        if (linkedStudents.length > 0) {
            // Hozirgi oy va yilni aniqlaymiz
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0'); // Masalan: "06"
            const currentMonthPrefix = `${yyyy}-${mm}`; // "2026-06" formatida

            const monthNames = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
            const monthName = monthNames[now.getMonth()];

            // Shu oyda bo'lgan barcha davomatlarni qidirib topamiz
            const monthAttendances = await Attendance.find({ date: { $regex: `^${currentMonthPrefix}` } });

            let msg = `📊 *${monthName} oyi uchun umumiy hisobot:*\n\n`;

            // Har bir o'quvchi uchun hisoblaymiz
            linkedStudents.forEach(st => {
                let totalClasses = 0;
                let keldi = 0;
                let kechikdi = 0;
                let kelmadi = 0;

                monthAttendances.forEach(att => {
                    const record = att.records?.find(r => String(r.studentId) === String(st._id));
                    if (record) {
                        totalClasses++;
                        // "ketdi" statusida ham o'quvchi darsga kelgan hisoblanadi
                        if (record.status === 'keldi' || record.status === 'ketdi') keldi++;
                        else if (record.status === 'kechikdi') kechikdi++;
                        else if (record.status === 'kelmadi') kelmadi++;
                    }
                });

                msg += `👤 *O'quvchi:* ${st.name}\n`;
                msg += `📚 *Fan:* ${st.group || 'Guruhsiz'}\n`;
                msg += `🗓 *Jami bo'lgan darslar:* ${totalClasses} ta\n`;
                msg += `✅ *Darsda qatnashdi:* ${keldi} marta\n`;
                msg += `⏳ *Kechikib keldi:* ${kechikdi} marta\n`;
                msg += `❌ *Dars qoldirdi:* ${kelmadi} marta\n`;
                msg += `〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
            });

            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' })
            });
        } else {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: "Sizning hisobingizga hech qaysi o'quvchi ulanmagan. Iltimos QR-kodni skaner qiling." })
            });
        }
        return res.status(200).send('OK');
    }

    // 5-QISM: /start BUYRUG'I
    if (text === '/start') {
        let replyText = "";
        let keyboard = {};

        if (linkedStudents.length > 0) {
            replyText = `Assalomu alaykum! 🎓\n\nSizning hisobingizga *${linkedStudents.length} ta* o'quvchi ulangan. Pastki menyudan kerakli bo'limni tanlang 👇`;
            keyboard = {
                keyboard: [
                    [{ text: "👤 Shaxsiy Kabinet", web_app: { url: `https://uquv-markaz-navroz.vercel.app/profile?chatId=${chatId}` } }],
                    [{ text: "📊 Oylik hisobot" }], // 🔥 Yangi tugma bu yerga ham qo'shildi
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
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: replyText, reply_markup: keyboard, parse_mode: 'Markdown' })
            });
        } catch (error) {
            console.error("Telegram API xatosi:", error);
        }
    }

    return res.status(200).send('OK');
}