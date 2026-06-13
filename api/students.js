import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

// O'quvchi sxemasi
const studentSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  joinDate: { type: Date, default: Date.now }
});

const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);

export default async function handler(req, res) {
  await connectDB();

  // O'quvchilarni guruh bo'yicha yoki umumiy olish
  if (req.method === 'GET') {
    const { groupId } = req.query; // Havolada ?groupId=... bo'lsa
    try {
      const filter = groupId ? { groupId } : {};
      const students = await Student.find(filter);
      return res.status(200).json({ success: true, data: students });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // Yangi o'quvchi qo'shish
  if (req.method === 'POST') {
    try {
      const newStudent = new Student(req.body);
      await newStudent.save();
      return res.status(201).json({ success: true, data: newStudent });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  res.status(405).json({ message: "Metod ruxsat etilmagan" });
}