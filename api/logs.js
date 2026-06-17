import mongoose from 'mongoose';

// MongoDB ga ulanish
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

// Log sxemasi (qanday ma'lumotlar saqlanishi)
const logSchema = new mongoose.Schema({
  adminName: { type: String, required: true },
  actionType: { type: String, required: true }, // 'delete', 'update', 'create'
  details: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Modelni yaratish (Vercel xato bermasligi uchun tekshiruv bilan)
const Log = mongoose.models.Log || mongoose.model('Log', logSchema);

export default async function handler(req, res) {
  await connectDB();

  // 1. GET: Tarixni o'qish (Faqat oxirgi 48 soat)
  if (req.method === 'GET') {
    try {
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      
      const logs = await Log.find({
        createdAt: { $gte: fortyEightHoursAgo }
      }).sort({ createdAt: -1 }); // Eng yangilari birinchi chiqadi

      return res.status(200).json({ success: true, data: logs });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
  
  // 2. POST: Yangi tarix yozish
  if (req.method === 'POST') {
    try {
      const { adminName, actionType, details } = req.body;
      const newLog = await Log.create({ adminName, actionType, details });
      return res.status(201).json({ success: true, data: newLog });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // Boshqa so'rovlarni bloklash
  return res.status(405).json({ message: "Ruxsat etilmagan metod" });
}