import { connectDB } from './_lib/db.js';
import { requireRole } from './_lib/auth.js';
import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  adminName:   { type: String, required: true },
  actionType:  { type: String, required: true },
  details:     { type: String, required: true },
  targetApi:   { type: String, default: null },
  deletedData: { type: Object, default: null },
  createdAt:   { type: Date, default: Date.now }
});

const Log = mongoose.models.Log || mongoose.model('Log', logSchema);

export default async function handler(req, res) {
  await connectDB();

  // FIX: avval bu endpoint HECH QANDAY himoyasiz edi — istalgan kishi (hatto
  // login qilmagan) butun tarixni ko'rishi (ichida o'chirilgan to'lovlar,
  // telefon raqamlari bo'lishi mumkin) yoki BUTUNLAY O'CHIRIB YUBORISHI mumkin
  // edi. Endi faqat Super Admin tarixni ko'rishi/o'chirishi mumkin.
  if (req.method === 'GET') {
    if (!requireRole(req, res, ['super_admin'])) return;

    try {
      const logs = await Log.find({}).sort({ createdAt: -1 }).limit(2000);
      return res.status(200).json({ success: true, data: logs });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST — tizimning istalgan qismi (Groups.jsx, AddExpenseModal.jsx va h.k.)
  // amal bajarilganda shu yerga log yozadi. Bu har qanday rol uchun ochiq
  // qolishi kerak (chunki teacher/assistant ham amal bajaradi), shuning uchun
  // faqat rol headeri UMUMAN yo'qligini tekshiramiz (login qilinmagan so'rov).
  if (req.method === 'POST') {
    const role = req.headers['x-user-role'];
    if (!role) {
      return res.status(401).json({ success: false, message: "Avtorizatsiyadan o'tilmagan!" });
    }
    if (!req.body?.adminName || !req.body?.actionType || !req.body?.details) {
      return res.status(400).json({ success: false, message: "adminName, actionType va details talab qilinadi" });
    }

    try {
      const newLog = await Log.create(req.body);
      return res.status(201).json({ success: true, data: newLog });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // DELETE — tarixni butunlay tozalash. Bu QAYTARIB BO'LMAYDIGAN amal va
  // "Tiklash" funksiyasi shu tarixga bog'liq, shuning uchun faqat Super Admin.
  if (req.method === 'DELETE') {
    if (!requireRole(req, res, ['super_admin'])) return;

    try {
      await Log.deleteMany({});
      return res.status(200).json({ success: true, message: "Barcha tarix tozalandi" });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  return res.status(405).json({ message: "Ruxsat etilmagan metod" });
}