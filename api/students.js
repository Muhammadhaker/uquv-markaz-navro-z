import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI topilmadi!");
  return mongoose.connect(process.env.MONGODB_URI);
};

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  parentName: { type: String, required: true },
  phone: { type: String, default: "Kiritilmagan" }, 
  group: { type: String, required: true },
  telegramChatId: { type: String, default: null },
  groupsData: { type: Array, default: [] }, // Ichida { name, price, teacherId } bo'ladi
  isNewStudent: { type: Boolean, default: true },
  exceptionMonths: { type: [String], default: [] },
  teacherIds: { type: [String], default: [] }, // 🔥 YANGI: O'quvchiga dars o'tadigan BARCHA ustozlar ID lari
  addedAt: { type: Date, default: Date.now }
}, { strict: false }); 

const Student = mongoose.models.Student || mongoose.model('Student', studentSchema, 'students');

export default async function handler(req, res) {
  try {
    await connectDB();

    const role = req.headers['x-user-role'];
    const userId = req.headers['x-user-id'];
    const parentId = req.headers['x-parent-id'];

    if (req.method === 'GET') {
      const { telegramChatId } = req.query;
      if (telegramChatId) {
        const student = await Student.findOne({ 
            $or: [ { telegramChatId: telegramChatId }, { telegramChatId: String(telegramChatId) }, { telegramChatId: Number(telegramChatId) } ] 
        });
        return res.status(200).json({ exists: !!student });
      }
      
      let query = {};
      const targetTeacherId = role === 'assistant' ? parentId : userId;
      
      if (role === 'teacher' || role === 'assistant') {
        query = { teacherIds: targetTeacherId }; // Ustoz faqat o'ziga aloqador o'quvchilarni oladi
      }

      const students = await Student.find(query).sort({ addedAt: -1 });

      // 🔥 YANGI: Agar ustoz kirgan bo'lsa, o'quvchining profildan boshqa ustozlarning fanlarini yashiramiz!
      const filteredStudents = students.map(s => {
        const sObj = s.toObject();
        if (role === 'teacher' || role === 'assistant') {
          sObj.groupsData = sObj.groupsData.filter(g => g.teacherId === targetTeacherId);
          sObj.group = sObj.groupsData.map(g => g.name).join(', ');
        }
        return sObj;
      });

      return res.status(200).json({ success: true, data: filteredStudents });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const { groupsData } = req.body;
      
      // Guruhlardan hamma ustozlar ID sini yig'ib olamiz
      let tIds = [];
      if (groupsData && Array.isArray(groupsData)) {
        tIds = groupsData.map(g => g.teacherId).filter(Boolean);
      }
      
      // Agar ustoz o'zi qoshyotgan bo'lsa, avtomat o'zini ID sini qo'shamiz
      const creatorId = role === 'assistant' ? parentId : userId;
      if (tIds.length === 0 && role !== 'super_admin') {
        tIds.push(creatorId);
      }

      const uniqueTeacherIds = [...new Set(tIds)];
      req.body.teacherIds = uniqueTeacherIds;

      let savedStudent;
      if (req.method === 'POST') {
        savedStudent = await Student.create(req.body);
        
        // Telegram xabarnoma qismi
        if (savedStudent.telegramChatId && savedStudent.telegramChatId.trim() !== "") {
          try {
            await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: savedStudent.telegramChatId,
                text: `🎉 *Tabriklaymiz, ${savedStudent.name}!*\n\nSiz ro'yxatdan o'tdingiz.\n\n👇 _Pastki menyudan Shaxsiy Kabinetingizga kirishingiz mumkin!_`,
                parse_mode: 'Markdown',
                reply_markup: {
                  keyboard: [
                    [{ text: "👤 Shaxsiy Kabinet", web_app: { url: `https://uquv-markaz-navroz.vercel.app/profile?chatId=${savedStudent.telegramChatId}` } }],
                    [{ text: "📊 Oylik hisobot" }],
                    [{ text: "📋 Mening ma'lumotlarim" }]
                  ], resize_keyboard: true, is_persistent: true
                }
              })
            });
          } catch (err) {}
        }
        return res.status(201).json({ success: true, data: savedStudent });
      } else {
        const { id, ...updateData } = req.body;
        savedStudent = await Student.findByIdAndUpdate(id, updateData, { new: true });
        return res.status(200).json({ success: true, data: savedStudent });
      }
    }

    if (req.method === 'DELETE') {
      await Student.findByIdAndDelete(req.body.id);
      return res.status(200).json({ success: true });
    }

    res.status(405).json({ message: "Metod ruxsat etilmagan" });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}