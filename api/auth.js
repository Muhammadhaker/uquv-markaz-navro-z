import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // bcrypt hash sifatida saqlanadi
  fullName: { type: String, default: "Xodim" },
  role: { type: String, enum: ['super_admin', 'teacher', 'assistant'], default: 'teacher' },
  parentTeacherId: { type: String, default: null },
  subject: { type: String, default: "Umumiy" },
  permissions: { type: Array, default: ['davomat', 'guruhlar'] },
  loginHistory: { type: Array, default: [] },
  addedAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({}, { strict: false }), 'students');

// FIX: Parolni hash qilish. bcryptjs — Vercel serverless muhitida (native
// bog'lanishlarsiz) ishlaydigan pure-JS versiya.
const hashPassword = async (plain) => bcrypt.hash(plain, 10);

// FIX: Eski (hash qilinmagan) parollar bilan orqaga moslik uchun.
// Agar bazadagi qiymat bcrypt hash formatida bo'lmasa ("$2a$"/"$2b$" bilan
// boshlanmasa), uni plaintext deb hisoblab, to'g'ridan-to'g'ri solishtiramiz
// va agar mos kelsa — darhol hash'ga o'giramiz (lazy migration).
const verifyAndMaybeUpgrade = async (user, plainPassword) => {
  const stored = user.password || '';
  const isHashed = stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$');

  if (isHashed) {
    return bcrypt.compare(plainPassword, stored);
  }

  // Eski plaintext format
  if (stored === plainPassword) {
    user.password = await hashPassword(plainPassword);
    await user.save();
    return true;
  }
  return false;
};

