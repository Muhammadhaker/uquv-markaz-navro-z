import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

// Chiqimlar uchun maxsus sxema
const expenseSchema = new mongoose.Schema({
  reason: { type: String, required: true }, // Nima uchun sarflandi?
  amount: { type: Number, required: true }, // Qancha sarflandi?
  month: { type: String, required: true },  // Qaysi oy uchun?
  adminName: { type: String, default: "Admin" },
  date: { type: Date, default: Date.now }
});

const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema, 'expenses');

export default async function handler(req, res) {
  await connectDB();

  if (req.method === 'GET') {
    try {
      const expenses = await Expense.find({}).sort({ date: -1 });
      return res.status(200).json({ success: true, data: expenses });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const newExpense = await Expense.create(req.body);
      return res.status(201).json({ success: true, data: newExpense });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.body;
      await Expense.findByIdAndDelete(id);
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  return res.status(405).json({ message: "Ruxsat etilmagan metod" });
}