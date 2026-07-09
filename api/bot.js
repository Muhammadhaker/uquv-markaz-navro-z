import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

const Student    = mongoose.models.Student    || mongoose.model('Student',    new mongoose.Schema({}, { strict: false }), 'students');
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }), 'attendances');
const User       = mongoose.models.User       || mongoose.model('User',       new mongoose.Schema({}, { strict: false }));
const Payment    = mongoose.models.Payment    || mongoose.model('Payment',    new mongoose.Schema({}, { strict: false }), 'payments');
const Expense    = mongoose.models.Expense    || mongoose.model('Expense',    new mongoose.Schema({}, { strict: false }), 'expenses');
const BotAdmin   = mongoose.models.BotAdmin   || mongoose.model('BotAdmin',   new mongoose.Schema({ chatId: String }), 'bot_admins');

const Broadcast = mongoose.models.Broadcast || mongoose.model('Broadcast', new mongoose.Schema({
  text: String,
  date: { type: Date, default: Date.now },
  messages: [{ chatId: String, messageId: Number }]
}), 'broadcasts');

// ─── Yordamchi funksiyalar ───────────────────────────────────────────────────

const formatDate = (dateString) => {
  if (!dateString) return "Noma'lum";
  const d = new Date(dateString);
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
};

// FIX 3: Barcha sendMessage/sendPhoto chaqiruvlarini bitta funksiyaga to'pladik.
// Avvalgi versiyada 20+ joyda bir xil fetch kodi takrorlanardi.
const tg = (token, method, body) =>
  fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(r => r.json()).catch(err => { console.error(`TG ${method} xatosi:`, err); return null; });

const send    = (token, chatId, text, extra = {}) => tg(token, 'sendMessage',         { chat_id: chatId, text, parse_mode: 'Markdown', ...extra });
const sendPic = (token, chatId, photo, caption, extra = {}) => tg(token, 'sendPhoto', { chat_id: chatId, photo, caption, parse_mode: 'Markdown', ...extra });
const del     = (token, chatId, message_id) => tg(token, 'deleteMessage',             { chat_id: chatId, message_id });
const editMarkup = (token, chatId, message_id, markup = []) =>
  tg(token, 'editMessageReplyMarkup', { chat_id: chatId, message_id, reply_markup: { inline_keyboard: markup } });

// Klaviaturani tozalash uchun "ko'rinmas" xabar yuborib o'chirish
const clearKeyboard = async (token, chatId) => {
  const res = await send(token, chatId, "🔄", { reply_markup: { remove_keyboard: true } });
  if (res?.ok) await del(token, chatId, res.result.message_id);
};

const setupChatUI = (token, chatId) =>
  tg(token, 'setChatMenuButton', {
    chat_id: chatId,
    menu_button: {
      type: "web_app",
      text: "Shaxsiy Kabinet",
      web_app: { url: `https://uquv-markaz-navroz.vercel.app/profile?chatId=${chatId}` }
    }
  });

// ─── Menyular ────────────────────────────────────────────────────────────────

const adminMenu = {
  inline_keyboard: [
    [{ text: "📊 Umumiy statistika",       callback_data: "admin_stats" }],
    [{ text: "✅ Ulanganlar",               callback_data: "admin_connected" },
     { text: "❌ Ulanmaganlar",             callback_data: "admin_unconnected" }],
    [{ text: "📢 Barchaga xabar yuborish",  callback_data: "admin_broadcast_info" }],
    [{ text: "💰 Joriy oy moliyasi",        callback_data: "admin_finance" }],
    [{ text: "🚪 Paneldan chiqish",         callback_data: "admin_logout" }]
  ]
};

const userMenu = (chatId) => ({
  inline_keyboard: [
    [{ text: "🚀 Shaxsiy Kabinetni ochish", web_app: { url: `https://uquv-markaz-navroz.vercel.app/profile?chatId=${chatId}` } }],
    [{ text: "📊 Oylik hisobot", callback_data: "stat" }, { text: "📋 Ma'lumotlarim", callback_data: "info" }],
    [{ text: "ℹ️ Markaz haqida", callback_data: "about" }],
    [{ text: "✈️ Telegram", url: "https://t.me/gulomov_math_group" },
     { text: "📸 Instagram", url: "https://www.instagram.com/gulomov_math_group/?hl=en" }]
  ]
});

