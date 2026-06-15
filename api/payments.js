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
  paymentType: { type: String, enum: ['Naqd', 'Plastik'], required: true },
  month: { type: String, required: true },
  adminName: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

// DIQQAT: Uchinchi parametr 'payments' aniq ko'rsatildi
const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema, 'payments');

export default async function handler(req, res) {
  try {
    await connectDB();
    if (req.method === 'GET') {
      const payments = await Payment.find({}).sort({ date: -1 });
      return res.status(200).json({ success: true, data: payments });
    }
    if (req.method === 'POST') {
      const newPayment = await Payment.create(req.body);
      return res.status(201).json({ success: true, data: newPayment });
    }
    if (req.method === 'DELETE') {
      await Payment.findByIdAndDelete(req.body.id);
      return res.status(200).json({ success: true });
    }
    if (req.method === 'PUT') {
      const { id, ...updateData } = req.body;
      const updated = await Payment.findByIdAndUpdate(id, updateData, { new: true });
      return res.status(200).json({ success: true, data: updated });
    }
    res.status(405).json({ message: "Metod ruxsat etilmagan" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}