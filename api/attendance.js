import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI topilmadi!");
  return mongoose.connect(process.env.MONGODB_URI);
};

const attendanceSchema = new mongoose.Schema({
  groupName: { type: String, required: true },
  date: { type: String, required: true },
  adminName: { type: String, required: true },
  records: [{
    studentId: String,
    studentName: String,
    status: String
  }],
  createdAt: { type: Date, default: Date.now }
});

// Uchinchi parametr 'attendances' aniq ko'rsatildi
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema, 'attendances');

export default async function handler(req, res) {
  try {
    await connectDB();
    
    if (req.method === 'GET') {
      const { groupName, date } = req.query;
      const data = await Attendance.findOne({ groupName, date });
      return res.status(200).json({ success: true, data });
    }
    
    if (req.method === 'POST') {
      const { groupName, date, adminName, records } = req.body;
      
      // Eski davomat bo'lsa uni yangilaymiz, yo'q bo'lsa yangi yaratamiz (upsert: true)
      const data = await Attendance.findOneAndUpdate(
        { groupName, date },
        { groupName, date, adminName, records },
        { new: true, upsert: true }
      );
      return res.status(200).json({ success: true, data });
    }
    
    res.status(405).json({ message: "Metod ruxsat etilmagan" });
  } catch (error) {
    console.error("Attendance API Xatosi:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}