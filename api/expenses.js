import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI topilmadi!");
  return mongoose.connect(process.env.MONGODB_URI);
};

const expenseSchema = new mongoose.Schema({
  reason: { type: String, required: true },
  amount: { type: Number, required: true },
  month: { type: String, required: true },
  adminName: { type: String, default: "Admin" },
  teacherId: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema, 'expenses');

export default async function handler(req, res) {
  try {
    await connectDB();

    const role     = req.headers['x-user-role'];
    const userId   = req.headers['x-user-id'];
    const parentId = req.headers['x-parent-id'];

    // ─── GET: Xarajatlarni o'qish ───────────────────────────────────────────────
    if (req.method === 'GET') {
      let query = {};
      if (role === 'teacher') query = { teacherId: userId };
      else if (role === 'assistant') query = { teacherId: parentId };

      const expenses = await Expense.find(query).sort({ date: -1 });
      return res.status(200).json({ success: true, data: expenses });
    }

    // ─── POST: Yangi xarajat qo'shish ───────────────────────────────────────────
    if (req.method === 'POST') {
      const { reason, amount, month } = req.body;

      // FIX: Validatsiya qo'shildi — avval hech narsa tekshirilmasdi
      if (!reason || !String(reason).trim()) {
        return res.status(400).json({ success: false, message: "Xarajat sababi kiritilishi shart" });
      }
      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ success: false, message: "Summa musbat son bo'lishi kerak" });
      }
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ success: false, message: "Oy noto'g'ri formatda (YYYY-MM kerak)" });
      }

      const ownerId = role === 'assistant' ? parentId : userId;
      if (!ownerId) {
        return res.status(400).json({ success: false, message: "Foydalanuvchi aniqlanmadi" });
      }

      // adminName — headerdan emas, requestdan olinadi (frontend localStorage
      // dan yuboradi), lekin bo'sh bo'lsa xavfsiz default beramiz
      const adminName = req.body.adminName || "Admin";

      const newExpense = await Expense.create({
        reason: String(reason).trim(),
        amount: Number(amount),
        month,
        adminName,
        teacherId: ownerId
      });

      return res.status(201).json({ success: true, data: newExpense });
    }

    // ─── DELETE: Xarajatni o'chirish ────────────────────────────────────────────
    if (req.method === 'DELETE') {
      // FIX: id endi query paramdan ham qabul qilinadi (DELETE + body HTTP
      // standartiga zid bo'lgani uchun). Eski frontendlar bilan moslik uchun
      // body ham hali qo'llab-quvvatlanadi.
      const id = req.query.id || req.body?.id;

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Noto'g'ri yoki bo'sh ID" });
      }

      const expense = await Expense.findById(id);

      // FIX: eng jiddiy xato — avvalgi versiyada `expense` null bo'lsa,
      // keyingi qatordagi `expense.teacherId` chaqiruvi serverni 500 xato
      // bilan crash qilardi. Endi avval mavjudligini tekshiramiz.
      if (!expense) {
        return res.status(404).json({ success: false, message: "Xarajat topilmadi" });
      }

      const ownerId = role === 'assistant' ? parentId : userId;
      if (role !== 'super_admin' && expense.teacherId !== ownerId) {
        return res.status(403).json({ success: false, message: "Siz faqat o'zingizning kassangizdagi xarajatlarni o'chira olasiz!" });
      }

      await Expense.findByIdAndDelete(id);
      return res.status(200).json({ success: true, message: "O'chirildi" });
    }

    return res.status(405).json({ message: "Metod ruxsat etilmagan" });

  } catch (error) {
    console.error("Expense API XATOSI:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}