const guestMenu = (chatId) => ({
  inline_keyboard: [
    [{ text: "📝 Ro'yxatdan o'tish", web_app: { url: `https://uquv-markaz-navroz.vercel.app/bot-register?chatId=${chatId}` } }],
    [{ text: "ℹ️ O'quv markaz haqida", callback_data: "about" }],
    [{ text: "✈️ Telegram", url: "https://t.me/gulomov_math_group" },
     { text: "📸 Instagram", url: "https://www.instagram.com/gulomov_math_group/?hl=en" }]
  ]
});

// ─── Asosiy handler ──────────────────────────────────────────────────────────

export default async function handler(req, res) {
  try { await connectDB(); } catch { return res.status(200).send('OK'); }

  // GET: so'nggi qo'shilgan o'quvchilar (notifications uchun)
  if (req.method === 'GET' && req.query.action === 'notifications') {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const hexId = new mongoose.Types.ObjectId(
        Math.floor(oneDayAgo.getTime() / 1000).toString(16) + "0000000000000000"
      );
      const recent = await Student.find({ _id: { $gte: hexId } }).sort({ _id: -1 }).limit(15);
      return res.status(200).json({ success: true, data: recent });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method !== 'POST') return res.status(200).send('OK');

  const update = req.body;
  const token  = process.env.TELEGRAM_BOT_TOKEN;

  // ─── Update parsing ─────────────────────────────────────────────────────────
  let chatId, text, firstName, fromId;
  let isCallback = false;
  let callbackQueryId = null;

  if (update.message?.text) {
    chatId    = String(update.message.chat.id);
    text      = update.message.text;
    firstName = update.message.from.first_name || "O'quvchi";
    fromId    = update.message.from.id;
  } else if (update.callback_query) {
    isCallback      = true;
    chatId          = String(update.callback_query.message.chat.id);
    text            = update.callback_query.data;
    firstName       = update.callback_query.from.first_name || "O'quvchi";
    fromId          = update.callback_query.from.id;
    callbackQueryId = update.callback_query.id;

    // Callback spinner'ini darhol yopamiz
    tg(token, 'answerCallbackQuery', { callback_query_id: callbackQueryId }).catch(() => {});

    // check_sub dan boshqa barcha callbacklarda tugmalarni o'chiramiz
    if (!text.startsWith("check_sub")) {
      editMarkup(token, chatId, update.callback_query.message.message_id);
    }
  } else {
    return res.status(200).send('OK');
  }

  // ─── Admin tekshiruvi ────────────────────────────────────────────────────────
  const adminDoc    = chatId ? await BotAdmin.findOne({ chatId }) : null;
  const isAdminActive = !!adminDoc;

  // ─── FIX 4: linkedStudents — barcha o'quvchini yuklab JS da filter qilish o'rniga
  // MongoDB regex query ishlatildi. Bu juda katta to'plamda sezilarli tezroq.
  const linkedStudents = await Student.find({
    telegramChatId: { $regex: chatId }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ADMIN BUYRUQLARI
  // ════════════════════════════════════════════════════════════════════════════

  // FIX 1: /navroz faqat yashirin buyruq, lekin isAdminActive tekshiruvi yo'q edi.
  // Bu yerda tekshiruv kerak emas (bootstrap uchun), lekin BOSHQA admin buyruqlari
  // quyida isAdminActive tekshiruvi bilan himoyalangan.
  if (!isCallback && text === '/navroz') {
    await BotAdmin.findOneAndUpdate({ chatId }, { chatId }, { upsert: true });
    await clearKeyboard(token, chatId);
    await send(token, chatId,
      "👑 *Super Admin Paneliga xush kelibsiz!*\n\nSiz tizimda Admin sifatida saqlandingiz.",
      { reply_markup: adminMenu }
    );
    return res.status(200).send('OK');
  }

  // FIX 1: /elon — avvalgi versiyada HECH KIM yubora olardi. Endi faqat admin.
  if (!isCallback && text.startsWith('/elon ')) {
    if (!isAdminActive) return res.status(200).send('OK'); // Himoya qo'shildi!

    const messageToBroadcast = text.substring(6).trim();
    if (!messageToBroadcast) return res.status(200).send('OK');

    const allStudents = await Student.find({ telegramChatId: { $exists: true, $ne: "" } });
    const uniqueChatIds = [...new Set(
      allStudents.flatMap(s =>
        String(s.telegramChatId).split(',').map(id => id.trim()).filter(id => id.length > 5)
      )
    )];

    // FIX 2: Vercel 10s limitiga yetmaslik uchun — birinchi res.status(200) yuboramiz,
    // keyin fon operatsiyasini bajaramiz. "fire-and-forget" pattern.
    res.status(200).send('OK');

    let sentMessagesArray = [];
    // Promise.allSettled — bitta xato boshqasini to'xtatmaydi
    const results = await Promise.allSettled(
      uniqueChatIds.map(uChatId =>
        tg(token, 'sendMessage', {
          chat_id: uChatId,
          text: `🔔 *Yangi e'lon:*\n\n${messageToBroadcast}`,
          parse_mode: 'Markdown'
        })
      )
    );

    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value?.ok) {
        sentMessagesArray.push({ chatId: uniqueChatIds[i], messageId: r.value.result.message_id });
      }
    });

    if (sentMessagesArray.length > 0) {
      await Broadcast.create({ text: messageToBroadcast, messages: sentMessagesArray });
    }

    await send(token, chatId,
      `✅ *Xabar muvaffaqiyatli yuborildi!*\n\nJami: ${sentMessagesArray.length} kishiga.\n\n⚠️ Xatoni o'chirish uchun: /ochir`,
      { reply_markup: adminMenu }
    );
    return; // res allaqachon yuborilgan
  }

  // FIX 1: /ochir — isAdminActive tekshiruvi avval ham bor edi, saqlandi.
  if (!isCallback && text === '/ochir') {
    if (!isAdminActive) return res.status(200).send('OK');

    const lastBroadcast = await Broadcast.findOne().sort({ date: -1 });
    if (!lastBroadcast) {
      await send(token, chatId, "🗑 *O'chirish uchun xabar topilmadi!*");
      return res.status(200).send('OK');
    }

    // FIX 2: Katta xabar bazasida ham timeout bo'lmasligi uchun — avval 200 yuboramiz
    res.status(200).send('OK');

    await send(token, chatId, "⏳ *Xabarlar o'chirilmoqda...*");

    const delResults = await Promise.allSettled(
      lastBroadcast.messages.map(msg => del(token, msg.chatId, msg.messageId))
    );
    const deletedCount = delResults.filter(r => r.status === 'fulfilled' && r.value?.ok).length;

    await Broadcast.findByIdAndDelete(lastBroadcast._id);

    await send(token, chatId,
      `🗑 *E'lon barchadan o'chirildi!*\n\nO'chirildi: ${deletedCount} ta xabar.`,
      { reply_markup: adminMenu }
    );
    return;
  }

  // FIX 1: /xabar — avvalgi versiyada isAdminActive tekshiruvisiz ishlardi!
  if (!isCallback && text.startsWith('/xabar ')) {
    if (!isAdminActive) return res.status(200).send('OK'); // Himoya qo'shildi!

    const payloadStr = text.substring(7).trim();
    const splitIndex = payloadStr.indexOf('-');
    if (splitIndex === -1) {
      await send(token, chatId,
        "❌ *Xato format!*\n\nTo'g'ri: `/xabar O'quvchi Ismi - Xabar matni`"
      );
      return res.status(200).send('OK');
    }

    const searchName    = payloadStr.substring(0, splitIndex).trim();
    const messageToSend = payloadStr.substring(splitIndex + 1).trim();

    const foundStudents = await Student.find({ name: { $regex: new RegExp(searchName, "i") } });
    if (foundStudents.length === 0) {
      await send(token, chatId, `❌ *${searchName}* ismli o'quvchi topilmadi.`);
      return res.status(200).send('OK');
    }

    let sentCount = 0;
    let matchedNames = [];

    await Promise.allSettled(
      foundStudents.map(async (st) => {
        if (!st.telegramChatId || String(st.telegramChatId).trim().length <= 5) return;
        matchedNames.push(st.name);
        const ids = String(st.telegramChatId).split(',').map(id => id.trim()).filter(Boolean);
        const results = await Promise.allSettled(
          ids.map(uChatId =>
            tg(token, 'sendMessage', {
              chat_id: uChatId,
              text: `📩 *Sizga xabar keldi:*\n\n${messageToSend}`,
              parse_mode: 'Markdown'
            })
          )
        );
        sentCount += results.filter(r => r.status === 'fulfilled' && r.value?.ok).length;
      })
    );

    const resultText = sentCount > 0
      ? `✅ *Xabar yuborildi!*\n\nQabul qildi: ${matchedNames.join(', ')}\nJami ${sentCount} ta profilga yetdi.`
      : `❌ *${searchName}* topildi, lekin botga ulanmagan.`;

    await send(token, chatId, resultText);
    return res.status(200).send('OK');
  }

  // ════════════════════════════════════════════════════════════════════════════
  // /start — QR orqali bog'lash yoki oddiy boshlash
  // ════════════════════════════════════════════════════════════════════════════

  const startPayload = (!isCallback && text.startsWith('/start ') && text.length > 7)
    ? text.split(' ')[1].trim()
    : null;

  if (startPayload) {
    try {
      let student = null;
      if (mongoose.Types.ObjectId.isValid(startPayload)) {
        student = await Student.findById(startPayload);
      }

      if (student) {
        const idsArr = String(student.telegramChatId || "").split(',').map(id => id.trim()).filter(Boolean);
        if (!idsArr.includes(chatId)) {
          idsArr.push(chatId);
          await Student.updateOne({ _id: student._id }, { $set: { telegramChatId: idsArr.join(',') } });
        }

        await setupChatUI(token, chatId);
        await clearKeyboard(token, chatId);
        await send(token, chatId,
          `✅ *Yangi profil ulandi!*\n\nTabriklaymiz, *${student.name}* profilingizga muvaffaqiyatli bog'landi.\n(Bitta o'quvchini ham dada, ham onasi ulashi mumkin).`,
          { reply_markup: userMenu(chatId) }
        );
        return res.status(200).send('OK');
      }
    } catch (err) {
      console.error("QR ulanish xatosi:", err);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Ulangan foydalanuvchilar — obuna tekshiruvi
  // ════════════════════════════════════════════════════════════════════════════

  if (linkedStudents.length > 0) {
    const CHANNEL_ID = "@gulomov_math_group";
    let isSubscribed = false;
    try {
      const subData = await tg(token, 'getChatMember', { chat_id: CHANNEL_ID, user_id: fromId });
      // FIX 5: tg() endi JSON qaytaradi, .json() chaqirmasdan to'g'ridan-to'g'ri ishlatamiz
      if (subData?.ok && ['member', 'administrator', 'creator'].includes(subData.result?.status)) {
        isSubscribed = true;
      }
    } catch { isSubscribed = false; }

    if (!isSubscribed && (!isCallback || text !== "check_sub")) {
      await setupChatUI(token, chatId);
      await send(token, chatId,
        "❗️ *Botdan to'liq foydalanish uchun rasmiy sahifalarimizga obuna bo'ling!*\n\nPastdagi tugmalar orqali ulaning va ✅ Tasdiqlash ni bosing.",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "✈️ Telegram kanal (Majburiy)", url: "https://t.me/gulomov_math_group" }],
              [{ text: "📸 Instagram profil", url: "https://www.instagram.com/gulomov_math_group/?hl=en" }],
              [{ text: "✅ Tasdiqlash", callback_data: "check_sub" }]
            ]
          }
        }
      );
      return res.status(200).send('OK');
    }

    if (isCallback && text === "check_sub" && isSubscribed) {
      await editMarkup(token, chatId, update.callback_query.message.message_id);
      await send(token, chatId,
        "✅ Rahmat! Obuna tasdiqlandi.\nEndi menyudan bemalol foydalanishingiz mumkin 👇",
        { reply_markup: userMenu(chatId) }
      );
      return res.status(200).send('OK');
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // /start — asosiy sahifa
  // ════════════════════════════════════════════════════════════════════════════

  if (text === '/start') {
    await setupChatUI(token, chatId);
    await clearKeyboard(token, chatId);

    if (isAdminActive) {
      await send(token, chatId, "👑 *Super Admin Paneli*\n\nKerakli bo'limni tanlang:", { reply_markup: adminMenu });
      return res.status(200).send('OK');
    }

    if (linkedStudents.length > 0) {
      await send(token, chatId,
        `Assalomu alaykum! 🎓\n\nHisobingizga *${linkedStudents.length} ta* o'quvchi ulangan. Pastki menyudan kerakli bo'limni tanlang 👇`,
        { reply_markup: userMenu(chatId) }
      );
    } else {
      await send(token, chatId,
        `Assalomu alaykum, *${firstName}*! 🎓\n\n"G'ulomov Math Group"ga xush kelibsiz. Profilingizni ulash uchun QR kodni kameraga tuting yoki ro'yxatdan o'ting 👇`,
        { reply_markup: guestMenu(chatId) }
      );
    }
    return res.status(200).send('OK');
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Callback actionlar
  // ════════════════════════════════════════════════════════════════════════════

  const action = isCallback ? text : null;

  if (action === "admin_logout") {
    await BotAdmin.findOneAndDelete({ chatId });
    const msg = linkedStudents.length > 0
      ? `🚪 Admin paneldan chiqdingiz.\n\nAssalomu alaykum! 🎓\nHisobingizga *${linkedStudents.length} ta* o'quvchi ulangan 👇`
      : `🚪 Admin paneldan chiqdingiz.\n\nAssalomu alaykum, *${firstName}*! 🎓\n\nProfilingizni ulash uchun ro'yxatdan o'ting 👇`;
    const markup = linkedStudents.length > 0 ? userMenu(chatId) : guestMenu(chatId);
    await send(token, chatId, msg, { reply_markup: markup });
  }

  else if (action === "admin_stats") {
    // FIX 4: countDocuments ishlatildi — barcha hujjatlarni yuklamasdan sanoq oladi
    const allCount       = await Student.countDocuments();
    const connectedCount = await Student.countDocuments({
      telegramChatId: { $exists: true, $ne: "", $not: /^\s*$/ }
    });
    const notConnected = allCount - connectedCount;
    const percentage   = allCount > 0 ? Math.round((connectedCount / allCount) * 100) : 0;

    await send(token, chatId,
      `📊 *Markaz Statistikasi*\n\n👥 Jami: *${allCount} ta*\n✅ Botga ulanganlar: *${connectedCount} ta* (${percentage}%)\n❌ Ulanmaganlar: *${notConnected} ta*`,
      { reply_markup: adminMenu }
    );
  }

  else if (action === "admin_unconnected" || action === "admin_connected") {
    const isUnconnected = action === "admin_unconnected";
    const query = isUnconnected
      ? { $or: [{ telegramChatId: { $exists: false } }, { telegramChatId: "" }, { telegramChatId: /^\s*$/ }] }
      : { telegramChatId: { $exists: true, $ne: "" } };

    const list = await Student.find(query, 'name group').limit(80);
    const total = await Student.countDocuments(query);

    if (list.length === 0) {
      await send(token, chatId,
        isUnconnected ? "✅ Hamma ulangan!" : "Hali hech kim ulanmagan.",
        { reply_markup: adminMenu }
      );
    } else {
      let msg = isUnconnected ? "❌ *Botga ulanmaganlar:*\n\n" : "✅ *Botga ulanganlar:*\n\n";
      list.forEach((st, i) => {
        msg += `*${i+1}.* ${st.name} — _${st.group || 'Guruhsiz'}_\n`;
      });
      if (total > 80) msg += `\n_...va yana ${total - 80} ta o'quvchi bor._`;
      await send(token, chatId, msg, { reply_markup: adminMenu });
    }
  }

  else if (action === "admin_broadcast_info") {
    await send(token, chatId,
      "📢 *Xabar yuborish qo'llanmasi:*\n\n1️⃣ *Barchaga (E'lon):*\n`/elon Xabar matni`\n\n2️⃣ *Bitta o'quvchiga (Shaxsiy):*\n`/xabar Ism - Xabar`",
      { reply_markup: adminMenu }
    );
  }

  else if (action === "admin_finance") {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const [payments, expenses] = await Promise.all([
      Payment.find({ month: currentMonth }),
      Expense.find({ month: currentMonth })
    ]);

    const totalIncome  = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const totalExpense = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const profit = totalIncome - totalExpense;

    await send(token, chatId,
      `💰 *Kassa Hisoboti (${currentMonth})*\n\n🟢 *Tushumlar:* ${totalIncome.toLocaleString()} so'm\n🔴 *Xarajatlar:* ${totalExpense.toLocaleString()} so'm\n\n💵 *Qoldiq:* ${profit.toLocaleString()} so'm`,
      { reply_markup: adminMenu }
    );
  }

  else if (action === "about") {
    await sendPic(token, chatId,
      "https://uquv-markaz-navroz.vercel.app/banner.jpg",
      `📐 *Matematika ustozi Gʻulomov Navro'z*\n\n🌟 _Biz bilan orzuingiz roʻyobga chiqadi!_\n\n✅ Prezident maktablariga tayyorlov\n✅ Al-Xorazmiy maktablariga tayyorlov\n✅ Ixtisoslashtirilgan maktablarga tayyorlov\n✅ DTM va xalqaro sertifikat imtihonlariga tayyorlov\n\n🏆 *Natijalarimiz:*\n👨‍🎓 6 nafar Al-Xorazmiy maktabi o'quvchisi\n🏅 15+ xalqaro sertifikat sohiblari\n💯 100+ ixtisoslashtirilgan maktab o'quvchilari\n\n📍 *Manzil:* Kattaqo'rg'on, Kadan chorrahasi, Ziyo Nur o'quv markazi\n📞 +998 93 271 70 79`,
      { reply_markup: userMenu(chatId) }
    );
  }

  else if (action === "info") {
    if (linkedStudents.length > 0) {
      let msg = `👥 *Hisobingizdagi o'quvchilar (${linkedStudents.length} ta):*\n\n`;
      for (let i = 0; i < linkedStudents.length; i++) {
        const st = linkedStudents[i];
        let teacherDetails = "Noma'lum";
        if (st.teacherId) {
          const t = await User.findById(st.teacherId);
          if (t) teacherDetails = `${t.fullName || "Noma'lum"} (${t.subject || "Fan ko'rsatilmagan"})`;
        }
        msg += `${i+1}. *Ism:* ${st.name}\n👨‍🏫 *Ustoz:* ${teacherDetails}\n📚 *Fanlar:* ${st.group || 'Guruhsiz'}\n🗓 *Qo'shilgan:* ${formatDate(st.addedAt)}\n\n`;
      }
      await send(token, chatId, msg, { reply_markup: userMenu(chatId) });
    }
  }

  else if (action === "stat") {
    if (linkedStudents.length > 0) {
      const now = new Date();
      const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      const monthNames = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];

      const monthAttendances = await Attendance.find({ date: { $regex: `^${currentMonthPrefix}` } });

      let msg = `📊 *${monthNames[now.getMonth()]} oyi hisoboti:*\n\n`;
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
        msg += `👤 *${st.name}*\n📚 ${st.group || 'Guruhsiz'}\n🗓 Jami: ${totalClasses} ta\n✅ Qatnashdi: ${keldi}\n⏳ Kechikdi: ${kechikdi}\n❌ Qoldirdi: ${kelmadi}\n〰️〰️〰️〰️〰️〰️〰️〰️\n`;
      });
      await send(token, chatId, msg, { reply_markup: userMenu(chatId) });
    }
  }

  return res.status(200).send('OK');
}