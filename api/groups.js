import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

// Guruh sxemasi
const groupSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Masalan: "Ingliz tili - Beginer"
  teacher: { type: String, required: true }, // O'qituvchi ismi
  price: { type: Number, required: true } // Oylik to'lov summasi
});

const Group = mongoose.models.Group || mongoose.model('Group', groupSchema);

export default async function handler(req, res) {
  await connectDB();

  // Guruhlarni o'qib olish
  if (req.method === 'GET') {
    try {
      const groups = await Group.find({});
      return res.status(200).json({ success: true, data: groups });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // Yangi guruh qo'shish
  if (req.method === 'POST') {
    try {
      const newGroup = new Group(req.body);
      await newGroup.save();
      return res.status(201).json({ success: true, data: newGroup });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  res.status(405).json({ message: "Faqat GET va POST so'rov qabul qilinadi" });
}