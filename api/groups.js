import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

// 🔥 YANGI: teacherId maydoni qo'shildi
const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  teacher: { type: String, required: true },
  price: { type: Number, required: true },
  teacherId: { type: String, required: true }
});

const Group = mongoose.models.Group || mongoose.model('Group', groupSchema);

export default async function handler(req, res) {
  await connectDB();
  
  try {
    const role = req.headers['x-user-role'];
    const userId = req.headers['x-user-id'];
    const parentId = req.headers['x-parent-id'];

    if (req.method === 'GET') {
      let query = {};
      if (role === 'teacher') query = { teacherId: userId };
      else if (role === 'assistant') query = { teacherId: parentId };

      const groups = await Group.find(query);
      return res.status(200).json({ success: true, data: groups });
    } 
    
    if (req.method === 'POST') {
      const ownerId = role === 'assistant' ? parentId : userId;
      const newGroup = await Group.create({ ...req.body, teacherId: ownerId });
      return res.status(201).json({ success: true, data: newGroup });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      await Group.findByIdAndDelete(id);
      return res.status(200).json({ success: true });
    }

    res.status(405).json({ message: "Metod ruxsat etilmagan" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}