import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI topilmadi!");
  return mongoose.connect(process.env.MONGODB_URI);
};

const attendanceSchema = new mongoose.Schema({
  groupName: { type: String, required: true },
  date: { type: String, required: true },
  adminName: { type: String, required: true },
  teacherId: { type: String, required: true },
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
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    await connectDB();
    const role = req.headers['x-user-role'];
    const userId = req.headers['x-user-id'];
    const parentId = req.headers['x-parent-id'];
    
    if (req.method === 'GET') {
      const { groupName, date } = req.query;
      const data = await Attendance.findOne({ groupName, date });
      return res.status(200).json({ success: true, data });
    }
    
    if (req.method === 'POST') {
      // 🔥 Bu fayl faqat Web Paneldan (Saqlash tugmasidan) keladigan ma'lumotlarni qabul qiladi
      const { groupName, date, adminName, records, teacherId } = req.body;
      const ownerId = teacherId || (role === 'assistant' ? parentId : userId);
      
      let oldDoc = await Attendance.findOne({ groupName, date });
      const oldDataMap = {};
      
      if (oldDoc) {
         oldDoc.records.forEach(r => {
             oldDataMap[String(r.studentId)] = { 
                 status: r.status, messageId: r.messageId, 
                 lastScan: r.lastScan, arrivalTime: r.arrivalTime, leaveTime: r.leaveTime 
             };
         });
      }

      const finalRecords = records.map(r => {
          const oldRec = oldDataMap[String(r.studentId)];
          return {
              studentId: r.studentId, 
              studentName: r.studentName, 
              status: r.status || oldRec?.status || "keldi",
              arrivalTime: r.arrivalTime || oldRec?.arrivalTime || null, 
              leaveTime: r.leaveTime || oldRec?.leaveTime || null, 
              lastScan: r.lastScan || oldRec?.lastScan || Date.now(), 
              messageId: oldRec?.messageId || null
          };
      });

      const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
      if (telegramToken && finalRecords.length > 0) {
         try {
            const changedRecords = finalRecords.filter(r => r.status && r.status !== "" && (!oldDoc || oldDataMap[String(r.studentId)]?.status !== r.status));
            
            if (changedRecords.length > 0) {
               const objectIds = changedRecords.map(r => mongoose.Types.ObjectId.isValid(r.studentId) ? new mongoose.Types.ObjectId(r.studentId) : r.studentId);
               const studentsInDb = await Student.find({ _id: { $in: objectIds } });
               const chatIdsMap = {};
               
               studentsInDb.forEach(s => { chatIdsMap[s._id.toString()] = String(s.telegramChatId || ""); });

               const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
               const [yyyy, mm, dd] = date.split("-");
               const formattedDate = `${dd}-${months[parseInt(mm) - 1]}, ${yyyy}-yil`;

               const getStatusText = (record) => {
                  const arr = record.arrivalTime || '--:--';
                  const lev = record.leaveTime || '--:--';
                  if (record.status === 'keldi') return `✅ Darsga keldi\n⏰ Kelgan vaqti: ${arr}`;
                  if (record.status === 'kechikdi') return `⏳ Kechikib keldi\n⏰ Kelgan vaqti: ${arr}`;
                  if (record.status === 'ketdi') return `🏠 Darsdan ketdi\n🟢 Kelgan vaqti: ${arr}\n🔴 Ketgan vaqti: ${lev}`;
                  return '❌ Darsga kelmadi';
               };

               await Promise.all(changedRecords.map(async (record) => {
                   const allChatIds = chatIdsMap[record.studentId];
                   if (!allChatIds) return;
                   
                   const cIds = String(allChatIds).split(',').filter(Boolean);
                   let firstMsgId = null;

                   await Promise.all(cIds.map(async (cId) => {
                       if (record.messageId) {
                           try {
                               await fetch(`https://api.telegram.org/bot${telegramToken}/deleteMessage`, {
                                   method: 'POST', headers: { 'Content-Type': 'application/json' },
                                   body: JSON.stringify({ chat_id: cId, message_id: record.messageId })
                               });
                           } catch(e) {}
                       }

                       const isCorrection = oldDataMap[String(record.studentId)]?.status && record.status === "ketdi"; 
                       let text = isCorrection 
                           ? `✏️ *Davomat o'zgartirildi*\n\nHurmatli *${record.studentName}*,\n\n📅 Sana: ${formattedDate}\n📚 Fan: ${groupName}\n\n📊 Yangi holat: \n*${getStatusText(record)}*`
                           : `📋 *Davomat natijasi*\n\nHurmatli *${record.studentName}*,\n\n📅 Sana: ${formattedDate}\n📚 Fan: ${groupName}\n\n📊 Holat: \n*${getStatusText(record)}*`;

                       try {
                           const tgRes = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                               method: 'POST', headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({ chat_id: cId, text, parse_mode: 'Markdown' })
                           });
                           const tgData = await tgRes.json();
                           if (tgData.ok && !firstMsgId) firstMsgId = tgData.result.message_id; 
                       } catch(e) { }
                   }));
                   record.messageId = firstMsgId;
               }));
            }
         } catch (tgError) {}
      }

      const data = await Attendance.findOneAndUpdate(
        { groupName, date },
        { groupName, date, adminName, teacherId: oldDoc ? oldDoc.teacherId : ownerId, records: finalRecords },
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