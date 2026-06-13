import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

const paymentSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  groupName: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentType: { type: String, enum: ['Naqd', 'Plastik'], required: true },
  month: { type: String, required: true },
  adminName: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

export default async function handler(req, res) {
  await connectDB();

  // Barcha to'lovlarni olish (GET)
  if (req.method === 'GET') {
    try {
      const payments = await Payment.find({}).sort({ date: -1 });
      return res.status(200).json({ success: true, data: payments });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // Yangi to'lov qo'shish (POST)
  if (req.method === 'POST') {
    try {
      const newPayment = await Payment.create(req.body);
      return res.status(201).json({ success: true, data: newPayment });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // To'lovni O'chirish (DELETE)
  if (req.method === 'DELETE') {
    try {
      const { id } = req.body;
      await Payment.findByIdAndDelete(id);
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // To'lovni Tahrirlash (PUT)
  if (req.method === 'PUT') {
    try {
      const { id, amount, paymentType, month } = req.body;
      const updatedPayment = await Payment.findByIdAndUpdate(
        id, 
        { amount, paymentType, month },
        { new: true }
      );
      return res.status(200).json({ success: true, data: updatedPayment });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  res.status(405).json({ message: "Metod ruxsat etilmagan" });
}