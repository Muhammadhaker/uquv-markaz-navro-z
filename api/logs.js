import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

const logSchema = new mongoose.Schema({
  adminName: { type: String, required: true },
  actionType: { type: String, required: true },
  details: { type: String, required: true },
  targetApi: { type: String, default: null }, 
  deletedData: { type: Object, default: null }, 
  createdAt: { type: Date, default: Date.now }
});

const Log = mongoose.models.Log || mongoose.model('Log', logSchema);

export default async function handler(req, res) {
  await connectDB();

  if (req.method === 'GET') {
    try {
      // 🔥 48 soatlik cheklov OLIB TASHLANDI! 
      // Endi barcha tarix chiqadi (xotira to'lib qolmasligi uchun oxirgi 2000 tasi)
      const logs = await Log.find({}).sort({ createdAt: -1 }).limit(2000);
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

  // Tarixni butunlay tozalash
  if (req.method === 'DELETE') {
    try {
      await Log.deleteMany({}); // Bazadagi hamma loglarni o'chiradi
      return res.status(200).json({ success: true, message: "Barcha tarix tozalandi" });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  return res.status(405).json({ message: "Ruxsat etilmagan metod" });
}