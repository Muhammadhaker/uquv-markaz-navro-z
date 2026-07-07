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

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ success: false, message: "Noto'g'ri QR-kod tizimi!" });
    }
    
    const student = await Student.findById(studentId);
    if (!student) {
        return res.status(404).json({ success: false, message: "Bunday o'quvchi topilmadi!" });
    }

    const studentGroups = student.group ? student.group.split(',').map(g => g.trim()).filter(Boolean) : [];
    if (studentGroups.length === 0) {
        return res.status(400).json({ success: false, message: "O'quvchi hech qaysi guruhda yo'q!" });
    }

    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const [yyyy, mm, dd] = date.split("-");
    const formattedDate = `${dd}.${mm}.${yyyy}`;
    
    // Server vaqti (Kelgan/Ketgan vaqtni yozish uchun)
    const timeStr = new Date().toLocaleTimeString('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });
    const now = Date.now();

    for (const groupName of studentGroups) {
        // Eski arxivni tekshiramiz: bu o'quvchining ustozi kimligini topishimiz kerak.
        let teacherId = null;
        if (student.groupsData && Array.isArray(student.groupsData)) {
            const match = student.groupsData.find(x => x.name === groupName);
            if (match && match.teacherId) teacherId = match.teacherId;
        }
        if (!teacherId && student.teacherIds && student.teacherIds.length > 0) teacherId = student.teacherIds[0];

        let oldAttendance;
        if (teacherId) {
            oldAttendance = await Attendance.findOne({ groupName, date, teacherId });
        } else {
            oldAttendance = await Attendance.findOne({ groupName, date });
        }

        let existingRecords = oldAttendance ? oldAttendance.records : [];
        const studentIndex = existingRecords.findIndex(r => String(r.studentId) === String(studentId));
        
        let newStatus = "keldi";
        let arrTime = timeStr;
        let levTime = null;

        if (studentIndex >= 0) {
            let current = existingRecords[studentIndex];
            
            // 30 daqiqalik (1800000ms) spam himoyasi
            if (now - (current.lastScan || 0) < 1800000) {
               continue; // Hali vaqt o'tmadi, hech narsa qilmaymiz (xato ham bermaymiz)
            }

            if (current.status === 'keldi' || current.status === 'kechikdi') {
                newStatus = 'ketdi';
                arrTime = current.arrivalTime;
                levTime = timeStr;
            } else if (current.status === 'ketdi') {
                // Allaqachon ketib bo'lgan bo'lsa, yana o'zgartirmaymiz, shunchaki o'tkazib yuboramiz.
                continue;
            } else {
                newStatus = 'keldi';
                arrTime = timeStr;
            }
        }

        // 🔥 YANGI MULTI-ACCOUNT XABAR YUBORISH TIZIMI
        let firstMsgId = null;
        let currentOldMsgId = studentIndex >= 0 ? existingRecords[studentIndex].messageId : null;

        if (telegramToken && student.telegramChatId) {
            const chatIds = student.telegramChatId.split(',').filter(Boolean); // Hamma IDlarni olamiz (dada, oyi, va hokazo)

            const getStatusText = (st, arr, lev) => {
               if (st === 'keldi') return `✅ Darsga keldi\n⏰ Kelgan vaqti: ${arr || '--:--'}`;
               if (st === 'kechikdi') return `⏳ Kechikib keldi\n⏰ Kelgan vaqti: ${arr || '--:--'}`;
               if (st === 'ketdi') return `🏠 Darsdan ketdi\n🟢 Kelgan vaqti: ${arr || '--:--'}\n🔴 Ketgan vaqti: ${lev || '--:--'}`;
               return '❌ Darsga kelmadi';
            };

            const isCorrection = studentIndex >= 0 && existingRecords[studentIndex].status !== "";
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
            studentId: student._id.toString(),
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

        const updateQuery = teacherId ? { groupName, date, teacherId } : { groupName, date };
        await Attendance.findOneAndUpdate(
            updateQuery,
            { ...updateQuery, adminName, records: existingRecords },
            { new: true, upsert: true }
        );
    }

    return res.status(200).json({ success: true, message: `${student.name} muvaffaqiyatli belgilandi!` });

  } catch (error) {
    console.error("QR Scan Xatosi:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}