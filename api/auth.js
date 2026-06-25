import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

// 🔥 YANGILANISH: lastLogin o'rniga loginHistory (tarix ro'yxati) qo'shildi
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'admin'], default: 'admin' },
  loginHistory: { type: Array, default: [] }, // <-- Barcha kirishlar shu yerga yig'iladi
  addedAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default async function handler(req, res) {
  await connectDB();

  // DOIMIY ADMINLARNI TEKSHIRISH VA AVTOMAT YARATISH
  try {
    const defaultUsers = [
      { username: "Navroz", password: "Navroz", role: "super_admin" },
      { username: "muhammad", password: "kaneki235", role: "admin" }
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

  // 1. TIZIMGA KIRISH (LOGIN) — POST
  if (req.method === 'POST' && req.body.action !== 'create') {
    const { username, password } = req.body;
    try {
      const user = await User.findOne({ username, password });
      
      if (user) {
        // QURILMANI ANIQLASH
        const userAgent = req.headers['user-agent'] || '';
        let deviceName = 'Noma\'lum qurilma';

        if (/iphone|ipad|ipod/i.test(userAgent)) deviceName = 'iPhone / iOS';
        else if (/android/i.test(userAgent)) deviceName = 'Android';
        else if (/windows/i.test(userAgent)) deviceName = 'Windows PC';
        else if (/macintosh|mac os/i.test(userAgent)) deviceName = 'MacBook / Apple';
        else if (/linux/i.test(userAgent)) deviceName = 'Linux PC';

        // 🔥 Tarixga yangi kirishni qo'shamiz
        const newLogin = {
          device: deviceName,
          time: new Date()
        };

        if (!user.loginHistory) user.loginHistory = [];
        
        // Yangi kirishni ro'yxat boshiga qo'shamiz
        user.loginHistory.unshift(newLogin);
        
        // Baza to'lib ketmasligi uchun faqat eng oxirgi 5 ta tarixni olib qolamiz
        if (user.loginHistory.length > 5) {
          user.loginHistory = user.loginHistory.slice(0, 5);
        }

        await user.save();

        return res.status(200).json({ success: true, role: user.role, username: user.username });
      }
      return res.status(401).json({ success: false, message: "Login yoki parol xato!" });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

// 1. TIZIMGA KIRISH (LOGIN) — POST
  if (req.method === 'POST' && req.body.action !== 'create') {
    const { username, password } = req.body;
    try {
      const user = await User.findOne({ username, password });
      
      if (user) {
        // 🔥 QURILMA MODELINI ANIQLASH (Model nomi bilan birga)
        const userAgent = req.headers['user-agent'] || '';
        let deviceName = 'Noma\'lum qurilma';

        // iPhone modellarini aniqlash
        if (/iPhone/i.test(userAgent)) {
            deviceName = 'iPhone';
        } 
        // Samsung modellarini aniqlash
        else if (/Samsung|SM-[A-Z0-9]+/i.test(userAgent)) {
            deviceName = userAgent.match(/SM-[A-Z0-9]+/i)?.[0] || 'Samsung Device';
        }
        // Xiaomi modellarini aniqlash
        else if (/Redmi|Mi|Xiaomi/i.test(userAgent)) {
            deviceName = userAgent.match(/(Redmi|Mi|Xiaomi) [A-Z0-9]+/i)?.[0] || 'Xiaomi Device';
        }
        // Windows/Mac/Linux kompyuterlar
        else if (/Windows NT/i.test(userAgent)) deviceName = 'Windows PC';
        else if (/Macintosh/i.test(userAgent)) deviceName = 'MacBook / Mac';
        else if (/Android/i.test(userAgent)) {
            // Android qurilmalar uchun umumiy modelni izlash
            const match = userAgent.match(/\(([^)]+)\)/);
            deviceName = match ? match[1].split(';')[1]?.trim() || 'Android Device' : 'Android Device';
        }

        // 🔥 Tarixga yangi kirishni qo'shamiz
        const newLogin = {
          device: deviceName,
          time: new Date()
        };

        if (!user.loginHistory) user.loginHistory = [];
        
        // Yangi kirishni ro'yxat boshiga qo'shamiz
        user.loginHistory.unshift(newLogin);
        
        // Oxirgi 5 ta tarixni olib qolamiz
        if (user.loginHistory.length > 5) {
          user.loginHistory = user.loginHistory.slice(0, 5);
        }

        await user.save();

        return res.status(200).json({ success: true, role: user.role, username: user.username });
      }
      return res.status(401).json({ success: false, message: "Login yoki parol xato!" });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // 3. BARCHA ADMINLAR RO'YXATINI OLISH — GET
  if (req.method === 'GET') {
    try {
      const users = await User.find({}).sort({ addedAt: -1 });
      return res.status(200).json({ success: true, data: users });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // 4. ADMINNI O'CHIRISH — DELETE
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