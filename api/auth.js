import mongoose from 'mongoose';

// Bazaga ulanish
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

// User sxemasi
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'admin'], default: 'admin' }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default async function handler(req, res) {
  // Avval bazaga ulanamiz
  try {
    await connectDB();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Bazaga ulanishda xatolik", error: error.message });
  }

  // DOIMIY ADMINLARNI TEKSHIRISH VA YARATISH (Baza bo'sh bo'lishidan qat'iy nazar)
  try {
    const defaultUsers = [
      { username: "Navro'z", password: "Real Madrid", role: "super_admin" },
      { username: "muhammad", password: "kaneki235", role: "admin" }
    ];

    for (const dUser of defaultUsers) {
      // Shu ismli admin bormi yoki yo'qmi tekshiramiz
      const exists = await User.findOne({ username: dUser.username });
      if (!exists) {
        // Yo'q bo'lsa, avtomat yaratamiz
        await User.create(dUser);
        console.log(`${dUser.username} yaratildi!`);
      }
    }
  } catch (err) {
    console.error("Doimiy adminlarni yaratishda xato:", err);
  }

  // TIZIMGA KIRISH (LOGIN) LOGIKASI
  if (req.method === 'POST') {
    const { username, password } = req.body;
    try {
      // Kiritilgan login va parol mosligini tekshirish
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