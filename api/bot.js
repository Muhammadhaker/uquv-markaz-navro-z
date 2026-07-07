import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({}, { strict: false }), 'students');
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }), 'attendances');
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));
const Payment = mongoose.models.Payment || mongoose.model('Payment', new mongoose.Schema({}, { strict: false }), 'payments');
const Expense = mongoose.models.Expense || mongoose.model('Expense', new mongoose.Schema({}, { strict: false }), 'expenses');
const BotAdmin = mongoose.models.BotAdmin || mongoose.model('BotAdmin', new mongoose.Schema({ chatId: String }), 'bot_admins');

const formatDate = (dateString) => {
  if (!dateString) return "Noma'lum";
  const d = new Date(dateString);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};

const setupChatUI = async (chatId, token) => {
  try {
      await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              chat_id: chatId,
              menu_button: { type: "web_app", text: "Shaxsiy Kabinet", web_app: { url: `https://uquv-markaz-navroz.vercel.app/profile?chatId=${chatId}` } }
          })
      });
  } catch (e) { console.log(e); }
};

export default async function handler(req, res) {
    try { await connectDB(); } catch (error) { return res.status(200).send('OK'); }

    if (req.method === 'GET' && req.query.action === 'notifications') {
        try {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const objectIdStr = Math.floor(oneDayAgo.getTime() / 1000).toString(16) + "0000000000000000";
            const hexId = new mongoose.Types.ObjectId(objectIdStr);
            const recent = await Student.find({ _id: { $gte: hexId } }).sort({ _id: -1 }).limit(15);
            return res.status(200).json({ success: true, data: recent });
        } catch (err) { return res.status(500).json({ success: false, error: err.message }); }
    }

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
        
        fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackQueryId })
        }).catch(()=>{});

        // 🔥 YANGI LOGIKA: Tugma bosilganda o'sha eski xabarni o'chirib yuboramiz (Tepada qolib ketmasligi uchun)
        fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, message_id: update.callback_query.message.message_id })
        }).catch(()=>{});
    } else {
        return res.status(200).send('OK'); 
    }

    let isAdminActive = false;
    if (chatId) {
        const adminDoc = await BotAdmin.findOne({ chatId });
        if (adminDoc) isAdminActive = true;
    }

    const adminMenuMarkup = {
        inline_keyboard: [
            [{ text: "📊 Umumiy statistika", callback_data: "admin_stats" }],
            [{ text: "✅ Ulanganlar", callback_data: "admin_connected" }, { text: "❌ Ulanmaganlar", callback_data: "admin_unconnected" }],
            [{ text: "📢 Barchaga xabar yuborish", callback_data: "admin_broadcast_info" }],
            [{ text: "💰 Joriy oy moliyasi", callback_data: "admin_finance" }],
            [{ text: "🚪 Paneldan chiqish", callback_data: "admin_logout" }]
        ]
    };

    const getInlineMenu = (cId) => ({
        inline_keyboard: [
            [{ text: "🚀 Shaxsiy Kabinetni ochish", web_app: { url: `https://uquv-markaz-navroz.vercel.app/profile?chatId=${cId}` } }],
            [{ text: "📊 Oylik hisobot", callback_data: "stat" }, { text: "📋 Ma'lumotlarim", callback_data: "info" }],
            [{ text: "ℹ️ Markaz haqida", callback_data: "about" }],
            [{ text: "✈️ Telegram", url: "https://t.me/gulomov_math_group" }, { text: "📸 Instagram", url: "https://www.instagram.com/gulomov_math_group/?hl=en" }]
        ]
    });

    if (!isCallback && text === '/navroz') {
        await BotAdmin.findOneAndUpdate({ chatId }, { chatId }, { upsert: true });
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: "👑 *Super Admin Paneliga xush kelibsiz!*\n\nBu yerdagi ma'lumotlar faqat siz uchun. Siz tizimda Admin sifatida saqlandingiz.",
                parse_mode: 'Markdown',
                reply_markup: adminMenuMarkup
            })
        });
        return res.status(200).send('OK');
    }

    if (!isCallback && text.startsWith('/elon ')) {
        const messageToBroadcast = text.substring(6).trim();
        if (!messageToBroadcast) return res.status(200).send('OK');

        const allConnected = await Student.find({ telegramChatId: { $ne: null } });
        const uniqueChatIds = [...new Set(allConnected.map(s => s.telegramChatId).filter(id => id && id.length > 5))];

        let successCount = 0;
        await Promise.all(uniqueChatIds.map(async (uChatId) => {
            try {
                const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: uChatId, text: `🔔 *Yangi e'lon:*\n\n${messageToBroadcast}`, parse_mode: 'Markdown' })
                });
                const d = await res.json();
                if (d.ok) successCount++;
            } catch (e) {}
        }));

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chat_id: chatId, 
                text: `✅ *Xabar muvaffaqiyatli yuborildi!*\n\nQabul qildi: ${successCount} kishi.`, 
                parse_mode: 'Markdown',
                reply_markup: adminMenuMarkup // Admin menyusini qayta biriktiramiz
            })
        });
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

                await setupChatUI(chatId, token); 
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: `✅ *Yangi profil ulandi!*\n\nTabriklaymiz, *${studentToLink.name}* ham sizning hisobingizga qo'shildi.\nEndi siz jami ${totalLinked} ta o'quvchini nazorat qilasiz.`,
                        parse_mode: 'Markdown',
                        reply_markup: getInlineMenu(chatId) 
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
            if (subData.ok && ['member', 'administrator', 'creator'].includes(subData.result.status)) isSubscribed = true;
        } catch (e) { isSubscribed = false; } 

        if (!isSubscribed) {
            if (!isCallback || (isCallback && text !== "check_sub")) {
                await setupChatUI(chatId, token); 
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
                return res.status(200).send('OK'); 
            }
        }

        if (isCallback && text === "check_sub" && isSubscribed) {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    chat_id: chatId, 
                    text: "✅ Rahmat! Obuna muvaffaqiyatli tasdiqlandi.\nEndi menyudan bemalol foydalanishingiz mumkin 👇",
                    reply_markup: getInlineMenu(chatId) 
                })
            });
            return res.status(200).send('OK');
        }
    }
    
    if (text === '/start') {
        await setupChatUI(chatId, token); 
        
        if (isAdminActive) {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: "👑 *Super Admin Paneli*\n\nKerakli bo'limni tanlang:", reply_markup: adminMenuMarkup, parse_mode: 'Markdown' })
            });
            return res.status(200).send('OK');
        }

        if (linkedStudents.length > 0) {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: `Assalomu alaykum! 🎓\n\nSizning hisobingizga *${linkedStudents.length} ta* o'quvchi ulangan. Pastki menyudan kerakli bo'limni tanlang 👇`, reply_markup: getInlineMenu(chatId), parse_mode: 'Markdown' })
            });
        } else {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    chat_id: chatId, 
                    text: `Assalomu alaykum, *${firstName}*! 🎓\n\n"G'ulomov Math Group"ga xush kelibsiz. Profilingizni ulash uchun bejigingizdagi QR kodni kameraga tuting yoki pastdan ro'yxatdan o'ting 👇`, 
                    reply_markup: { 
                        inline_keyboard: [ 
                            [{ text: "📝 Ro'yxatdan o'tish", web_app: { url: `https://uquv-markaz-navroz.vercel.app/bot-register?chatId=${chatId}` } }], 
                            [{ text: "ℹ️ O'quv markaz haqida", callback_data: "about" }],
                            [{ text: "✈️ Telegram", url: "https://t.me/gulomov_math_group" }, { text: "📸 Instagram", url: "https://www.instagram.com/gulomov_math_group/?hl=en" }] 
                        ] 
                    }, parse_mode: 'Markdown' 
                })
            });
        }
        return res.status(200).send('OK');
    }

    if (isCallback) {
        if (text === "admin_logout") {
            await BotAdmin.findOneAndDelete({ chatId });
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: "🚪 Admin paneldan chiqdingiz. Oddiy o'quvchi rejimiga o'tdingiz.", reply_markup: getInlineMenu(chatId) })
            });
        }
        else if (text === "admin_stats") {
            const allStudents = await Student.countDocuments();
            const connectedStudents = await Student.countDocuments({ telegramChatId: { $ne: null } });
            const notConnected = allStudents - connectedStudents;
            const percentage = allStudents > 0 ? Math.round((connectedStudents / allStudents) * 100) : 0;

            const statMsg = `📊 *Markaz Statistikasi*\n\n👥 Jami o'quvchilar: *${allStudents} ta*\n✅ Botga ulanganlar: *${connectedStudents} ta* (${percentage}%)\n❌ Ulanmaganlar: *${notConnected} ta*`;
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: statMsg, parse_mode: 'Markdown', reply_markup: adminMenuMarkup })
            });
        }
        else if (text === "admin_unconnected" || text === "admin_connected") {
            const isUnconnected = text === "admin_unconnected";
            const queryObj = isUnconnected ? { telegramChatId: null } : { telegramChatId: { $ne: null } };
            const list = await Student.find(queryObj).limit(80); // 80 tagacha ko'rsatadi
            const total = await Student.countDocuments(queryObj);

            if (list.length === 0) {
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: isUnconnected ? "✅ Hamma ulangan!" : "Hali hech kim ulanmagan.", reply_markup: adminMenuMarkup })
                });
            } else {
                // 🔥 YONMA-YON (JADVAL) FORMATLASH LOGIKASI
                let msg = isUnconnected ? `❌ *Botga ulanmaganlar:*\n\n` : `✅ *Botga ulanganlar:*\n\n`;
                
                const formatName = (name) => {
                    let parts = name.split(' ');
                    // Ism va familiya bosh harfi (Masalan: Tursunov M.)
                    return parts.length > 1 ? `${parts[0]} ${parts[1].charAt(0)}.` : name;
                };
                const formatGroup = (g) => g ? g.split(' ')[0] : '-'; // (Matematika)

                for (let i = 0; i < list.length; i += 2) {
                    let st1 = list[i];
                    let st2 = list[i+1];
                    
                    let col1 = `*${i+1}.* ${formatName(st1.name)} _(${formatGroup(st1.group)})_`;
                    let col2 = st2 ? `  ｜  *${i+2}.* ${formatName(st2.name)} _(${formatGroup(st2.group)})_` : '';
                    
                    msg += `${col1}${col2}\n`;
                }

                if (total > 80) msg += `\n_...va yana ${total - 80} ta o'quvchi bor._`;
                
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown', reply_markup: adminMenuMarkup })
                });
            }
        }
        else if (text === "admin_broadcast_info") {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    chat_id: chatId, 
                    text: "📢 *Barchaga xabar yuborish uchun pastdagi kabi yozing:*\n\n`/elon Bu yerga xabaringiz matnini yozasiz.`\n\nMasalan:\n`/elon Ertaga markazimizda dam olish kuni!`", 
                    parse_mode: 'Markdown', reply_markup: adminMenuMarkup
                })
            });
        }
        else if (text === "admin_finance") {
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            
            const monthPayments = await Payment.find({ month: currentMonth });
            const monthExpenses = await Expense.find({ month: currentMonth });

            const totalIncome = monthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            const totalExpense = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
            const profit = totalIncome - totalExpense;

            const finMsg = `💰 *Kassa Hisoboti (${currentMonth})*\n\n🟢 *Tushumlar (To'lovlar):* ${totalIncome.toLocaleString()} so'm\n🔴 *Xarajatlar:* ${totalExpense.toLocaleString()} so'm\n\n💵 *Qoldiq (Foyda):* ${profit.toLocaleString()} so'm`;
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: finMsg, parse_mode: 'Markdown', reply_markup: adminMenuMarkup })
            });
        }
        // O'quvchi menyulari
        else if (text === "about") {
            const captionText = `📐 *Matematika fanidan tajribali va A+ sertifikatlangan ustoz Gʻulomov Navro'z*\n\n🌟 _Biz bilan orzuingiz roʻyobga chiqadi!_\n\n✅ Prezident maktablariga tayyorlov\n✅ Al-Xorazmiy maktablariga tayyorlov\n✅ Ixtisoslashtirilgan maktablarga tayyorlov\n✅ DTM va xalqaro sertifikat imtihonlariga tayyorlov\n\n🏆 *Natijalarimiz:*\n👨‍🎓 6 nafar Al-Xorazmiy maktabi oʻquvchisi\n🏅 15+ nafar xalqaro sertifikat sohiblari\n💯 100+ nafar ixtisoslashtirilgan maktab oʻquvchilari\n\n📍 *Manzil:* Kattaqoʻrgʻon tumani, Kadan chorrahasi, Ziyo Nur oʻquv markazi\n\n📞 *Murojaat uchun:* +998 93 271 70 79`;
            await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, photo: "https://uquv-markaz-navroz.vercel.app/banner.jpg", caption: captionText, parse_mode: 'Markdown', reply_markup: getInlineMenu(chatId) })
            });
        }
        else if (text === "info") {
            if (linkedStudents.length > 0) {
                let msg = `👥 *Sizning hisobingizdagi o'quvchilar (${linkedStudents.length} ta):*\n\n`;
                for (let i = 0; i < linkedStudents.length; i++) {
                    const st = linkedStudents[i];
                    msg += `${i + 1}. *Ism:* ${st.name}\n📚 *Fanlar:* ${st.group || 'Guruhsiz'}\n🗓 *Qo'shilgan sana:* ${formatDate(st.addedAt)}\n\n`;
                }
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown', reply_markup: getInlineMenu(chatId) })
                });
            }
        }
        else if (text === "stat") {
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
                    msg += `👤 *O'quvchi:* ${st.name}\n📚 *Fan:* ${st.group || 'Guruhsiz'}\n🗓 *Jami darslar:* ${totalClasses} ta\n✅ *Qatnashdi:* ${keldi} marta\n❌ *Qoldirdi:* ${kelmadi} marta\n〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
                });
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown', reply_markup: getInlineMenu(chatId) })
                });
            }
        }
        return res.status(200).send('OK');
    }

    return res.status(200).send('OK');
}