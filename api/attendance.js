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
  try {
    await connectDB();
    
    const role = req.headers['x-user-role'];
    const userId = req.headers['x-user-id'];
    const parentId = req.headers['x-parent-id'];
    
    if (req.method === 'GET') {
      const { groupName, date, teacherId } = req.query;
      let query = { groupName, date };
      
      if (teacherId) query.teacherId = teacherId;
      else {
        if (role === 'teacher') query.teacherId = userId;
        else if (role === 'assistant') query.teacherId = parentId;
      }

      const data = await Attendance.findOne(query);
      return res.status(200).json({ success: true, data });
    }
    
    if (req.method === 'POST') {
      const { groupName, date, adminName, records, isScan, scannedRecord, teacherId } = req.body;
      const ownerId = teacherId || (role === 'assistant' ? parentId : userId);
      
      const oldDoc = await Attendance.findOne({ groupName, date, teacherId: ownerId });
      const oldDataMap = {};
      if (oldDoc) {
         oldDoc.records.forEach(r => {
             oldDataMap[r.studentId] = { status: r.status, messageId: r.messageId };
         });
      }

      if (isScan && scannedRecord) {
        let currentRecords = oldDoc ? [...oldDoc.records] : [];
        const existingIndex = currentRecords.findIndex(r => String(r.studentId) === String(scannedRecord.studentId));
        
        const now = Date.now();
        const timeStr = new Date().toLocaleTimeString('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });

        if (existingIndex >= 0) {
            let existing = currentRecords[existingIndex];
            if (existing.status === 'keldi' || existing.status === 'kechikdi') {
                scannedRecord.status = 'ketdi';
                scannedRecord.leaveTime = timeStr;
                scannedRecord.arrivalTime = existing.arrivalTime; 
            } else if (existing.status === 'ketdi') {
                scannedRecord.status = 'ketdi';
                scannedRecord.leaveTime = existing.leaveTime;
                scannedRecord.arrivalTime = existing.arrivalTime;
            } else {
                scannedRecord.status = 'keldi';
                scannedRecord.arrivalTime = timeStr;
            }
            scannedRecord.lastScan = now;
            currentRecords[existingIndex] = { ...existing, ...scannedRecord };
        } else {
            scannedRecord.status = 'keldi';
            scannedRecord.arrivalTime = timeStr;
            scannedRecord.lastScan = now;
            currentRecords.push(scannedRecord);
        }
        
        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        if (telegramToken && (!oldDataMap[scannedRecord.studentId] || oldDataMap[scannedRecord.studentId].status !== scannedRecord.status)) {
           try {
             let student = await Student.findById(scannedRecord.studentId);
             if(student && student.telegramChatId) {
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

               let text = oldDataMap[scannedRecord.studentId] 
                 ? `✏️ *Davomat o'zgartirildi*\n\nHurmatli *${scannedRecord.studentName}*,\n\n📅 Sana: ${formattedDate}\n📚 Fan: ${groupName}\n\n📊 Yangi holat: \n*${getStatusText(scannedRecord)}*`
                 : `📋 *Davomat natijasi*\n\nHurmatli *${scannedRecord.studentName}*,\n\n📅 Sana: ${formattedDate}\n📚 Fan: ${groupName}\n\n📊 Holat: \n*${getStatusText(scannedRecord)}*`;

               // 🔥 MULTI-ACCOUNT YUBORISH
               const chatIds = student.telegramChatId.split(',').filter(Boolean);
               let firstMsgId = null;

               await Promise.all(chatIds.map(async (cId) => {
                   if(oldDataMap[scannedRecord.studentId]?.messageId) {
                     await fetch(`https://api.telegram.org/bot${telegramToken}/deleteMessage`, {
                         method: 'POST', headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify({ chat_id: cId, message_id: oldDataMap[scannedRecord.studentId].messageId })
                     });
                   }
                   const tgRes = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                       method: 'POST', headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({ chat_id: cId, text, parse_mode: 'Markdown' })
                   });
                   const tgData = await tgRes.json();
                   if (tgData.ok && !firstMsgId) firstMsgId = tgData.result.message_id;
               }));

               if (firstMsgId) {
                 const updIndex = currentRecords.findIndex(r => r.studentId === scannedRecord.studentId);
                 currentRecords[updIndex].messageId = firstMsgId;
               }
             }
           } catch(e) {}
        }

        const data = await Attendance.findOneAndUpdate(
          { groupName, date, teacherId: ownerId },
          { groupName, date, adminName, teacherId: ownerId, records: currentRecords },
          { new: true, upsert: true }
        );
        return res.status(200).json({ success: true, data });

      } else {
        const finalRecords = records.map(r => ({
            studentId: r.studentId, studentName: r.studentName, status: r.status,
            arrivalTime: r.arrivalTime || null, leaveTime: r.leaveTime || null, lastScan: r.lastScan || null,
            messageId: oldDataMap[r.studentId]?.messageId || null
        }));

        const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
        if (telegramToken && finalRecords.length > 0) {
           try {
              const changedRecords = finalRecords.filter(r => r.status && r.status !== "" && (!oldDoc || oldDataMap[r.studentId]?.status !== r.status));
              
              if (changedRecords.length > 0) {
                 const objectIds = changedRecords.map(r => mongoose.Types.ObjectId.isValid(r.studentId) ? new mongoose.Types.ObjectId(r.studentId) : r.studentId);
                 const studentsInDb = await Student.find({ _id: { $in: objectIds } });
                 const chatIdsMap = {};
                 studentsInDb.forEach(s => { chatIdsMap[s._id.toString()] = s.telegramChatId; });

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
                     
                     // 🔥 MULTI-ACCOUNT
                     const cIds = allChatIds.split(',').filter(Boolean);
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

                         const isCorrection = oldDataMap[record.studentId] !== undefined && oldDataMap[record.studentId].status !== ""; 
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
          { groupName, date, teacherId: ownerId },
          { groupName, date, adminName, teacherId: ownerId, records: finalRecords },
          { new: true, upsert: true }
        );

        return res.status(200).json({ success: true, data });
      }
    }
    
    res.status(405).json({ message: "Metod ruxsat etilmagan" });
  } catch (error) {
    console.error("Attendance API Xatosi:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}