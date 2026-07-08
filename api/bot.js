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

        if (!text.startsWith("check_sub")) {
            fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, message_id: update.callback_query.message.message_id })
            }).catch(()=>{});
        }
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
            body: JSON.stringify({ chat_id: chatId, text: "🔄", reply_markup: { remove_keyboard: true } })
        }).then(res => res.json()).then(data => {
            if(data.ok) fetch(`https://api.telegram.org/bot${token}/deleteMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, message_id: data.result.message_id }) });
        });

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

        const allStudents = await Student.find();
        let uniqueChatIds = [];
        
        allStudents.forEach(s => {
            // 🔥 String xavfsizligi
            if (s.telegramChatId && String(s.telegramChatId).trim().length > 5) {
                const ids = String(s.telegramChatId).split(',').filter(Boolean);
                uniqueChatIds.push(...ids);
            }
        });
        uniqueChatIds = [...new Set(uniqueChatIds)]; 

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
                text: `✅ *Xabar muvaffaqiyatli yuborildi!*\n\nJami yuborildi: ${successCount} kishiga.`, 
                parse_mode: 'Markdown',
                reply_markup: adminMenuMarkup 
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
                // 🔥 String xavfsizligi
                let currentStr = String(studentToLink.telegramChatId || "");
                let idsArr = currentStr.split(',').filter(Boolean);
                if (!idsArr.includes(chatId)) {
                    idsArr.push(chatId);
                    await Student.updateOne({ _id: studentToLink._id }, { $set: { telegramChatId: idsArr.join(',') } });
                }

                await setupChatUI(chatId, token); 
                
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: "🔄", reply_markup: { remove_keyboard: true } })
                }).then(res => res.json()).then(data => {
                    if(data.ok) fetch(`https://api.telegram.org/bot${token}/deleteMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, message_id: data.result.message_id }) });
                });

                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: `✅ *Yangi profil ulandi!*\n\nTabriklaymiz, *${studentToLink.name}* profilingizga muvaffaqiyatli bog'landi.\n(Bitta o'quvchini ham dada, ham onasi bemalol ulashi mumkin).`,
                        parse_mode: 'Markdown',
                        reply_markup: getInlineMenu(chatId) 
                    })
                });
                return res.status(200).send('OK'); 
            }
        } catch (error) { console.log("QR Xato", error); }
    }

    // 🔥 ESKI RAQAMLI ID'larni ham topishi uchun $or qo'shildi
    const linkedStudents = await Student.find({ 
        $or: [
            { telegramChatId: { $regex: new RegExp("\\b" + chatId + "\\b") } },
            { telegramChatId: Number(chatId) }
        ]
    });

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
            await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, message_id: update.callback_query.message.message_id })
            });
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

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: "🔄", reply_markup: { remove_keyboard: true } })
        }).then(res => res.json()).then(data => {
            if(data.ok) fetch(`https://api.telegram.org/bot${token}/deleteMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, message_id: data.result.message_id }) });
        });
        
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

    const action = isCallback ? text : null;

    if (action === "admin_logout") {
        await BotAdmin.findOneAndDelete({ chatId });
        
        if (linkedStudents.length > 0) {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    chat_id: chatId, 
                    text: `🚪 Admin paneldan chiqdingiz.\n\nAssalomu alaykum! 🎓\nSizning hisobingizga *${linkedStudents.length} ta* o'quvchi ulangan. Pastki menyudan kerakli bo'limni tanlang 👇`, 
                    reply_markup: getInlineMenu(chatId),
                    parse_mode: 'Markdown'
                })
            });
        } else {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    chat_id: chatId, 
                    text: `🚪 Admin paneldan chiqdingiz.\n\nAssalomu alaykum, *${firstName}*! 🎓\n\n"G'ulomov Math Group"ga xush kelibsiz. Profilingizni ulash uchun bejigingizdagi QR kodni kameraga tuting yoki pastdan ro'yxatdan o'ting 👇`, 
                    reply_markup: { 
                        inline_keyboard: [ 
                            [{ text: "📝 Ro'yxatdan o'tish", web_app: { url: `https://uquv-markaz-navroz.vercel.app/bot-register?chatId=${chatId}` } }], 
                            [{ text: "ℹ️ O'quv markaz haqida", callback_data: "about" }],
                            [{ text: "✈️ Telegram", url: "https://t.me/gulomov_math_group" }, { text: "📸 Instagram", url: "https://www.instagram.com/gulomov_math_group/?hl=en" }] 
                        ] 
                    }, 
                    parse_mode: 'Markdown' 
                })
            });
        }
    }
    else if (action === "admin_stats") {
        const allStudents = await Student.find();
        // 🔥 String xavfsizligi
        const connectedStudents = allStudents.filter(s => s.telegramChatId && String(s.telegramChatId).trim().length > 5).length;
        const allCount = allStudents.length;
        const notConnected = allCount - connectedStudents;
        const percentage = allCount > 0 ? Math.round((connectedStudents / allCount) * 100) : 0;

        const statMsg = `📊 *Markaz Statistikasi*\n\n👥 Jami o'quvchilar: *${allCount} ta*\n✅ Botga ulanganlar: *${connectedStudents} ta* (${percentage}%)\n❌ Ulanmaganlar: *${notConnected} ta*`;
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: statMsg, parse_mode: 'Markdown', reply_markup: adminMenuMarkup })
        });
    }
    else if (action === "admin_unconnected" || action === "admin_connected") {
        const isUnconnected = action === "admin_unconnected";
        const allStudents = await Student.find();
        
        const list = allStudents.filter(s => {
            // 🔥 String xavfsizligi
            const hasId = s.telegramChatId && String(s.telegramChatId).trim().length > 5;
            return isUnconnected ? !hasId : hasId;
        });

        if (list.length === 0) {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: isUnconnected ? "✅ Hamma ulangan!" : "Hali hech kim ulanmagan.", reply_markup: adminMenuMarkup })
            });
        } else {
            let msg = isUnconnected ? `❌ *Botga ulanmaganlar:*\n\n` : `✅ *Botga ulanganlar:*\n\n`;
            
            list.slice(0, 80).forEach((st, i) => {
                let fan = st.group || 'Guruhsiz';
                msg += `*${i+1}.* ${st.name} — _${fan}_\n`;
            });

            if (list.length > 80) msg += `\n_...va yana ${list.length - 80} ta o'quvchi bor._`;
            
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown', reply_markup: adminMenuMarkup })
            });
        }
    }
    else if (action === "admin_broadcast_info") {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chat_id: chatId, 
                text: "📢 *Barchaga xabar yuborish uchun pastdagi kabi yozing:*\n\n`/elon Bu yerga xabaringiz matnini yozasiz.`\n\nMasalan:\n`/elon Ertaga markazimizda dam olish kuni!`", 
                parse_mode: 'Markdown', reply_markup: adminMenuMarkup
            })
        });
    }
    else if (action === "admin_finance") {
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
    else if (action === "about" || text === "ℹ️ O'quv markaz haqida") {
        const captionText = `📐 *Matematika fanidan tajribali va A+ sertifikatlangan ustoz Gʻulomov Navro'z*\n\n🌟 _Biz bilan orzuingiz roʻyobga chiqadi!_\n\n✅ Prezident maktablariga tayyorlov\n✅ Al-Xorazmiy maktablariga tayyorlov\n✅ Ixtisoslashtirilgan maktablarga tayyorlov\n✅ DTM va xalqaro sertifikat imtihonlariga tayyorlov\n\n🏆 *Natijalarimiz:*\n👨‍🎓 6 nafar Al-Xorazmiy maktabi oʻquvchisi\n🏅 15+ nafar xalqaro sertifikat sohiblari\n💯 100+ nafar ixtisoslashtirilgan maktab oʻquvchilari\n\n📍 *Manzil:* Kattaqoʻrgʻon tumani, Kadan chorrahasi, Ziyo Nur oʻquv markazi\n\n📞 *Murojaat uchun:* +998 93 271 70 79`;
        await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, photo: "https://uquv-markaz-navroz.vercel.app/banner.jpg", caption: captionText, parse_mode: 'Markdown', reply_markup: getInlineMenu(chatId) })
        });
    }
    else if (action === "info" || text === "📋 Mening ma'lumotlarim") {
        if (linkedStudents.length > 0) {
            let msg = `👥 *Sizning hisobingizdagi o'quvchilar (${linkedStudents.length} ta):*\n\n`;
            for (let i = 0; i < linkedStudents.length; i++) {
                const st = linkedStudents[i];
                let teacherDetails = "Noma'lum";
                if(st.teacherId) {
                  const teacherInfo = await User.findById(st.teacherId);
                  if(teacherInfo) teacherDetails = `${teacherInfo.fullName || "Noma'lum"} (${teacherInfo.subject || "Fan ko'rsatilmagan"})`;
                }
                msg += `${i + 1}. *Ism:* ${st.name}\n👨‍🏫 *Ustoz:* ${teacherDetails}\n📚 *Fanlar:* ${st.group || 'Guruhsiz'}\n🗓 *Qo'shilgan sana:* ${formatDate(st.addedAt)}\n\n`;
            }
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown', reply_markup: getInlineMenu(chatId) })
            });
        }
    }
    else if (action === "stat" || text === "📊 Oylik hisobot" || text === "/stat") {
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
    else if (text === "👤 Shaxsiy Kabinet") {
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
    }

    return res.status(200).send('OK');
}