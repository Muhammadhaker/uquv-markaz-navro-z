import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI topilmadi!");
  return mongoose.connect(process.env.MONGODB_URI);
};

// 🔥 SChema vaqt va skaner tarixini qo'llab-quvvatlaydi
const attendanceSchema = new mongoose.Schema({
  groupName: { type: String, required: true },
  date: { type: String, required: true },
  adminName: { type: String, required: true },
  records: [{
    studentId: String,
    studentName: String,
    status: String,
    messageId: Number,
    arrivalTime: String,
    leaveTime: String,
    lastScan: Number
  }],
  createdAt: { type: Date, default: Date.now }
});

const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema, 'attendances');
const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({}, { strict: false }), 'students');

export default async function handler(req, res) {
  try {
    await connectDB();
    
    if (req.method === 'GET') {
      const { groupName, date } = req.query;
      const data = await Attendance.findOne({ groupName, date });
      return res.status(200).json({ success: true, data });
    }
    
    if (req.method === 'POST') {
      const { groupName, date, adminName, records } = req.body;
      
      const oldDoc = await Attendance.findOne({ groupName, date });
      const oldDataMap = {};
      if (oldDoc) {
         oldDoc.records.forEach(r => {
             oldDataMap[r.studentId] = { status: r.status, messageId: r.messageId };
         });
      }

      const finalRecords = records.map(r => ({
          studentId: r.studentId,
          studentName: r.studentName,
          status: r.status,
          arrivalTime: r.arrivalTime || null,
          leaveTime: r.leaveTime || null,
          lastScan: r.lastScan || null,
          messageId: oldDataMap[r.studentId]?.messageId || null
      }));

      const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
      
      if (telegramToken && finalRecords.length > 0) {
         try {
            const changedRecords = finalRecords.filter(r => !oldDoc || oldDataMap[r.studentId]?.status !== r.status);
            
            if (changedRecords.length > 0) {
               const objectIds = [];
               changedRecords.forEach(r => {
                  if (mongoose.Types.ObjectId.isValid(r.studentId)) {
                      objectIds.push(new mongoose.Types.ObjectId(r.studentId));
                  }
                  objectIds.push(r.studentId);
               });
               
               const studentsInDb = await Student.find({ _id: { $in: objectIds } });
               const chatIdsMap = {};
               studentsInDb.forEach(s => {
                   chatIdsMap[s._id.toString()] = s.telegramChatId;
               });

               // 🔥 SANANI O'ZBEKCHA OYLARGA O'GIRISH VA FORMATLASH
               const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
               const [yyyy, mm, dd] = date.split("-");
               const formattedDate = `${dd}-${months[parseInt(mm) - 1]}, ${yyyy}-yil`;

               // 🔥 4 XIL STATUS VA VAQTLAR UCHUN MAXSUS MATN
               const getStatusText = (record) => {
                  const arr = record.arrivalTime || '--:--';
                  const lev = record.leaveTime || '--:--';
                  if (record.status === 'keldi') return `✅ Darsga keldi\n⏰ Kelgan vaqti: ${arr}`;
                  if (record.status === 'kechikdi') return `⏳ Kechikib keldi\n⏰ Kelgan vaqti: ${arr}`;
                  if (record.status === 'ketdi') return `🏠 Darsdan ketdi\n🟢 Kelgan vaqti: ${arr}\n🔴 Ketgan vaqti: ${lev}`;
                  return '❌ Darsga kelmadi';
               };

               await Promise.all(changedRecords.map(async (record) => {
                   const chatId = chatIdsMap[record.studentId];
                   if (!chatId) return;

                   // Eski xabarni tozalash
                   if (record.messageId) {
                       try {
                           await fetch(`https://api.telegram.org/bot${telegramToken}/deleteMessage`, {
                               method: 'POST',
                               headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({ chat_id: chatId, message_id: record.messageId })
                           });
                       } catch(e) { console.error("Eski xabarni o'chirishda xato", e); }
                   }

                   const isCorrection = oldDataMap[record.studentId] !== undefined; 
                   
                   let text = isCorrection 
                       ? `✏️ *Davomat o'zgartirildi*\n\nHurmatli *${record.studentName}*,\n\n📅 Sana: ${formattedDate}\n📚 Fan: ${groupName}\n\n📊 Yangi holat: \n*${getStatusText(record)}*`
                       : `📋 *Davomat natijasi*\n\nHurmatli *${record.studentName}*,\n\n📅 Sana: ${formattedDate}\n📚 Fan: ${groupName}\n\n📊 Holat: \n*${getStatusText(record)}*`;

                   try {
                       const tgRes = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                           method: 'POST',
                           headers: { 'Content-Type': 'application/json' },
                           body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
                       });
                       const tgData = await tgRes.json();
                       if (tgData.ok) {
                           record.messageId = tgData.result.message_id; 
                       } else {
                           record.messageId = null;
                       }
                   } catch(e) {
                       record.messageId = null;
                   }
               }));
            }
         } catch (tgError) {
            console.error("Telegram jarayonida xatolik yuz berdi:", tgError);
         }
      }

      const data = await Attendance.findOneAndUpdate(
        { groupName, date },
        { groupName, date, adminName, records: finalRecords },
        { new: true, upsert: true }
      );

      return res.status(200).json({ success: true, data });
    }
    
    res.status(405).json({ message: "Metod ruxsat etilmagan" });
  } catch (error) {
    console.error("Attendance API Xatosi:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}