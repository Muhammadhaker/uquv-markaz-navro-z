import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

// To'lov sxemasi
const paymentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  amount: { type: Number, required: true },
  paymentType: { type: String, enum: ['Naqd', 'Plastik'], required: true },
  month: { type: String, required: true }, // Masalan: "Noyabr"
  adminName: { type: String, required: true }, // Pulni qabul qilgan admin
  date: { type: Date, default: Date.now }
});

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

export default async function handler(req, res) {
  await connectDB();

  // Barcha to'lovlarni olish (Bosh admin statistikasi uchun)
  if (req.method === 'GET') {
    try {
      // Eng oxirgi to'lovlar birinchi chiqishi uchun sort(-1)
      const payments = await Payment.find({}).sort({ date: -1 });
      return res.status(200).json({ success: true, data: payments });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // Yangi to'lovni bazaga yozish (Admin to'lov qabul qilganda)
  if (req.method === 'POST') {
    try {
      const newPayment = new Payment(req.body);
      await newPayment.save();
      return res.status(201).json({ success: true, data: newPayment });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  res.status(405).json({ message: "Metod ruxsat etilmagan" });
}