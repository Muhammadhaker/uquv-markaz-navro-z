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
    const { studentId, date, groupName, teacherId, adminName } = req.body;

    const cleanInputId = studentId ? studentId.toString().trim() : "";
    if (!cleanInputId || !mongoose.Types.ObjectId.isValid(cleanInputId)) {
        return res.status(400).json({ success: false, message: "Noto'g'ri QR-kod!" });
    }
    
    const student = await Student.findById(cleanInputId);
    if (!student) {
        return res.status(404).json({ success: false, message: "Bunday o'quvchi topilmadi!" });
    }

    let actualGroupName = "Guruhsiz";
    if (student.group && student.group.trim() !== "") {
        actualGroupName = student.group.split(',')[0].trim(); 
    } else if (groupName) {
        actualGroupName = groupName;
    }

    let actualTeacherId = student.teacherId || teacherId;

    if (!actualGroupName || !actualTeacherId) {
         return res.status(400).json({ success: false, message: "Guruh yoki Ustoz aniqlanmadi." });
    }

    const validStudentIdStr = student._id.toString();
    
    let oldDoc = await Attendance.findOne({ groupName: actualGroupName, date, teacherId: actualTeacherId });
    let existingRecords = [];
    
    // ⏱ Taymer - Birinchi bejik urilgan vaqtni yozib olish
    const now = Date.now();
    let firstScanTime = now; 

    if (oldDoc) {
        if (oldDoc.firstScanTime) {
            firstScanTime = oldDoc.firstScanTime; 
        } else if (oldDoc.records && oldDoc.records.length > 0) {
            firstScanTime = now; 
        }
        
        oldDoc.records.forEach(r => {
            existingRecords.push({
                studentId: r.studentId,
                studentName: r.studentName,
                status: r.status || "",
                messageId: r.messageId || null,
                arrivalTime: r.arrivalTime || null,
                leaveTime: r.leaveTime || null,
                lastScan: r.lastScan || 0
            });
        });
    }

    const studentIndex = existingRecords.findIndex(r => String(r.studentId) === validStudentIdStr);
    const timeStr = new Date().toLocaleTimeString('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });

    // ⏳ 15 daqiqalik qoida (15 * 60 * 1000 millisoniya = 900 000 ms)
    const isLate = (now - firstScanTime) > 15 * 60 * 1000;
    const initialStatus = isLate ? "kechikdi" : "keldi";

    let newStatus = initialStatus;
    let arrTime = timeStr;
    let levTime = null;
    let currentOldMsgId = null;

    if (studentIndex >= 0) {
        let current = existingRecords[studentIndex];
        const currentStatus = (current.status || '').toLowerCase().trim();
        currentOldMsgId = current.messageId;
        
        let safeLastScan = current.lastScan ? Number(current.lastScan) : 0; 
        const timePassed = now - safeLastScan;
        
        // 30 daqiqa himoyasi
        if (safeLastScan > 0 && timePassed < 1800000) {
           return res.status(200).json({ success: true, message: `${student.name} qayd etilmadi (Hali 30 daqiqa o'tmadi).` });
        }

        if (currentStatus === 'keldi' || currentStatus === 'kechikdi') {
            newStatus = 'ketdi';
            arrTime = current.arrivalTime || '--:--'; 
            levTime = timeStr; 
        } else if (currentStatus === 'ketdi') {
            newStatus = initialStatus;
            arrTime = timeStr;
            levTime = null;
        } else {
            newStatus = initialStatus;
            arrTime = timeStr;
            levTime = null;
        }
    }

    // 🔥 1. DARHOL BAZAGA SAQLAYMIZ (Telegramni kutmaymiz!)
    const newRecordData = {
        studentId: validStudentIdStr,
        studentName: student.name,
        status: newStatus,
        arrivalTime: arrTime,
        leaveTime: levTime,
        lastScan: now,
        messageId: currentOldMsgId 
    };

    if (studentIndex >= 0) {
        existingRecords[studentIndex] = newRecordData;
    } else {
        existingRecords.push(newRecordData);
    }

    await Attendance.findOneAndUpdate(
        { groupName: actualGroupName, date, teacherId: actualTeacherId },
        { 
            groupName: actualGroupName, 
            date, 
            adminName, 
            teacherId: actualTeacherId, 
            records: existingRecords,
            firstScanTime
        },
        { new: true, upsert: true }
    );

    // 🔥 2. EKRANGA DARHOL JAVOB BERAMIZ (Bu saytni yashin tezligida ishlatadi)
    res.status(200).json({ success: true, message: `${student.name} - ${newStatus.toUpperCase()} belgilandi!` });

    // 🔥 3. TELEGRAMGA XABAR YUBORISH (Bu orqa fonda, saytga ta'sir qilmay, tinchgina yuz beradi)
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    if (telegramToken && student.telegramChatId) {
        (async () => {
            try {
                const chatIds = String(student.telegramChatId).split(',').map(id => id.trim()).filter(Boolean);
                let firstMsgId = null;

                const getStatusText = (st, arr, lev) => {
                   if (st === 'keldi') return `✅ Darsga keldi\n⏰ Kelgan vaqti: ${arr || '--:--'}`;
                   if (st === 'kechikdi') return `⏳ Kechikib keldi\n⏰ Kelgan vaqti: ${arr || '--:--'}`;
                   if (st === 'ketdi') return `🏠 Darsdan ketdi\n🟢 Kelgan vaqti: ${arr || '--:--'}\n🔴 Ketgan vaqti: ${lev || '--:--'}`;
                   return '❌ Darsga kelmadi';
                };

                const [yyyy, mm, dd] = date.split("-");
                const formattedDate = `${dd}.${mm}.${yyyy}`;
                let text = `📋 *Davomat (QR-Kod)*\n\nHurmatli *${student.name}*,\n\n📅 Sana: ${formattedDate}\n📚 Fan: ${actualGroupName}\n\n📊 Holat: \n*${getStatusText(newStatus, arrTime, levTime)}*`;

                await Promise.all(chatIds.map(async (cId) => {
                    if (currentOldMsgId) {
                        // Eski xabarni o'chirish ham orqa fonda ketaveradi
                        fetch(`https://api.telegram.org/bot${telegramToken}/deleteMessage`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ chat_id: cId, message_id: currentOldMsgId })
                        }).catch(() => {});
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

                // Agar bot yangi ID qaytarsa, uni ham sekingina orqa fonda bazaga saqlab qo'yadi
                if (firstMsgId) {
                    existingRecords[studentIndex >= 0 ? studentIndex : existingRecords.length - 1].messageId = firstMsgId;
                    await Attendance.findOneAndUpdate(
                        { groupName: actualGroupName, date, teacherId: actualTeacherId },
                        { records: existingRecords }
                    );
                }
            } catch (err) {
                console.log("Telegram fondagi xatosi", err);
            }
        })();
    }

  } catch (error) {
    console.error("QR Scan Xatosi:", error);
    if (!res.headersSent) {
        return res.status(500).json({ success: false, message: error.message });
    }
  }
}