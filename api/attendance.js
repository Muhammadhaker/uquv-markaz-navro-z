import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

// Davomat Sxemasi
const attendanceSchema = new mongoose.Schema({
  groupName: { type: String, required: true },
  date: { type: String, required: true }, // "YYYY-MM-DD" formatda
  records: [
    {
      studentId: { type: String, required: true },
      studentName: { type: String, required: true },
      status: { type: String, enum: ['keldi', 'kelmadi'], required: true }
    }
  ],
  adminName: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
});

// Guruh bo'yicha indekslash (qidiruv tez bo'lishi uchun)
attendanceSchema.index({ groupName: 1, date: 1 }, { unique: true });

const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

export default async function handler(req, res) {
  await connectDB();

  // 1. Ma'lum bir guruh va sana bo'yicha davomatni olib kelish (GET)
  if (req.method === 'GET') {
    const { groupName, date } = req.query;
    try {
      const record = await Attendance.findOne({ groupName, date });
      return res.status(200).json({ success: true, data: record });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // 2. Davomatni saqlash yoki mavjud bo'lsa yangilash (POST)
  if (req.method === 'POST') {
    const { groupName, date, records, adminName } = req.body;
    try {
      // findOneAndUpdate yordamida dublikat bo'lishining oldini olamiz
      const updatedAttendance = await Attendance.findOneAndUpdate(
        { groupName, date },
        { groupName, date, records, adminName, updatedAt: new Date() },
        { uppercase: true, new: true, upsert: true }
      );
      return res.status(200).json({ success: true, data: updatedAttendance });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  res.status(405).json({ message: "Metod ruxsat etilmagan" });
}