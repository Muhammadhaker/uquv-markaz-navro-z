import mongoose from 'mongoose';

// Bazaga ulanish funksiyasi
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

// Admin va Bosh admin sxemasi
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'admin'], default: 'admin' }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default async function handler(req, res) {
  await connectDB();

  // BAZA BO'SH BO'LSA AVTOMATIK BOSH ADMIN YARATISH QISMI
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      await User.create({
        username: "Navro'z",
        password: "Real Madrid",
        role: "super_admin"
      });
      console.log("Dastlabki Bosh Admin (Navro'z) yaratildi!");
    }
  } catch (err) {
    console.error("Admin yaratishda xatolik:", err);
  }

  // TIZIMGA KIRISH (LOGIN) SO'ROVINI QABUL QILISH
  if (req.method === 'POST') {
    const { username, password } = req.body;
    try {
      const user = await User.findOne({ username, password });
      
      if (user) {
        return res.status(200).json({ 
          success: true, 
          role: user.role, 
          username: user.username 
        });
      }
      return res.status(401).json({ success: false, message: "Login yoki parol xato!" });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
  
  res.status(405).json({ message: "Faqat POST so'rov qabul qilinadi" });
}