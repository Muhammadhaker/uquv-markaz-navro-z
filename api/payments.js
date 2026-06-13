import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

// Yangilangan To'lov sxemasi
const paymentSchema = new mongoose.Schema({
  studentId: { type: String, required: true }, // ObjectId o'rniga String qildik
  studentName: { type: String, required: true }, // Dashboardda ismini ko'rsatish uchun
  groupName: { type: String, required: true }, // Qaysi fan uchun to'layotgani
  amount: { type: Number, required: true },
  paymentType: { type: String, enum: ['Naqd', 'Plastik'], required: true },
  month: { type: String, required: true }, // Kalendardan keladigan sana (Masalan: "2024-05")
  adminName: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

export default async function handler(req, res) {
  await connectDB();

  if (req.method === 'GET') {
    try {
      const payments = await Payment.find({}).sort({ date: -1 });
      return res.status(200).json({ success: true, data: payments });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

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