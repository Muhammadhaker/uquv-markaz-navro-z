import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI topilmadi!");
  return mongoose.connect(process.env.MONGODB_URI);
};

// Xarajatlar uchun maxsus Mongoose Schema qolipi
const expenseSchema = new mongoose.Schema({
  reason: { type: String, required: true },
  amount: { type: Number, required: true },
  month: { type: String, required: true },
  adminName: { type: String, default: "Admin" },
  date: { type: Date, default: Date.now }
});

const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema, 'expenses');

export default async function handler(req, res) {
  try {
    await connectDB();

    // GET: Xarajatlarni o'qish (Dashboard ga berish)
    if (req.method === 'GET') {
      const expenses = await Expense.find({}).sort({ date: -1 });
      return res.status(200).json({ success: true, data: expenses });
    }

    // POST: Yangi xarajat qo'shish (Xarajat tugmasi bosilganda)
    if (req.method === 'POST') {
      const { reason, amount, month, adminName } = req.body;
      const newExpense = await Expense.create({ reason, amount, month, adminName });
      return res.status(201).json({ success: true, data: newExpense });
    }

    // DELETE: Xarajatni o'chirish (Savat tugmasi bosilganda)
    if (req.method === 'DELETE') {
      const { id } = req.body;
      await Expense.findByIdAndDelete(id);
      return res.status(200).json({ success: true, message: "O'chirildi" });
    }

    res.status(405).json({ message: "Metod ruxsat etilmagan" });

  } catch (error) {
    console.error("Expense API XATOSI:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}