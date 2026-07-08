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
  groupsData: { type: Array, default: [] },
  isNewStudent: { type: Boolean, default: true },
  exceptionMonths: { type: [String], default: [] },
  teacherIds: { type: [String], default: [] }, 
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
      
      // 🔥 MUAMMO YECHILDI: Regex o'chirildi, xavfsiz JavaScript qidiruviga o'tildi
      if (telegramChatId) {
        const allDocs = await Student.find();
        const student = allDocs.find(s => {
            if(!s.telegramChatId) return false;
            return String(s.telegramChatId).split(',').map(i=>i.trim()).includes(String(telegramChatId));
        });
        return res.status(200).json({ exists: !!student });
      }
      
      let query = {};
      const targetTeacherId = role === 'assistant' ? parentId : userId;
      
      if (role === 'teacher' || role === 'assistant') {
        query = { teacherIds: targetTeacherId }; 
      }

      const students = await Student.find(query).sort({ addedAt: -1 });

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
      
      let tIds = [];
      if (groupsData && Array.isArray(groupsData)) {
        tIds = groupsData.map(g => g.teacherId).filter(Boolean);
      }
      
      const creatorId = role === 'assistant' ? parentId : userId;
      if (tIds.length === 0 && role !== 'super_admin') {
        tIds.push(creatorId);
      }

      const uniqueTeacherIds = [...new Set(tIds)];
      req.body.teacherIds = uniqueTeacherIds;

      let savedStudent;
      if (req.method === 'POST') {
        savedStudent = await Student.create(req.body);
        
        // 🔥 YANGI: Telegram xabarnoma qismi (Ixcham inline tugmalar bilan)
        if (savedStudent.telegramChatId && savedStudent.telegramChatId.trim() !== "") {
          try {
            const token = process.env.TELEGRAM_BOT_TOKEN;
            const cId = savedStudent.telegramChatId;
            
            // 1. Menu tugmani tiklash
            await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: cId, menu_button: { type: "web_app", text: "Shaxsiy Kabinet", web_app: { url: `https://uquv-markaz-navroz.vercel.app/profile?chatId=${cId}` } } })
            });

            // 2. Katta eski tugmani uzoqlashtirish xabari
            const rmMsg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: cId, text: "🔄 Yangilanmoqda...", reply_markup: { remove_keyboard: true } })
            });
            const rmData = await rmMsg.json();
            if(rmData.ok) {
                await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
                     method: 'POST', headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ chat_id: cId, message_id: rmData.result.message_id })
                });
            }

            // 3. Toza va yozishmalarga xalaqit bermaydigan Inline tugma orqali tabriknoma jo'natish
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: cId,
                text: `🎉 *Tabriklaymiz, ${savedStudent.name}!*\n\nSiz o'quv markazimizga muvaffaqiyatli qabul qilindingiz.\n\n👇 _Pastki menyudan "Shaxsiy Kabinet"ga kirishingiz mumkin!_`,
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "🚀 Shaxsiy Kabinetni ochish", web_app: { url: `https://uquv-markaz-navroz.vercel.app/profile?chatId=${cId}` } }],
                    [{ text: "📊 Oylik hisobot", callback_data: "stat" }, { text: "📋 Ma'lumotlarim", callback_data: "info" }],
                    [{ text: "ℹ️ Markaz haqida", callback_data: "about" }]
                  ]
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