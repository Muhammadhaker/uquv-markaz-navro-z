import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({}, { strict: false }), 'students');
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }), 'attendances');
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));

// 🔥 YANGI: Bot qadamlarini xotirada saqlash uchun maxsus model
const botStateSchema = new mongoose.Schema({
  chatId: { type: String, required: true },
  step: { type: String, default: 'NONE' },
  name: { type: String, default: '' },
  phone: { type: String, default: '' }
});
const BotState = mongoose.models.BotState || mongoose.model('BotState', botStateSchema);

const formatDate = (dateString) => {
  if (!dateString) return "Noma'lum";
  const d = new Date(dateString);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(200).send('OK');

    const update = req.body;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    try {
        await connectDB();
    } catch (error) {
        console.error("MongoDB ulanishda xato:", error);
        return res.status(200).send('OK');
    }

    // =========================================================
    // 🔥 YANGI MANTIQ: TUGMALAR BOSILGANDA (USTOZ TANLASH)
    // =========================================================
    if (update.callback_query) {
        const callbackQuery = update.callback_query;
        const chatId = String(callbackQuery.message.chat.id);
        const data = callbackQuery.data;

        if (data.startsWith('teacher_')) {
            const teacherId = data.split('_')[1];
            const state = await BotState.findOne({ chatId });

            if (state && state.step === 'AWAITING_TEACHER') {
                const teacher = await User.findById(teacherId);
                
                // O'quvchini yaratamiz va tanlangan ustozga bog'laymiz!
                await Student.create({
                    name: state.name,
                    parentName: "Kiritilmagan",
                    phone: state.phone,
                    telegramChatId: chatId,
                    teacherId: teacherId, 
                    group: "Yangi ro'yxatdan o'tgan",
                    groupsData: [{ name: "Yangi", price: 300000 }],
                    addedAt: new Date(),
                    exceptionMonths: []
                });

                // Xotirani tozalaymiz
                await BotState.deleteOne({ chatId });

                const teacherName = teacher?.fullName || teacher?.username || "Ustoz";
                
                // Menyuni qaytarib tabriklaymiz
                const keyboard = {
                    keyboard: [
                        [{ text: "👤 Shaxsiy Kabinet", web_app: { url: `https://uquv-markaz-navroz.vercel.app/profile?chatId=${chatId}` } }],
                        [{ text: "📊 Oylik hisobot" }],
                        [{ text: "📋 Mening ma'lumotlarim" }, { text: "ℹ️ O'quv markaz haqida" }]
                    ],
                    resize_keyboard: true, is_persistent: true
                };

                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        chat_id: chatId, 
                        text: `🎉 *Tabriklaymiz, ${state.name}!*\n\nSiz *${teacherName}* guruhiga muvaffaqiyatli ro'yxatdan o'tdingiz.\n\n_Pastdagi menyudan foydalanishingiz mumkin 👇_`, 
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    })
                });
            }
        }
        
        await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackQuery.id })
        });
        
        return res.status(200).send('OK');
    }

    if (!update.message || !update.message.text) return res.status(200).send('OK');

    const message = update.message;
    const chatId = String(message.chat.id);
    const text = message.text;
    const firstName = message.from.first_name || "O'quvchi";

    let payload = null;
    if (text.startsWith('/start ') && text.length > 7) {
        payload = text.split(' ')[1].trim();
    }

    // =========================================================
    // 🔥 YANGI MANTIQ: QADAM-BA-QADAM RO'YXATDAN O'TISH
    // =========================================================
    const state = await BotState.findOne({ chatId });

    if (text === "📝 Ro'yxatdan o'tish" || text === "/register") {
        await BotState.findOneAndUpdate(
            { chatId },
            { step: 'AWAITING_NAME', name: '', phone: '' },
            { upsert: true, new: true }
        );
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chat_id: chatId, 
                text: "✍️ Iltimos, to'liq *Ism va Familiyangizni* kiriting:\n\n_(Masalan: Aliyev Vali)_", 
                parse_mode: 'Markdown', 
                reply_markup: { remove_keyboard: true } 
            })
        });
        return res.status(200).send('OK');
    }

    if (state) {
        if (state.step === 'AWAITING_NAME') {
            state.name = text;
            state.step = 'AWAITING_PHONE';
            await state.save();
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    chat_id: chatId, 
                    text: "📱 Zo'r! Endi *telefon raqamingizni* kiriting:\n\n_(Masalan: +998901234567)_", 
                    parse_mode: 'Markdown' 
                })
            });
            return res.status(200).send('OK');
        }

        if (state.step === 'AWAITING_PHONE') {
            state.phone = text;
            state.step = 'AWAITING_TEACHER';
            await state.save();

            const teachers = await User.find({ role: 'teacher' });
            if (teachers.length === 0) {
                await BotState.deleteOne({ chatId });
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: "Kechirasiz, tizimda hozircha ustozlar yo'q." })
                });
                return res.status(200).send('OK');
            }

            const inlineKeyboard = teachers.map(t => [
                { text: `👨‍🏫 ${t.fullName || t.username}`, callback_data: `teacher_${t._id}` }
            ]);

            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    chat_id: chatId, 
                    text: "🎓 Ajoyib! Endi qaysi *Fanga (Ustozga)* yozilmoqchisiz?\nQuyidagilardan birini tanlang:", 
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: inlineKeyboard }
                })
            });
            return res.status(200).send('OK');
        }
    }

    // =========================================================
    // ESKI MANTIQ: QR KOD ORQALI RO'YXATDAN O'TISH
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
                                [{ text: "📊 Oylik hisobot" }],
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
    
    if (text === "ℹ️ O'quv markaz haqida") {
        const captionText = `📐 *Matematika fanidan tajribali va A+ sertifikatlangan ustoz Gʻulomov Navro'z*\n\n🌟 _Biz bilan orzuingiz roʻyobga chiqadi!_\n\n✅ Prezident maktablariga tayyorlov\n✅ Al-Xorazmiy maktablariga tayyorlov\n✅ Ixtisoslashtirilgan maktablarga tayyorlov\n✅ DTM va xalqaro sertifikat imtihonlariga tayyorlov\n\n🏆 *Natijalarimiz:*\n👨‍🎓 6 nafar Al-Xorazmiy maktabi oʻquvchisi\n🏅 15+ nafar xalqaro sertifikat sohiblari\n💯 100+ nafar ixtisoslashtirilgan maktab oʻquvchilari\n\n📍 *Manzil:* Kattaqoʻrgʻon tumani, Kadan chorrahasi, Ziyo Nur oʻquv markazi, “Gʻulomov Math Group” xonasi\n\n📞 *Murojaat uchun:* +998 93 271 70 79\n\n🔥 *QABUL OCHIQ!*\n\n_SIZDAN HARAKAT — BIZDAN NATIJA!_`;
        
        await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, photo: "https://uquv-markaz-navroz.vercel.app/banner.jpg", caption: captionText, parse_mode: 'Markdown' })
        });
        return res.status(200).send('OK');
    }

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

    if (text === "📊 Oylik hisobot" || text === "/stat") {
        if (linkedStudents.length > 0) {
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const currentMonthPrefix = `${yyyy}-${mm}`;

            const monthNames = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
            const monthName = monthNames[now.getMonth()];

            const monthAttendances = await Attendance.find({ date: { $regex: `^${currentMonthPrefix}` } });

            let msg = `📊 *${monthName} oyi uchun umumiy hisobot:*\n\n`;

            linkedStudents.forEach(st => {
                let totalClasses = 0, keldi = 0, kechikdi = 0, kelmadi = 0;

                monthAttendances.forEach(att => {
                    const record = att.records?.find(r => String(r.studentId) === String(st._id));
                    if (record) {
                        totalClasses++;
                        if (record.status === 'keldi' || record.status === 'ketdi') keldi++;
                        else if (record.status === 'kechikdi') kechikdi++;
                        else if (record.status === 'kelmadi') kelmadi++;
                    }
                });

                msg += `👤 *O'quvchi:* ${st.name}\n📚 *Fan:* ${st.group || 'Guruhsiz'}\n🗓 *Jami bo'lgan darslar:* ${totalClasses} ta\n✅ *Darsda qatnashdi:* ${keldi} marta\n⏳ *Kechikib keldi:* ${kechikdi} marta\n❌ *Dars qoldirdi:* ${kelmadi} marta\n〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
            });

            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' })
            });
        } else {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: "Sizning hisobingizga hech qaysi o'quvchi ulanmagan." })
            });
        }
        return res.status(200).send('OK');
    }

    if (text === '/start') {
        let replyText = "";
        let keyboard = {};

        if (linkedStudents.length > 0) {
            replyText = `Assalomu alaykum! 🎓\n\nSizning hisobingizga *${linkedStudents.length} ta* o'quvchi ulangan. Pastki menyudan kerakli bo'limni tanlang 👇`;
            keyboard = {
                keyboard: [
                    [{ text: "👤 Shaxsiy Kabinet", web_app: { url: `https://uquv-markaz-navroz.vercel.app/profile?chatId=${chatId}` } }],
                    [{ text: "📊 Oylik hisobot" }],
                    [{ text: "📋 Mening ma'lumotlarim" }, { text: "ℹ️ O'quv markaz haqida" }]
                ],
                resize_keyboard: true, is_persistent: true
            };
        } else {
            replyText = `Assalomu alaykum, *${firstName}*! 🎓\n\n"G'ulomov Math Group"ga xush kelibsiz. Profilingizni ulash uchun bejigingizdagi QR kodni kameraga tuting yoki pastdan ro'yxatdan o'ting 👇`;
            keyboard = {
                keyboard: [
                    [{ text: "📝 Ro'yxatdan o'tish" }], // Botni ichida ro'yxatdan o'tish
                    [{ text: "ℹ️ O'quv markaz haqida" }]
                ],
                resize_keyboard: true, is_persistent: true
            };
        }

        try {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: replyText, reply_markup: keyboard, parse_mode: 'Markdown' })
            });
        } catch (error) { console.error("Telegram API xatosi:", error); }
    }

    return res.status(200).send('OK');
}