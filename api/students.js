import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI topilmadi!");
  return mongoose.connect(process.env.MONGODB_URI);
};

const studentSchema = new mongoose.Schema({
  name:             { type: String,   required: true },
  parentName:       { type: String,   required: true },
  phone:            { type: String,   default: "Kiritilmagan" },
  group:            { type: String,   required: true },
  telegramChatId:   { type: String,   default: null },
  groupsData:       { type: Array,    default: [] },
  isNewStudent:     { type: Boolean,  default: true },
  exceptionMonths:  { type: [String], default: [] },
  teacherIds:       { type: [String], default: [] },
  addedAt:          { type: Date,     default: Date.now }
}, { strict: false });

const Student = mongoose.models.Student || mongoose.model('Student', studentSchema, 'students');

// ─── Yordamchi: Telegram xabarnoma (yangi o'quvchi qo'shilganda) ─────────────
const sendWelcomeTelegram = async (student) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const cId   = student.telegramChatId?.trim();
  if (!token || !cId || cId.length < 5) return;

  try {
    // Menu tugmasini o'rnatamiz
    await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cId,
        menu_button: {
          type: "web_app", text: "Shaxsiy Kabinet",
          web_app: { url: `https://uquv-markaz-navroz.vercel.app/profile?chatId=${cId}` }
        }
      })
    });

    // Eski reply keyboard'ni tozalaymiz
    const rmRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: cId, text: "🔄", reply_markup: { remove_keyboard: true } })
    }).then(r => r.json());

    if (rmRes.ok) {
      await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: cId, message_id: rmRes.result.message_id })
      });
    }

    // Tabriknoma
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cId,
        text: `🎉 *Tabriklaymiz, ${student.name}!*\n\nSiz o'quv markazimizga muvaffaqiyatli qabul qilindingiz.\n\n👇 _Pastki menyudan "Shaxsiy Kabinet"ga kirishingiz mumkin!_`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: "🚀 Shaxsiy Kabinetni ochish", web_app: { url: `https://uquv-markaz-navroz.vercel.app/profile?chatId=${cId}` } }],
            [{ text: "📊 Oylik hisobot", callback_data: "stat" }, { text: "📋 Ma'lumotlarim", callback_data: "info" }],
            [{ text: "ℹ️ Markaz haqida", callback_data: "about" }]
          ]
        }
      })
    });
  } catch (err) {
    // Telegram xatosi asosiy operatsiyani to'xtatmasin
    console.error("Telegram tabriknoma xatosi:", err.message);
  }
};

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    return res.status(500).json({ success: false, error: "DB ulanmadi: " + err.message });
  }

  const role     = req.headers['x-user-role'];
  const userId   = req.headers['x-user-id'];
  const parentId = req.headers['x-parent-id'];

  // ─── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { telegramChatId } = req.query;

    // FIX 1: telegramChatId mavjudligini tekshirish — avval barcha hujjat
    // yuklanib JS da filter qilinardi. Endi aniq regex query ishlatiladi.
    if (telegramChatId) {
      const safeChatId = String(telegramChatId).trim();
      if (safeChatId.length < 5) {
        return res.status(200).json({ exists: false });
      }
      // Vergullar orasida yoki boshida/oxirida bo'lishini tekshiramiz
      const student = await Student.findOne({
        telegramChatId: { $regex: `(^|,)\\s*${safeChatId}\\s*(,|$)` }
      }, '_id'); // Faqat _id kerak — boshqa maydonlarni yuklamaslik uchun
      return res.status(200).json({ exists: !!student });
    }

    // FIX 3: Role asosida query
    let query = {};
    const targetTeacherId = role === 'assistant' ? parentId : userId;

    if (role === 'teacher' || role === 'assistant') {
      query = { teacherIds: targetTeacherId };
    }

    const students = await Student.find(query).sort({ addedAt: -1 });

    const filteredStudents = students.map(s => {
      const sObj = s.toObject();
      if (role === 'teacher' || role === 'assistant') {
        sObj.groupsData = (sObj.groupsData || []).filter(g => g.teacherId === targetTeacherId);
        sObj.group = sObj.groupsData.map(g => g.name).join(', ');
      }
      return sObj;
    });

    return res.status(200).json({ success: true, data: filteredStudents });
  }

  // ─── POST (yangi o'quvchi) ────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { groupsData } = req.body;

    let tIds = [];
    if (Array.isArray(groupsData)) {
      tIds = groupsData.map(g => g.teacherId).filter(Boolean);
    }

    const creatorId = role === 'assistant' ? parentId : userId;
    if (tIds.length === 0 && role !== 'super_admin') {
      tIds.push(creatorId);
    }

    req.body.teacherIds = [...new Set(tIds)];

    const savedStudent = await Student.create(req.body);

    // Telegram xabarnomasi — "fire and forget"
    // res allaqachon yuborilgandan keyin ishlashi mumkin emas (Vercel),
    // shuning uchun avval await qilib, keyin javob beramiz.
    // Lekin timeout bo'lmasligi uchun alohida try/catch bilan.
    await sendWelcomeTelegram(savedStudent);

    return res.status(201).json({ success: true, data: savedStudent });
  }

  // ─── PUT (tahrirlash) ─────────────────────────────────────────────────────
  if (req.method === 'PUT') {
    const { id, ...updateData } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Noto'g'ri ID" });
    }

    // teacherIds ni yangilaymiz
    const { groupsData } = updateData;
    if (Array.isArray(groupsData)) {
      const tIds = groupsData.map(g => g.teacherId).filter(Boolean);
      updateData.teacherIds = [...new Set(tIds)];
    }

    const savedStudent = await Student.findByIdAndUpdate(id, updateData, { new: true });

    if (!savedStudent) {
      return res.status(404).json({ success: false, error: "O'quvchi topilmadi" });
    }

    return res.status(200).json({ success: true, data: savedStudent });
  }

  // ─── DELETE ───────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Noto'g'ri ID" });
    }

    await Student.findByIdAndDelete(id);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ message: "Metod ruxsat etilmagan" });
}