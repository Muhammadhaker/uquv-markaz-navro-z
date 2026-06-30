import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

// 🔥 Multi-role tizimi: Super Admin, Teacher va Assistant
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'teacher', 'assistant'], default: 'teacher' },
  parentTeacherId: { type: String, default: null }, // Yordamchi qaysi ustozga tegishli ekanligi
  permissions: { type: Array, default: ['davomat', 'guruhlar'] }, // Yordamchining maxsus ruxsatlari
  loginHistory: { type: Array, default: [] }, 
  addedAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default async function handler(req, res) {
  await connectDB();

  // DOIMIY ADMINLARNI TEKSHIRISH VA YARATISH
  try {
    const defaultUsers = [
      { username: "Navroz", password: "Navroz", role: "super_admin", permissions: ['all'] },
      { username: "muhammad", password: "kaneki235", role: "teacher", permissions: ['all'] }
    ];
    for (const dUser of defaultUsers) {
      const exists = await User.findOne({ username: dUser.username });
      if (!exists) {
        await User.create(dUser);
      }
    }
  } catch (err) {
    console.error("Default users error:", err);
  }

  // =======================================================
  // 1. TIZIMGA KIRISH (LOGIN) — POST
  // =======================================================
  if (req.method === 'POST' && req.body.action !== 'create') {
    const { username, password } = req.body;
    try {
      const user = await User.findOne({ username, password });
      
      if (user) {
        const userAgent = req.headers['user-agent'] || '';
        let deviceName = 'Noma\'lum qurilma';

        if (/iPhone/i.test(userAgent)) deviceName = 'iPhone';
        else if (/Samsung|SM-[A-Z0-9]+/i.test(userAgent)) deviceName = userAgent.match(/SM-[A-Z0-9]+/i)?.[0] || 'Samsung Device';
        else if (/Redmi|Mi|Xiaomi/i.test(userAgent)) deviceName = userAgent.match(/(Redmi|Mi|Xiaomi) [A-Z0-9]+/i)?.[0] || 'Xiaomi Device';
        else if (/Windows NT/i.test(userAgent)) deviceName = 'Windows PC';
        else if (/Macintosh/i.test(userAgent)) deviceName = 'MacBook / Mac';
        else if (/Android/i.test(userAgent)) {
            const match = userAgent.match(/\(([^)]+)\)/);
            deviceName = match ? match[1].split(';')[1]?.trim() || 'Android Device' : 'Android Device';
        }

        const newLogin = { device: deviceName, time: new Date() };

        if (!user.loginHistory) user.loginHistory = [];
        user.loginHistory.unshift(newLogin);
        if (user.loginHistory.length > 5) user.loginHistory = user.loginHistory.slice(0, 5);
        await user.save();

        // 🔥 Oynalarni filtrlash uchun barcha kerakli ma'lumotlar yuboriladi
        return res.status(200).json({ 
            success: true, 
            userId: user._id,
            role: user.role, 
            username: user.username,
            permissions: user.permissions,
            parentTeacherId: user.parentTeacherId
        });
      }
      return res.status(401).json({ success: false, message: "Login yoki parol xato!" });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // =======================================================
  // 2. YANGI FOYDALANUVCHI YARATISH (USTOZ/YORDAMCHI) — POST
  // =======================================================
  if (req.method === 'POST' && req.body.action === 'create') {
      const { username, password, role, parentTeacherId, permissions } = req.body;
      try {
          const exists = await User.findOne({ username });
          if (exists) return res.status(400).json({ success: false, message: "Bu login band!" });

          await User.create({
              username,
              password,
              role: role || 'teacher',
              parentTeacherId: role === 'assistant' ? parentTeacherId : null,
              permissions: role === 'assistant' ? (permissions || ['davomat', 'guruhlar']) : ['all']
          });

          return res.status(200).json({ success: true, message: "Muvaffaqiyatli saqlandi!" });
      } catch (error) {
          return res.status(500).json({ success: false, error: error.message });
      }
  }

  // =======================================================
  // 3. FOYDALANUVCHILAR RO'YXATINI OLISH — GET
  // =======================================================
  if (req.method === 'GET') {
    try {
      const users = await User.find({}).sort({ addedAt: -1 });
      return res.status(200).json({ success: true, data: users });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // =======================================================
  // 4. FOYDALANUVCHINI O'CHIRISH — DELETE
  // =======================================================
  if (req.method === 'DELETE') {
    const { id } = req.body;
    try {
      const userToDelete = await User.findById(id);
      if (userToDelete && userToDelete.username === "Navroz") {
        return res.status(400).json({ success: false, message: "Asosiy Super Adminni o'chirib bo'lmaydi!" });
      }
      await User.findByIdAndDelete(id);
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  res.status(405).json({ message: "Metod ruxsat etilmagan" });
}