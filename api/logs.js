import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

const logSchema = new mongoose.Schema({
  adminName: { type: String, required: true },
  actionType: { type: String, required: true },
  details: { type: String, required: true },
  targetApi: { type: String, default: null }, // Tiklash uchun qaysi API ga yuborish kerakligi
  deletedData: { type: Object, default: null }, // O'chirilgan ma'lumotning o'zi xotirada qoladi
  createdAt: { type: Date, default: Date.now }
});

const Log = mongoose.models.Log || mongoose.model('Log', logSchema);

export default async function handler(req, res) {
  await connectDB();

  if (req.method === 'GET') {
    try {
      // Faqat oxirgi 48 soatni tortib olish
      const logs = await Log.find({
        createdAt: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) }
      }).sort({ createdAt: -1 });
      return res.status(200).json({ success: true, data: logs });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
  
  if (req.method === 'POST') {
    try {
      const newLog = await Log.create(req.body);
      return res.status(201).json({ success: true, data: newLog });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  return res.status(405).json({ message: "Ruxsat etilmagan metod" });
}