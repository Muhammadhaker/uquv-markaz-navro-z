import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI topilmadi!");
  return mongoose.connect(process.env.MONGODB_URI);
};

// Birlashtirilgan va to'g'rilangan sxema
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  parentName: { type: String, required: true }, // Endi bu ham majburiy
  phone: { type: String, required: true },
  group: { type: String, required: true },
  telegramChatId: { type: String, default: null },
  addedAt: { type: Date, default: Date.now }
});

const Student = mongoose.models.Student || mongoose.model('Student', studentSchema, 'students');

export default async function handler(req, res) {
  try {
    await connectDB();

    if (req.method === 'GET') {
      const students = await Student.find({}).sort({ addedAt: -1 });
      return res.status(200).json({ success: true, data: students });
    }

    if (req.method === 'POST') {
      const newStudent = await Student.create(req.body);
      return res.status(201).json({ success: true, data: newStudent });
    }

    if (req.method === 'PUT') {
      const { id, ...updateData } = req.body;
      const updatedStudent = await Student.findByIdAndUpdate(id, updateData, { new: true });
      return res.status(200).json({ success: true, data: updatedStudent });
    }

    if (req.method === 'DELETE') {
      await Student.findByIdAndDelete(req.body.id);
      return res.status(200).json({ success: true });
    }

    res.status(405).json({ message: "Metod ruxsat etilmagan" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}