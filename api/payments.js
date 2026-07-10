import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI topilmadi!");
  return mongoose.connect(process.env.MONGODB_URI);
};

const paymentSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  groupName: { type: String, required: true },
  amount: { type: Number, required: true },
  priceAtThatTime: { type: Number },
  paymentType: { type: String, required: true },
  month: { type: String, required: true },
  date: { type: Date, default: Date.now },
  adminName: { type: String, required: true },
  telegramChatId: { type: String },
  telegramMessageId: { type: Number },
  teacherId: { type: String, required: true }
});

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema, 'payments');
const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({}, { strict: false }), 'students');

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
      const { studentId, studentName, groupName, amount, priceAtThatTime, paymentType, month, adminName, telegramChatId, targetTeacherId } = req.body;

      // FIX: asosiy maydonlar validatsiyasi — avval yo'q edi
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

      let messageId = null;

      // FIX: telegramChatId endi vergul bilan ajratilgan bir nechta ID bo'lishi
      // mumkinligini hisobga oladi — avval faqat bittasiga yuborilardi.
      if (telegramChatId) {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const formatMonthName = (m) => {
          const [y, mm] = m.split("-");
          const names = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
          return `${names[parseInt(mm) - 1]} ${y}`;
        };

        const text = `🧾 *TO'LOV CHEKI*\n\n👤 *O'quvchi:* ${studentName}\n📚 *Fan/Guruh:* ${groupName}\n💰 *Summa:* ${Number(amount).toLocaleString()} so'm\n💳 *Turi:* ${paymentType}\n📅 *Oy:* ${formatMonthName(month)}\n\n✅ _To'lov muvaffaqiyatli qabul qilindi!_`;

        const chatIds = String(telegramChatId).split(',').map(id => id.trim()).filter(id => /^\d{6,}$/.test(id));

        const results = await Promise.allSettled(
          chatIds.map(cId =>
            fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: cId, text, parse_mode: 'Markdown' })
            }).then(r => r.json())
          )
        );

        // Birinchi muvaffaqiyatli xabar ID sini saqlaymiz (chek qaytarish uchun)
        const firstOk = results.find(r => r.status === 'fulfilled' && r.value?.ok);
        if (firstOk) messageId = firstOk.value.result.message_id;
      }

      const newPayment = await Payment.create({
        studentId, studentName, groupName,
        amount,
        priceAtThatTime: priceAtThatTime || amount,
        paymentType, month, adminName, telegramChatId,
        telegramMessageId: messageId,
        teacherId: finalOwnerId
      });

      return res.status(201).json({ success: true, data: newPayment });
    }

    // ─── DELETE ───────────────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      // FIX: id endi query paramdan olinadi — DELETE so'rovida body ishlatish
      // HTTP standartiga zid, ba'zi proksi/browser buni tashlab yuboradi.
      // Eski frontend `body: JSON.stringify({ id })` yuborishi mumkin — shuning
      // uchun ikkalasini ham qo'llab-quvvatlaymiz (moslashuvchan o'tish davri uchun).
      const id = req.query.id || req.body?.id;

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Noto'g'ri yoki bo'sh ID" });
      }

      const deleted = await Payment.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: "To'lov topilmadi" });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ message: "Metod ruxsat etilmagan" });
  } catch (error) {
    console.error("To'lov API Xatosi:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}