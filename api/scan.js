import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI);
};

const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }), 'attendances');
const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({}, { strict: false }), 'students');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: "Metod ruxsat etilmagan" });

  try {
    await connectDB();
    const { studentId, date, adminName } = req.body;

    const cleanInputId = studentId ? studentId.toString().trim() : "";
    
    if (!cleanInputId || !mongoose.Types.ObjectId.isValid(cleanInputId)) {
        return res.status(400).json({ success: false, message: "Noto'g'ri QR-kod tizimi!" });
    }
    
    const student = await Student.findById(cleanInputId);
    if (!student) {
        return res.status(404).json({ success: false, message: "Bunday o'quvchi topilmadi!" });
    }

    const validStudentIdStr = student._id.toString();

    const studentGroups = student.group ? student.group.split(',').map(g => g.trim()).filter(Boolean) : [];
    if (studentGroups.length === 0) {
        return res.status(400).json({ success: false, message: "O'quvchi hech qaysi guruhda yo'q!" });
    }

    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const [yyyy, mm, dd] = date.split("-");
    const formattedDate = `${dd}.${mm}.${yyyy}`;
    
    const timeStr = new Date().toLocaleTimeString('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });
    const now = Date.now();

    let anyUpdate = false; 

    for (const groupName of studentGroups) {
        let oldAttendance = await Attendance.findOne({ groupName, date, "records.studentId": validStudentIdStr });

        if (!oldAttendance) {
            oldAttendance = await Attendance.findOne({ groupName, date });
        }

        let existingRecords = oldAttendance ? oldAttendance.records : [];
        const studentIndex = existingRecords.findIndex(r => r.studentId && r.studentId.toString().trim() === validStudentIdStr);
        
        let newStatus = "keldi";
        let arrTime = timeStr;
        let levTime = null;

        if (studentIndex >= 0) {
            let current = existingRecords[studentIndex];
            const currentStatus = (current.status || '').toLowerCase().trim();
            
            let safeLastScan = current.lastScan ? Number(current.lastScan) : 0; 
            const timePassed = now - safeLastScan;
            
            if (safeLastScan > 0 && timePassed < 1800000) {
               continue; 
            }

            if (safeLastScan === 0 || timePassed > 18000000) {
                newStatus = 'keldi';
                arrTime = timeStr;
                levTime = null;
            } 
            else if (currentStatus === 'keldi' || currentStatus === 'kechikdi') {
                newStatus = 'ketdi';
                arrTime = current.arrivalTime || '--:--'; 
                levTime = timeStr; 
            } 
            else if (currentStatus === 'ketdi') {
                newStatus = 'keldi';
                arrTime = timeStr;
                levTime = null;
            } 
        }

        anyUpdate = true;
        
        let firstMsgId = null;
        let currentOldMsgId = studentIndex >= 0 ? existingRecords[studentIndex].messageId : null;

        if (telegramToken && student.telegramChatId) {
            // 🔥 Xavfsiz qilingan joyi
            const chatIds = String(student.telegramChatId).split(',').filter(Boolean);

            const getStatusText = (st, arr, lev) => {
               if (st === 'keldi') return `✅ Darsga keldi\n⏰ Kelgan vaqti: ${arr || '--:--'}`;
               if (st === 'kechikdi') return `⏳ Kechikib keldi\n⏰ Kelgan vaqti: ${arr || '--:--'}`;
               if (st === 'ketdi') return `🏠 Darsdan ketdi\n🟢 Kelgan vaqti: ${arr || '--:--'}\n🔴 Ketgan vaqti: ${lev || '--:--'}`;
               return '❌ Darsga kelmadi';
            };

            const isCorrection = studentIndex >= 0 && existingRecords[studentIndex].status !== "" && newStatus === 'ketdi';
            let text = isCorrection 
                ? `✏️ *Davomat o'zgartirildi*\n\nHurmatli *${student.name}*,\n\n📅 Sana: ${formattedDate}\n📚 Fan: ${groupName}\n\n📊 Yangi holat: \n*${getStatusText(newStatus, arrTime, levTime)}*`
                : `📋 *Davomat (QR-Kod)*\n\nHurmatli *${student.name}*,\n\n📅 Sana: ${formattedDate}\n📚 Fan: ${groupName}\n\n📊 Holat: \n*${getStatusText(newStatus, arrTime, levTime)}*`;

            await Promise.all(chatIds.map(async (cId) => {
                if (currentOldMsgId) {
                    try {
                        await fetch(`https://api.telegram.org/bot${telegramToken}/deleteMessage`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ chat_id: cId, message_id: currentOldMsgId })
                        });
                    } catch(e) {}
                }
                try {
                    const tgRes = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chat_id: cId, text, parse_mode: 'Markdown' })
                    });
                    const tgData = await tgRes.json();
                    if (tgData.ok && !firstMsgId) firstMsgId = tgData.result.message_id;
                } catch(e) {}
            }));
        }

        const newRecordData = {
            studentId: validStudentIdStr,
            studentName: student.name,
            status: newStatus,
            arrivalTime: arrTime,
            leaveTime: levTime,
            lastScan: now,
            messageId: firstMsgId || currentOldMsgId
        };

        if (studentIndex >= 0) {
            existingRecords[studentIndex] = newRecordData;
        } else {
            existingRecords.push(newRecordData);
        }

        let teacherId = oldAttendance ? oldAttendance.teacherId : null;
        if (!teacherId) {
            if (student.groupsData && Array.isArray(student.groupsData)) {
                const match = student.groupsData.find(x => x.name === groupName);
                if (match && match.teacherId) teacherId = match.teacherId;
            }
            if (!teacherId && student.teacherIds && student.teacherIds.length > 0) teacherId = student.teacherIds[0];
        }

        const updateQuery = oldAttendance ? { _id: oldAttendance._id } : { groupName, date };
        
        await Attendance.findOneAndUpdate(
            updateQuery,
            { groupName, date, adminName, ...(teacherId ? { teacherId } : {}), records: existingRecords },
            { new: true, upsert: true }
        );
    }

    if (!anyUpdate) {
         return res.status(200).json({ success: true, message: `${student.name} qayd etilmadi (Hali 30 daqiqa o'tmadi).` });
    }

    return res.status(200).json({ success: true, message: `${student.name} muvaffaqiyatli belgilandi!` });

  } catch (error) {
    console.error("QR Scan Xatosi:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}