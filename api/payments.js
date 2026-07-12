import mongoose from 'mongoose';
import { connectDB } from './_lib/db.js';
import { Payment, Student } from './_lib/models.js';
import { sendMessage, deleteMessage, editMessageText, parseChatIds } from './_lib/telegram.js';

const MONTH_NAMES = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
const formatMonthName = (m) => {
  const [y, mm] = m.split("-");
  return `${MONTH_NAMES[parseInt(mm) - 1]} ${y}`;
};

const buildReceiptText = ({ studentName, groupName, amount, paymentType, month }, isEdited = false) =>
  `🧾 *TO'LOV CHEKI*${isEdited ? " (Tahrirlangan)" : ""}\n\n👤 *O'quvchi:* ${studentName}\n📚 *Fan/Guruh:* ${groupName}\n💰 *Summa:* ${Number(amount).toLocaleString()} so'm\n💳 *Turi:* ${paymentType}\n📅 *Oy:* ${formatMonthName(month)}\n\n✅ _To'lov muvaffaqiyatli qabul qilindi!_${isEdited ? "\n\n_✏️ Bu chek admin tomonidan tahrirlangan._" : ""}`;

export default async function handler(req, res) {
  try {
    await connectDB();

    const role     = req.headers['x-user-role'];
    const userId   = req.headers['x-user-id'];
    const parentId = req.headers['x-parent-id'];

    // ─── GET: to'lovlarni o'qish ─────────────────────────────────────────────
    if (req.method === 'GET') {
      let query = {};
      const targetTeacherId = role === 'assistant' ? parentId : userId;

      if (role === 'teacher' || role === 'assistant') {
        const myStudents = await Student.find({
          $or: [
            { teacherIds: targetTeacherId },
            { teacherId: targetTeacherId }
          ]
        }, '_id');

        const myStudentIds = myStudents.map(s => s._id.toString());

        query = {
          $or: [
            { teacherId: targetTeacherId },
            { studentId: { $in: myStudentIds } }
          ]
        };
      }

      const payments = await Payment.find(query).sort({ date: -1 });
      return res.status(200).json({ success: true, data: payments });
    }

    // ─── POST: to'lov qabul qilish ───────────────────────────────────────────
    if (req.method === 'POST') {
      const { studentId, studentName, groupName, amount, priceAtThatTime, paymentType, month, adminName, telegramChatId, targetTeacherId, isRestore } = req.body;

      if (!studentId || !studentName || !groupName || !amount || !paymentType || !month || !adminName) {
        return res.status(400).json({ success: false, message: "Barcha majburiy maydonlar to'ldirilishi shart" });
      }
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ success: false, message: "Noto'g'ri studentId" });
      }
      if (Number(amount) <= 0) {
        return res.status(400).json({ success: false, message: "Summa musbat bo'lishi kerak" });
      }

      const ownerId = role === 'assistant' ? parentId : userId;

      let finalOwnerId = targetTeacherId;
      const studentObj = await Student.findById(studentId);

      if (studentObj) {
        const gData = studentObj.groupsData?.find(g => g.name === groupName);
        if (gData?.teacherId) {
          finalOwnerId = gData.teacherId;
        } else if (!finalOwnerId) {
          finalOwnerId = studentObj.teacherIds?.[0] || studentObj.teacherId || ownerId;
        }
      } else if (!finalOwnerId) {
        finalOwnerId = ownerId;
      }

      // YANGI: har bir muvaffaqiyatli yuborilgan xabarni {chatId, messageId}
      // juftligi sifatida saqlaymiz — shunda keyinchalik AYNAN shu xabarlarni
      // o'chirish yoki tahrirlash mumkin bo'ladi (avval faqat bitta messageId
      // saqlanardi, qaysi chatga tegishli ekani noaniq edi).
      let telegramMessages = [];

      if (telegramChatId && !isRestore) {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const text = buildReceiptText({ studentName, groupName, amount, paymentType, month });
        const chatIds = parseChatIds(telegramChatId);

        const results = await Promise.allSettled(
          chatIds.map(cId => sendMessage(token, cId, text))
        );

        results.forEach((r, i) => {
          if (r.status === 'fulfilled' && r.value?.ok) {
            telegramMessages.push({ chatId: chatIds[i], messageId: r.value.result.message_id });
          }
        });
      }

      const newPayment = await Payment.create({
        studentId, studentName, groupName,
        amount,
        priceAtThatTime: priceAtThatTime || amount,
        paymentType, month, adminName, telegramChatId,
        telegramMessageId: telegramMessages[0]?.messageId || null, // orqaga moslik
        telegramMessages,
        teacherId: finalOwnerId
      });

      return res.status(201).json({ success: true, data: newPayment });
    }

    // ─── PUT: to'lovni tahrirlash (masalan, chegirma narxini keyin kiritish) ──
    if (req.method === 'PUT') {
      const id = req.query.id || req.body?.id;
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Noto'g'ri yoki bo'sh ID" });
      }

      const { amount, priceAtThatTime, paymentType, month } = req.body;

      if (amount !== undefined && Number(amount) <= 0) {
        return res.status(400).json({ success: false, message: "Summa musbat bo'lishi kerak" });
      }

      const existing = await Payment.findById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: "To'lov topilmadi" });
      }

      // Ruxsat: super_admin har narsani tahrirlaydi, teacher/assistant faqat
      // o'z kassasidagi (o'zining teacherId'siga tegishli) to'lovlarni.
      const ownerId = role === 'assistant' ? parentId : userId;
      if (role !== 'super_admin' && existing.teacherId !== ownerId) {
        return res.status(403).json({ success: false, message: "Siz faqat o'zingizning kassangizdagi to'lovlarni tahrirlay olasiz!" });
      }

      if (amount !== undefined) existing.amount = Number(amount);
      if (priceAtThatTime !== undefined) existing.priceAtThatTime = Number(priceAtThatTime);
      if (paymentType !== undefined) existing.paymentType = paymentType;
      if (month !== undefined) existing.month = month;

      await existing.save();

      // YANGI: Telegramdagi eski chekni O'CHIRIB-QAYTA YUBORISH o'rniga,
      // xuddi shu xabar ustida TAHRIRLASH (editMessageText) qilinadi — ota-ona
      // suhbatida ikkita chek qolib ketmasligi uchun.
      if (existing.telegramMessages?.length > 0) {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const newText = buildReceiptText(existing, true);

        await Promise.allSettled(
          existing.telegramMessages.map(m =>
            editMessageText(token, m.chatId, m.messageId, newText)
          )
        );
      }

      return res.status(200).json({ success: true, data: existing });
    }

    // ─── DELETE ───────────────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      const id = req.query.id || req.body?.id;

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Noto'g'ri yoki bo'sh ID" });
      }

      // FIX: o'chirishdan OLDIN Telegram xabarlarini yig'ib olamiz — chunki
      // o'chirilgandan keyin ma'lumot yo'qoladi.
      const existing = await Payment.findById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: "To'lov topilmadi" });
      }

      const token = process.env.TELEGRAM_BOT_TOKEN;
      const pairsToDelete = [];

      // Yangi (aniq) format
      if (Array.isArray(existing.telegramMessages)) {
        existing.telegramMessages.forEach(m => {
          if (m.chatId && m.messageId) pairsToDelete.push({ chatId: m.chatId, messageId: m.messageId });
        });
      }

      // Eski (aniqmas) format — orqaga moslik uchun. Bu yozuvda faqat bitta
      // messageId bor, lekin qaysi chatga tegishli ekani noma'lum edi, shuning
      // uchun barcha mumkin bo'lgan chatId'lar uchun sinab ko'ramiz (mos
      // kelmagani jimgina muvaffaqiyatsiz tugaydi, zarar yo'q).
      if (existing.telegramMessageId && existing.telegramChatId && pairsToDelete.length === 0) {
        parseChatIds(existing.telegramChatId).forEach(cId => {
          pairsToDelete.push({ chatId: cId, messageId: existing.telegramMessageId });
        });
      }

      if (token && pairsToDelete.length > 0) {
        await Promise.allSettled(
          pairsToDelete.map(p => deleteMessage(token, p.chatId, p.messageId))
        );
      }

      await Payment.findByIdAndDelete(id);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ message: "Metod ruxsat etilmagan" });
  } catch (error) {
    console.error("To'lov API Xatosi:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}