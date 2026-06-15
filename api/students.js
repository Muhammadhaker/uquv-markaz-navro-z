import mongoose from 'mongoose';

// Modelni qayta-qayta yaratmaslik uchun
const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({
  name: String,
  phone: String,
  group: String,
  addedAt: { type: Date, default: Date.now }
}));

export default async function handler(req, res) {
  console.log("API chaqirildi, metod:", req.method);
  
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI topilmadi!");
    }

    if (mongoose.connection.readyState !== 1) {
      console.log("Bazaga ulanish boshlanmoqda...");
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("Baza ulanishi muvaffaqiyatli!");
    }

    if (req.method === 'GET') {
      const students = await Student.find({}).sort({ addedAt: -1 });
      console.log("Topilgan o'quvchilar soni:", students.length);
      return res.status(200).json({ success: true, data: students });
    }

    res.status(405).json({ message: "Metod noto'g'ri" });
  } catch (error) {
    console.error("KRITIK XATOLIK:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}