import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({}, { strict: false }), 'students');
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }), 'attendances');
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));

const formatDate = (dateString) => {
  if (!dateString) return "Noma'lum";
  const d = new Date(dateString);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};

export default async function handler(req, res) {
    try { await connectDB(); } catch (error) { return res.status(200).send('OK'); }

    // =========================================================
    // 🔥 QO'NG'IROQCHA UCHUN ENG MUKAMMAL GET SO'ROV
    // =========================================================
    if (req.method === 'GET' && req.query.action === 'notifications') {
        try {
            // 1. Keshni o'ldirish (Brauzer va Vercel qotib qolmasligi uchun)
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            
            // 2. ObjectId orqali eng aniq 24 soatlik vaqtni topish (Sana formatiga umuman qaram emasmiz!)
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const objectIdStr = Math.floor(oneDayAgo.getTime() / 1000).toString(16) + "0000000000000000";
            const hexId = new mongoose.Types.ObjectId(objectIdStr);

            const recent = await Student.find({ _id: { $gte: hexId } }).sort({ _id: -1 }).limit(15);
            return res.status(200).json({ success: true, data: recent });
        } catch (err) { return res.status(500).json({ success: false, error: err.message }); }
    }

    // =========================================================
    // TELEGRAM BOT LOGIKASI (POST)
    // =========================================================
    if (req.method !== 'POST') return res.status(200).send('OK');
    
    const update = req.body;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    let chatId, text, firstName, fromId;
    let isCallback = false;
    let callbackQueryId = null;

    if (update.message && update.message.text) {
        chatId = String(update.message.chat.id);
        text = update.message.text;
        firstName = update.message.from.first_name || "O'quvchi";
        fromId = update.message.from.id;
    } else if (update.callback_query) {
        isCallback = true;
        chatId = String(update.callback_query.message.chat.id);
        text = update.callback_query.data;
        firstName = update.callback_query.from.first_name || "O'quvchi";
        fromId = update.callback_query.from.id;
        callbackQueryId = update.callback_query.id;
    } else {
        return res.status(200).send('OK'); 
    }

    let payload = null;
    if (!isCallback && text.startsWith('/start ') && text.length > 7) {
        payload = text.split(' ')[1].trim();
    }

    if (payload) {
        try {
            let studentToLink = null;
            if (mongoose.Types.ObjectId.isValid(payload)) studentToLink = await Student.findById(payload);
            else studentToLink = await Student.findOne({ _id: payload });

            if (studentToLink) {
                await Student.updateOne({ _id: studentToLink._id }, { $set: { telegramChatId: chatId } });
                const totalLinked = await Student.countDocuments({ $or: [ { telegramChatId: chatId }, { telegramChatId: Number(chatId) } ] });

                let teacherDetails = "";
                if(studentToLink.teacherId) {
                  const teacherInfo = await User.findById(studentToLink.teacherId);
                  if(teacherInfo) teacherDetails = `\n👨‍🏫 *Sizning ustozingiz:* ${teacherInfo.fullName || "Noma'lum"}\n📚 *Ustozingiz fani:* ${teacherInfo.subject || "Umumiy fan"}\n`;
                }

                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: `✅ *Yangi profil ulandi!*\n\nTabriklaymiz, *${studentToLink.name}* ham sizning hisobingizga qo'shildi. ${teacherDetails}\nEndi siz jami ${totalLinked} ta o'quvchini nazorat qilasiz.`,
                        parse_mode: 'Markdown',
                        reply_markup: {
                            keyboard: [
                                [{ text: "👤 Shaxsiy Kabinet" }], 
                                [{ text: "📊 Oylik hisobot" }],
                                [{ text: "📋 Mening ma'lumotlarim" }, { text: "ℹ️ O'quv markaz haqida" }],
                                [{ text: "✈️ Telegram" }, { text: "📸 Instagram" }] 
                            ], resize_keyboard: true, is_persistent: true
                        }
                    })
                });
                return res.status(200).send('OK'); 
            }
        } catch (error) { console.log("QR Xato", error); }
    }

    const linkedStudents = await Student.find({ $or: [ { telegramChatId: chatId }, { telegramChatId: Number(chatId) } ] });

    if (linkedStudents.length > 0) {
        let isSubscribed = false;
        const CHANNEL_ID = "@gulomov_math_group"; 

        try {
            const subRes = await fetch(`https://api.telegram.org/bot${token}/getChatMember?chat_id=${CHANNEL_ID}&user_id=${fromId}`);
            const subData = await subRes.json();
            
            if (subData.ok && ['member', 'administrator', 'creator'].includes(subData.result.status)) {
                isSubscribed = true;
            } else {
                isSubscribed = false; 
            }
        } catch (e) { isSubscribed = false; } 

        if (!isSubscribed) {
            if (isCallback && text === "check_sub") {
                await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ callback_query_id: callbackQueryId, text: "❌ Siz hali Telegram kanalga obuna bo'lmadingiz! Kanalga kirib 'Qo'shilish' tugmasini bosing.", show_alert: true })
                });
            } else {
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: "❗️ *Botdan to'liq foydalanish uchun rasmiy sahifalarimizga obuna bo'lishingiz shart!*\n\nIltimos, pastdagi tugmalar orqali tarmoqlarimizga ulaning va *✅ Tasdiqlash* tugmasini bosing.",
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "✈️ Telegram kanal (Majburiy)", url: "https://t.me/gulomov_math_group" }],
                                [{ text: "📸 Instagram profil", url: "https://www.instagram.com/gulomov_math_group/?hl=en" }],
                                [{ text: "✅ Tasdiqlash", callback_data: "check_sub" }]
                            ]
                        }
                    })
                });
            }
            return res.status(200).send('OK'); 
        }

        if (isCallback && text === "check_sub" && isSubscribed) {
            await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callback_query_id: callbackQueryId })
            });
            await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, message_id: update.callback_query.message.message_id })
            });
            
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    chat_id: chatId, 
                    text: "✅ Rahmat! Obuna muvaffaqiyatli tasdiqlandi.\nEndi menyudan bemalol foydalanishingiz mumkin 👇",
                    reply_markup: { 
                        keyboard: [ 
                            [{ text: "👤 Shaxsiy Kabinet" }],
                            [{ text: "📊 Oylik hisobot" }], 
                            [{ text: "📋 Mening ma'lumotlarim" }, { text: "ℹ️ O'quv markaz haqida" }],
                            [{ text: "✈️ Telegram" }, { text: "📸 Instagram" }] 
                        ], resize_keyboard: true, is_persistent: true 
                    }
                })
            });
            return res.status(200).send('OK');
        }
    }
    
    if (isCallback) return res.status(200).send('OK');

    if (text === "👤 Shaxsiy Kabinet") {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chat_id: chatId, 
                text: "🖥 *Shaxsiy kabinetingiz tayyor!*\n\nPastdagi tugmani bosib, hisobingizga kiring 👇", 
                parse_mode: 'Markdown',
                reply_markup: { 
                    inline_keyboard: [ 
                        [{ text: "🚀 Kabinetni ochish", web_app: { url: `https://uquv-markaz-navroz.vercel.app/profile?chatId=${chatId}` } }] 
                    ] 
                } 
            })
        });
        return res.status(200).send('OK');
    }

    if (text === "✈️ Telegram") {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chat_id: chatId, 
                text: "✈️ *Bizning rasmiy Telegram kanalimiz:*\n\nEng so'nggi yangiliklar, dars jarayonlari va natijalar shu yerda!", 
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: [ [{ text: "Kanalga o'tish", url: "https://t.me/gulomov_math_group" }] ] } 
            })
        });
        return res.status(200).send('OK');
    }

    if (text === "📸 Instagram") {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chat_id: chatId, 
                text: "📸 *Bizning rasmiy Instagram sahifamiz:*\n\nEng qiziqarli videolar va hayotiy lahzalarimizni kuzatib boring!", 
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: [ [{ text: "Sahifaga o'tish", url: "https://www.instagram.com/gulomov_math_group/?hl=en" }] ] } 
            })
        });
        return res.status(200).send('OK');
    }

    if (text === "ℹ️ O'quv markaz haqida") {
        const captionText = `📐 *Matematika fanidan tajribali va A+ sertifikatlangan ustoz Gʻulomov Navro'z*\n\n🌟 _Biz bilan orzuingiz roʻyobga chiqadi!_\n\n✅ Prezident maktablariga tayyorlov\n✅ Al-Xorazmiy maktablariga tayyorlov\n✅ Ixtisoslashtirilgan maktablarga tayyorlov\n✅ DTM va xalqaro sertifikat imtihonlariga tayyorlov\n\n🏆 *Natijalarimiz:*\n👨‍🎓 6 nafar Al-Xorazmiy maktabi oʻquvchisi\n🏅 15+ nafar xalqaro sertifikat sohiblari\n💯 100+ nafar ixtisoslashtirilgan maktab oʻquvchilari\n\n📍 *Manzil:* Kattaqoʻrgʻon tumani, Kadan chorrahasi, Ziyo Nur oʻquv markazi\n\n📞 *Murojaat uchun:* +998 93 271 70 79\n\n🔥 *QABUL OCHIQ!*`;
        await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, photo: "https://uquv-markaz-navroz.vercel.app/banner.jpg", caption: captionText, parse_mode: 'Markdown' })
        });
        return res.status(200).send('OK');
    }

    if (text === "📋 Mening ma'lumotlarim") {
        if (linkedStudents.length > 0) {
            let msg = `👥 *Sizning hisobingizdagi o'quvchilar (${linkedStudents.length} ta):*\n\n`;
            for (let i = 0; i < linkedStudents.length; i++) {
                const st = linkedStudents[i];
                let teacherDetails = "Noma'lum";
                if(st.teacherId) {
                  const teacherInfo = await User.findById(st.teacherId);
                  if(teacherInfo) teacherDetails = `${teacherInfo.fullName || "Noma'lum"} (${teacherInfo.subject || "Fan ko'rsatilmagan"})`;
                }
                msg += `${i + 1}. *Ism:* ${st.name}\n👨‍🏫 *Ustozingiz:* ${teacherDetails}\n📚 *Fanlar:* ${st.group || 'Guruhsiz'}\n🗓 *Qo'shilgan sana:* ${formatDate(st.addedAt)}\n\n`;
            }
            msg += `_To'lovlarni ko'rish va hisoblarni boshqarish uchun pastdagi "👤 Shaxsiy Kabinet" tugmasini bosing!_`;
            
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' })
            });
        }
        return res.status(200).send('OK');
    }

    if (text === "📊 Oylik hisobot" || text === "/stat") {
        if (linkedStudents.length > 0) {
            const now = new Date();
            const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const monthNames = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
            const monthAttendances = await Attendance.find({ date: { $regex: `^${currentMonthPrefix}` } });

            let msg = `📊 *${monthNames[now.getMonth()]} oyi uchun umumiy hisobot:*\n\n`;
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
        }
        return res.status(200).send('OK');
    }

    if (text === '/start') {
        if (linkedStudents.length > 0) {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    chat_id: chatId, 
                    text: `Assalomu alaykum! 🎓\n\nSizning hisobingizga *${linkedStudents.length} ta* o'quvchi ulangan. Pastki menyudan kerakli bo'limni tanlang 👇`, 
                    reply_markup: { 
                        keyboard: [ 
                            [{ text: "👤 Shaxsiy Kabinet" }], 
                            [{ text: "📊 Oylik hisobot" }], 
                            [{ text: "📋 Mening ma'lumotlarim" }, { text: "ℹ️ O'quv markaz haqida" }],
                            [{ text: "✈️ Telegram" }, { text: "📸 Instagram" }] 
                        ], resize_keyboard: true, is_persistent: true 
                    }, 
                    parse_mode: 'Markdown' 
                })
            });
        } else {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    chat_id: chatId, 
                    text: `Assalomu alaykum, *${firstName}*! 🎓\n\n"G'ulomov Math Group"ga xush kelibsiz. Profilingizni ulash uchun bejigingizdagi QR kodni kameraga tuting yoki pastdan ro'yxatdan o'ting 👇`, 
                    reply_markup: { 
                        keyboard: [ 
                            [{ text: "📝 Ro'yxatdan o'tish", web_app: { url: `https://uquv-markaz-navroz.vercel.app/bot-register?chatId=${chatId}` } }], 
                            [{ text: "ℹ️ O'quv markaz haqida" }],
                            [{ text: "✈️ Telegram" }, { text: "📸 Instagram" }] 
                        ], resize_keyboard: true, is_persistent: true 
                    }, 
                    parse_mode: 'Markdown' 
                })
            });
        }
    }

    return res.status(200).send('OK');
}