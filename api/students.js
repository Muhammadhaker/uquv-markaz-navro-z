import mongoose from 'mongoose';
import { connectDB } from './_lib/db.js';
import { Student, Schedule, Homework, Grade, Message } from './_lib/models.js';
import { tg } from './_lib/telegram.js';

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
  const ownerId  = role === 'assistant' ? parentId : userId;

  // ════════════════════════════════════════════════════════════════════════════
  // YANGI: resource-based routing — dars jadvali, uy vazifasi, baholar, xabarlar.
  // /api/students?resource=schedule|homework|grade|messages
  // Bu alohida api/ fayl OCHMAYDI, shuning uchun Vercel funksiyalar limitiga
  // tegmaydi (mavjud students.js faylining bir qismi sifatida ishlaydi).
  // ════════════════════════════════════════════════════════════════════════════
  const resource = req.query.resource;

  if (resource === 'schedule') {
    if (req.method === 'GET') {
      const { groupName } = req.query;
      let query = {};
      if (groupName) query.groupName = groupName;
      else if (role === 'teacher' || role === 'assistant') query.teacherId = ownerId;
      const schedules = await Schedule.find(query).sort({ groupName: 1 });
      return res.status(200).json({ success: true, data: schedules });
    }

    if (req.method === 'POST') {
      const { groupName, days, notifyStudents } = req.body;
      if (!groupName || !Array.isArray(days) || days.length === 0) {
        return res.status(400).json({ success: false, message: "groupName va days talab qilinadi" });
      }

      const schedule = await Schedule.findOneAndUpdate(
        { groupName, teacherId: ownerId },
        { groupName, teacherId: ownerId, days, updatedAt: new Date() },
        { new: true, upsert: true }
      );

      if (notifyStudents) {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const students = await Student.find({ group: { $regex: groupName } });
        const daysList = days.map(d => `📅 *${d.day}:* ${d.startTime}–${d.endTime}${d.room ? ` (${d.room})` : ''}`).join('\n');
        const text = `📋 *DARS JADVALI YANGILANDI*\n\n📚 *Guruh:* ${groupName}\n\n${daysList}`;

        const chatIds = new Set();
        students.forEach(s => {
          if (s.telegramChatId) {
            String(s.telegramChatId).split(',').map(id => id.trim()).filter(id => /^\d{6,}$/.test(id))
              .forEach(id => chatIds.add(id));
          }
        });

        await Promise.allSettled(
          [...chatIds].map(cId => tg(token, 'sendMessage', { chat_id: cId, text, parse_mode: 'Markdown' }))
        );
      }

      return res.status(200).json({ success: true, data: schedule });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Noto'g'ri ID" });
      }
      await Schedule.findByIdAndDelete(id);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ message: "Metod ruxsat etilmagan" });
  }

  if (resource === 'homework') {
    if (req.method === 'GET') {
      const { groupName } = req.query;
      let query = {};
      if (groupName) query.groupName = groupName;
      else if (role === 'teacher' || role === 'assistant') query.teacherId = ownerId;
      const homeworks = await Homework.find(query).sort({ createdAt: -1 }).limit(50);
      return res.status(200).json({ success: true, data: homeworks });
    }

    if (req.method === 'POST') {
      const { groupName, title, description, dueDate, notifyStudents } = req.body;
      if (!groupName || !title || !dueDate) {
        return res.status(400).json({ success: false, message: "groupName, title va dueDate talab qilinadi" });
      }

      const homework = await Homework.create({
        groupName, teacherId: ownerId, title, description: description || "", dueDate
      });

      if (notifyStudents) {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const students = await Student.find({ group: { $regex: groupName } });
        const text = `📝 *YANGI UY VAZIFASI*\n\n📚 *Guruh:* ${groupName}\n📌 *Mavzu:* ${title}\n${description ? `\n${description}\n` : ''}\n📅 *Topshirish muddati:* ${dueDate}`;

        const chatIds = new Set();
        students.forEach(s => {
          if (s.telegramChatId) {
            String(s.telegramChatId).split(',').map(id => id.trim()).filter(id => /^\d{6,}$/.test(id))
              .forEach(id => chatIds.add(id));
          }
        });

        await Promise.allSettled(
          [...chatIds].map(cId => tg(token, 'sendMessage', { chat_id: cId, text, parse_mode: 'Markdown' }))
        );
      }

      return res.status(201).json({ success: true, data: homework });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Noto'g'ri ID" });
      }
      await Homework.findByIdAndDelete(id);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ message: "Metod ruxsat etilmagan" });
  }

  if (resource === 'grade') {
    if (req.method === 'GET') {
      const { studentId, groupName } = req.query;
      let query = {};
      if (studentId) query.studentId = studentId;
      if (groupName) query.groupName = groupName;
      if (!studentId && !groupName && (role === 'teacher' || role === 'assistant')) {
        query.teacherId = ownerId;
      }
      const grades = await Grade.find(query).sort({ date: -1 }).limit(200);
      return res.status(200).json({ success: true, data: grades });
    }

    if (req.method === 'POST') {
      const { studentId, groupName, score, maxScore, comment, notifyParent } = req.body;
      if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ success: false, message: "Noto'g'ri studentId" });
      }
      if (!groupName || score === undefined || score === null) {
        return res.status(400).json({ success: false, message: "groupName va score talab qilinadi" });
      }
      if (Number(score) < 0) {
        return res.status(400).json({ success: false, message: "Baho manfiy bo'lishi mumkin emas" });
      }

      const grade = await Grade.create({
        studentId, groupName, teacherId: ownerId,
        score: Number(score), maxScore: Number(maxScore) || 100, comment: comment || ""
      });

      if (notifyParent) {
        const student = await Student.findById(studentId);
        if (student?.telegramChatId) {
          const token = process.env.TELEGRAM_BOT_TOKEN;
          const text = `📊 *YANGI BAHO*\n\n👤 *O'quvchi:* ${student.name}\n📚 *Fan:* ${groupName}\n⭐ *Baho:* ${score}/${maxScore || 100}${comment ? `\n💬 ${comment}` : ''}`;
          const chatIds = String(student.telegramChatId).split(',').map(id => id.trim()).filter(id => /^\d{6,}$/.test(id));
          await Promise.allSettled(
            chatIds.map(cId => tg(token, 'sendMessage', { chat_id: cId, text, parse_mode: 'Markdown' }))
          );
        }
      }

      return res.status(201).json({ success: true, data: grade });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Noto'g'ri ID" });
      }
      await Grade.findByIdAndDelete(id);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ message: "Metod ruxsat etilmagan" });
  }

  if (resource === 'messages') {
    if (req.method === 'GET') {
      // Ustoz o'ziga yozilgan xabarlarni ko'radi
      const query = role === 'super_admin' && req.query.teacherId
        ? { teacherId: req.query.teacherId }
        : { teacherId: ownerId };
      const messages = await Message.find(query).sort({ date: -1 }).limit(100);
      return res.status(200).json({ success: true, data: messages });
    }

    if (req.method === 'POST') {
      // Ustoz ota-onaga javob yozadi
      const { studentId, text } = req.body;
      if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ success: false, message: "Noto'g'ri studentId" });
      }
      if (!text || !String(text).trim()) {
        return res.status(400).json({ success: false, message: "Xabar matni bo'sh bo'lishi mumkin emas" });
      }

      const reply = await Message.create({
        studentId, teacherId: ownerId, fromParent: false, text: String(text).trim()
      });

      // Ota-onaga Telegram orqali javobni yetkazamiz
      const student = await Student.findById(studentId);
      if (student?.telegramChatId) {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const chatIds = String(student.telegramChatId).split(',').map(id => id.trim()).filter(id => /^\d{6,}$/.test(id));
        const msgText = `👨‍🏫 *Ustozdan javob keldi:*\n\n${text}`;
        await Promise.allSettled(
          chatIds.map(cId => tg(token, 'sendMessage', { chat_id: cId, text: msgText, parse_mode: 'Markdown' }))
        );
      }

      return res.status(201).json({ success: true, data: reply });
    }

    return res.status(405).json({ message: "Metod ruxsat etilmagan" });
  }

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