// FIX: Migratsiya (boshlang'ich admin yaratish) endi HAR SO'ROVDA emas,
// faqat maxsus so'rov bilan ishlaydi. Bu Vercel funksiyasini sekinlashtirmaydi
// va keraksiz DB yozuvlarini oldini oladi.
const runSeedMigration = async () => {
  let navrozUser = await User.findOne({ username: "Navroz" });
  if (navrozUser) {
    navrozUser.role = "teacher";
    navrozUser.fullName = "G'ulomov Navro'z";
    navrozUser.subject = "Matematika";
    await navrozUser.save();
  } else {
    navrozUser = await User.create({
      username: "Navroz",
      password: await hashPassword("Navroz"),
      fullName: "G'ulomov Navro'z",
      role: "teacher",
      subject: "Matematika",
      permissions: ['all']
    });
  }

  let muhammadUser = await User.findOne({ username: "Muhammad" });
  if (muhammadUser) {
    muhammadUser.role = "super_admin";
    muhammadUser.fullName = "Tursunov Muhammad";
    await muhammadUser.save();
  } else {
    muhammadUser = await User.create({
      username: "Muhammad",
      password: await hashPassword("Muhammad"),
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

  return { navrozId: navrozUser._id, muhammadId: muhammadUser._id };
};

export default async function handler(req, res) {
  await connectDB();

  // FIX: Migratsiya endi faqat maxsus, sirli so'rov bilan chaqiriladi.
  // Masalan: GET /api/auth?seed=true&secret=<CRON_SECRET yoki alohida SEED_SECRET>
  if (req.method === 'GET' && req.query.seed === 'true') {
    const seedSecret = process.env.SEED_SECRET || process.env.CRON_SECRET;
    if (!seedSecret || req.query.secret !== seedSecret) {
      return res.status(401).json({ success: false, message: "Ruxsat etilmagan!" });
    }
    try {
      const result = await runSeedMigration();
      return res.status(200).json({ success: true, message: "Migratsiya bajarildi", ...result });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ─── LOGIN ──────────────────────────────────────────────────────────────────
  if (req.method === 'POST' && req.body.action !== 'create') {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Login va parol kiritilishi shart" });
    }

    try {
      const user = await User.findOne({ username });

      // FIX: Foydalanuvchi topilmasa ham, "topilmadi" va "parol xato" uchun
      // bir xil xabar qaytariladi — bu username enumeration hujumidan himoya qiladi.
      if (!user) {
        return res.status(401).json({ success: false, message: "Login yoki parol xato!" });
      }

      const isValid = await verifyAndMaybeUpgrade(user, password);
      if (!isValid) {
        return res.status(401).json({ success: false, message: "Login yoki parol xato!" });
      }

      const userAgent = req.headers['user-agent'] || '';
      let deviceName = "Noma'lum qurilma";

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

      // FIX: password maydoni javobga umuman qo'shilmaydi
      return res.status(200).json({
        success: true,
        userId: user._id,
        role: user.role,
        username: user.username,
        fullName: user.fullName,
        subject: user.subject,
        permissions: user.permissions,
        parentTeacherId: user.parentTeacherId
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // ─── FOYDALANUVCHI YARATISH ─────────────────────────────────────────────────
  if (req.method === 'POST' && req.body.action === 'create') {
    // FIX: faqat super_admin yangi foydalanuvchi yaratishi mumkin.
    // Eslatma: x-user-role header — bu ilovaning boshqa joylarida ham
    // ishlatilgan mavjud pattern, lekin u kriptografik jihatdan tasdiqlanmagan
    // (JWT/sessiya emas). To'liq xavfsizlik uchun bu headerlar server tomonida
    // imzolangan token bilan almashtirilishi tavsiya etiladi.
    const requesterRole = req.headers['x-user-role'];
    if (requesterRole !== 'super_admin') {
      return res.status(403).json({ success: false, message: "Faqat Super Admin yangi foydalanuvchi yaratishi mumkin!" });
    }

    const { username, password, fullName, role, parentTeacherId, permissions, subject } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Login va parol kiritilishi shart" });
    }
    if (password.length < 4) {
      return res.status(400).json({ success: false, message: "Parol kamida 4 ta belgidan iborat bo'lishi kerak" });
    }

    try {
      const exists = await User.findOne({ username });
      if (exists) return res.status(400).json({ success: false, message: "Bu login band!" });

      await User.create({
        username,
        password: await hashPassword(password), // FIX: hash qilingan holda saqlanadi
        fullName: fullName || username,
        role: role || 'teacher',
        parentTeacherId: role === 'assistant' ? parentTeacherId : null,
        subject: role === 'teacher' ? (subject || 'Umumiy') : "N/A",
        permissions: role === 'assistant' ? (permissions || ['davomat', 'guruhlar']) : ['all']
      });

      return res.status(200).json({ success: true, message: "Muvaffaqiyatli saqlandi!" });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // ─── FOYDALANUVCHILAR RO'YXATI ─────────────────────────────────────────────
  if (req.method === 'GET') {
    // FIX: faqat super_admin ro'yxatni ko'ra oladi
    const requesterRole = req.headers['x-user-role'];
    if (requesterRole !== 'super_admin') {
      return res.status(403).json({ success: false, message: "Ruxsat etilmagan!" });
    }

    try {
      // FIX: password maydoni proyeksiyada chiqarib tashlandi (-password)
      const users = await User.find({}, '-password').sort({ addedAt: -1 });
      return res.status(200).json({ success: true, data: users });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // ─── FOYDALANUVCHINI O'CHIRISH ──────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const requesterRole = req.headers['x-user-role'];
    if (requesterRole !== 'super_admin') {
      return res.status(403).json({ success: false, message: "Ruxsat etilmagan!" });
    }

    const id = req.query.id || req.body?.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Noto'g'ri ID" });
    }

    try {
      const userToDelete = await User.findById(id);
      if (!userToDelete) {
        return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi" });
      }
      if (userToDelete.username === "Muhammad") {
        return res.status(400).json({ success: false, message: "Asosiy Super Adminni o'chirib bo'lmaydi!" });
      }
      await User.findByIdAndDelete(id);
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ message: "Metod ruxsat etilmagan" });
}