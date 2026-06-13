import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

// O'quvchi sxemasi
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  group: { type: String, required: true },
  addedAt: { type: Date, default: Date.now }
});

const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);

export default async function handler(req, res) {
  await connectDB();

  // O'quvchilarni bazadan olib kelish (GET)
  if (req.method === 'GET') {
    try {
      const students = await Student.find({}).sort({ addedAt: -1 });
      return res.status(200).json({ success: true, data: students });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // Yangi o'quvchi qo'shish (POST)
  if (req.method === 'POST') {
    try {
      const newStudent = await Student.create(req.body);
      return res.status(201).json({ success: true, data: newStudent });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // O'quvchini o'chirish (DELETE)
  if (req.method === 'DELETE') {
    try {
      const { id } = req.body;
      await Student.findByIdAndDelete(id);
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  res.status(405).json({ message: "Faqat GET, POST va DELETE qabul qilinadi" });
}