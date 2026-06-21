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
  records: [{
    studentId: String,
    studentName: String,
    status: String
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
      const oldStatuses = {};
      if (oldDoc) {
         oldDoc.records.forEach(r => {
             oldStatuses[r.studentId] = r.status;
         });
      }

      const data = await Attendance.findOneAndUpdate(
        { groupName, date },
        { groupName, date, adminName, records },
        { new: true, upsert: true }
      );

      const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
      if (telegramToken && records && records.length > 0) {
         
         const changedRecords = records.filter(r => oldStatuses[r.studentId] !== r.status);
         
         if (changedRecords.length > 0) {
             // 🔥 XATONI TO'G'IRLADIK: Bazadan qidirish uchun String'ni ObjectId formatiga o'tkazdik
             const studentIds = changedRecords.map(r => {
               try { return new mongoose.Types.ObjectId(r.studentId); } 
               catch(e) { return r.studentId; }
             });

             const studentsInDb = await Student.find({ _id: { $in: studentIds } });
             const chatIdsMap = {};
             studentsInDb.forEach(s => {
                 chatIdsMap[s._id.toString()] = s.telegramChatId;
             });

             const [yyyy, mm, dd] = date.split("-");
             const formattedDate = `${dd}.${mm}.${yyyy}`;

             const telegramPromises = [];

             for (const record of changedRecords) {
                 const chatId = chatIdsMap[record.studentId];
                 
                 if (chatId) {
                     const isCorrection = oldStatuses[record.studentId] !== undefined; 
                     
                     let text = "";
                     if (isCorrection) {
                         text = `✏️ *Davomat o'zgartirildi*\n\nHurmatli *${record.studentName}*, sizning ${formattedDate} sanasidagi "${groupName}" fani bo'yicha davomatingiz tahrirlandi.\n\n📊 Yangi holat: *${record.status === 'keldi' ? '✅ Darsda qatnashdingiz' : '❌ Darsga kelmadingiz'}*`;
                     } else {
                         text = `📋 *Davomat natijasi*\n\nHurmatli *${record.studentName}*, bugun (${formattedDate}) "${groupName}" fani bo'yicha davomat olindi.\n\n📊 Holat: *${record.status === 'keldi' ? '✅ Darsda qatnashdingiz' : '❌ Darsga kelmadingiz'}*`;
                     }

                     const promise = fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                         method: 'POST',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify({
                             chat_id: chatId,
                             text: text,
                             parse_mode: 'Markdown'
                         })
                     });
                     telegramPromises.push(promise);
                 }
             }

             if (telegramPromises.length > 0) {
                 await Promise.all(telegramPromises).catch(err => console.error("Telegram xato:", err));
             }
         }
      }

      return res.status(200).json({ success: true, data });
    }
    
    res.status(405).json({ message: "Metod ruxsat etilmagan" });
  } catch (error) {
    console.error("Attendance API Xatosi:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}