import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI topilmadi!");
  return mongoose.connect(process.env.MONGODB_URI);
};

// 🔥 YANGI: Xarajat qaysi ustozning pulidan ketganini bilish uchun teacherId qo'shildi
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

    const role = req.headers['x-user-role'];
    const userId = req.headers['x-user-id'];
    const parentId = req.headers['x-parent-id'];

    // GET: Xarajatlarni o'qish 
    if (req.method === 'GET') {
      let query = {};
      if (role === 'teacher') query = { teacherId: userId };
      else if (role === 'assistant') query = { teacherId: parentId };

      const expenses = await Expense.find(query).sort({ date: -1 });
      return res.status(200).json({ success: true, data: expenses });
    }

    // POST: Yangi xarajat qo'shish
    if (req.method === 'POST') {
      const { reason, amount, month, adminName } = req.body;
      const ownerId = role === 'assistant' ? parentId : userId;

      const newExpense = await Expense.create({ reason, amount, month, adminName, teacherId: ownerId });
      return res.status(201).json({ success: true, data: newExpense });
    }

    // DELETE: Xarajatni o'chirish
    if (req.method === 'DELETE') {
      const { id } = req.body;
      const expense = await Expense.findById(id);

      const ownerId = role === 'assistant' ? parentId : userId;
      if (role !== 'super_admin' && expense.teacherId !== ownerId) {
         return res.status(403).json({ success: false, message: "Siz faqat o'zingizning kassangizdagi xarajatlarni o'chira olasiz!" });
      }

      await Expense.findByIdAndDelete(id);
      return res.status(200).json({ success: true, message: "O'chirildi" });
    }

    res.status(405).json({ message: "Metod ruxsat etilmagan" });

  } catch (error) {
    console.error("Expense API XATOSI:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}