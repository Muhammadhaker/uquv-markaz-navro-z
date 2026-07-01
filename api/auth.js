import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, default: "Xodim" }, 
  role: { type: String, enum: ['super_admin', 'teacher', 'assistant'], default: 'teacher' },
  parentTeacherId: { type: String, default: null },
  subject: { type: String, default: "Umumiy" }, // 🔥 YANGI: Ustoz fani
  permissions: { type: Array, default: ['davomat', 'guruhlar'] },
  loginHistory: { type: Array, default: [] }, 
  addedAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({}, { strict: false }), 'students');

export default async function handler(req, res) {
  await connectDB();

  try {
   // 1. G'ulomov Navro'z profilini Ustoz (teacher) roliga o'tkazish
    let navrozUser = await User.findOne({ username: "Navroz" });
    if (navrozUser) {
      navrozUser.role = "teacher";
      navrozUser.fullName = "G'ulomov Navro'z";
      navrozUser.subject = "Matematika"; // 🔥 MAJBURIY qilib qo'ydik (Oldingi narsani ezib yozadi)
      await navrozUser.save();
    } else {
      navrozUser = await User.create({
        username: "Navroz",
        password: "Navroz",
        fullName: "G'ulomov Navro'z",
        role: "teacher",
        subject: "Matematika",
        permissions: ['all']
      });
    }

    let muhammadUser = await User.findOne({ username: "Muhammad" });
    if (muhammadUser) {
      muhammadUser.role = "super_admin";
      muhammadUser.password = "Muhammad";
      muhammadUser.fullName = "Tursunov Muhammad";
      await muhammadUser.save();
    } else {
      muhammadUser = await User.create({
        username: "Muhammad",
        password: "Muhammad",
        fullName: "Tursunov Muhammad",
        role: "super_admin",
        permissions: ['all']
      });
    }

    if (navrozUser) {
      await Student.updateMany(
        { $or: [{ teacherId: { $exists: false } }, { teacherId: null }, { teacherId: "" }] },
        { $set: { teacherId: navrozUser._id.toString() } }
      );
    }
  } catch (err) {
    console.error("Migratsiya xatosi:", err);
  }

  if (req.method === 'POST' && req.body.action !== 'create') {
    const { username, password } = req.body;
    try {
      const user = await User.findOne({ username, password });
      
      if (user) {
        const userAgent = req.headers['user-agent'] || '';
        let deviceName = 'Noma\'lum qurilma';
        
        if (/iPhone/i.test(userAgent)) deviceName = 'iPhone';
        else if (/Samsung|SM-[A-Z0-9]+/i.test(userAgent)) deviceName = userAgent.match(/SM-[A-Z0-9]+/i)?.[0] || 'Samsung';
        else if (/Redmi|Mi|Xiaomi/i.test(userAgent)) deviceName = userAgent.match(/(Redmi|Mi|Xiaomi) [A-Z0-9]+/i)?.[0] || 'Xiaomi';
        else if (/Windows NT/i.test(userAgent)) deviceName = 'Windows PC';
        else if (/Macintosh/i.test(userAgent)) deviceName = 'MacBook';
        else if (/Android/i.test(userAgent)) deviceName = 'Android';

        const newLogin = { device: deviceName, time: new Date() };

        if (!user.loginHistory) user.loginHistory = [];
        user.loginHistory.unshift(newLogin);
        if (user.loginHistory.length > 5) user.loginHistory = user.loginHistory.slice(0, 5);
        await user.save();

        return res.status(200).json({ 
            success: true, 
            userId: user._id,
            role: user.role, 
            username: user.username,
            fullName: user.fullName,
            subject: user.subject, // 🔥 Frontendga qaytarish
            permissions: user.permissions,
            parentTeacherId: user.parentTeacherId
        });
      }
      return res.status(401).json({ success: false, message: "Login yoki parol xato!" });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'POST' && req.body.action === 'create') {
      // 🔥 Qabul qilishda `subject` ham kiritildi
      const { username, password, fullName, role, parentTeacherId, permissions, subject } = req.body;
      try {
          const exists = await User.findOne({ username });
          if (exists) return res.status(400).json({ success: false, message: "Bu login band!" });

          await User.create({
              username,
              password,
              fullName: fullName || username,
              role: role || 'teacher',
              parentTeacherId: role === 'assistant' ? parentTeacherId : null,
              subject: role === 'teacher' ? (subject || 'Umumiy') : "N/A", // 🔥 Faqat ustozlarga fan yoziladi
              permissions: role === 'assistant' ? (permissions || ['davomat', 'guruhlar']) : ['all']
          });

          return res.status(200).json({ success: true, message: "Muvaffaqiyatli saqlandi!" });
      } catch (error) {
          return res.status(500).json({ success: false, error: error.message });
      }
  }

  if (req.method === 'GET') {
    try {
      const users = await User.find({}).sort({ addedAt: -1 });
      return res.status(200).json({ success: true, data: users });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    try {
      const userToDelete = await User.findById(id);
      if (userToDelete && userToDelete.username === "Muhammad") {
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