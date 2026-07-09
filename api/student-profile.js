import mongoose from 'mongoose';

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI topilmadi!");
  return mongoose.connect(process.env.MONGODB_URI);
};

const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({}, { strict: false }), 'students');
const Payment = mongoose.models.Payment || mongoose.model('Payment', new mongoose.Schema({}, { strict: false }), 'payments');
const User    = mongoose.models.User    || mongoose.model('User',    new mongoose.Schema({}, { strict: false }), 'users');

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    await connectDB();
  } catch (err) {
    return res.status(500).json({ success: false, message: "DB ulanmadi: " + err.message });
  }

  // ─── POST: profilni uzish ──────────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const { action, studentId, chatId: reqChatId } = req.body;

      if (action === 'disconnect') {
        if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
          return res.status(400).json({ success: false, message: "Noto'g'ri studentId" });
        }

        // FIX 2: Faqat o'sha chatId ni o'chiramiz, boshqa ota-onani emas
        // Avvalgi versiyada telegramChatId = null qilinardi — bu boshqa ulangan
        // ota-onaning ham ulanishini uzib qo'yardi.
        if (reqChatId) {
          const student = await Student.findById(studentId);
          if (student) {
            const idsArr = String(student.telegramChatId || "")
              .split(',').map(id => id.trim()).filter(id => id && id !== String(reqChatId));
            await Student.findByIdAndUpdate(studentId, {
              $set: { telegramChatId: idsArr.join(',') || null }
            });
          }
        } else {
          // chatId berilmagan bo'lsa — hamma ulanishni uzamiz
          await Student.findByIdAndUpdate(studentId, { $set: { telegramChatId: null } });
        }

        return res.status(200).json({ success: true, message: "Profil hisobdan uzildi!" });
      }

      return res.status(400).json({ success: false, message: "Noma'lum action" });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ─── GET: profil ma'lumotlari ──────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { chatId } = req.query;

      if (!chatId || String(chatId).trim().length < 5) {
        return res.status(400).json({ success: false, message: "chatId taqdim etilmagan" });
      }

      const safeChatId = String(chatId).trim();

      // FIX 1: barcha hujjatni yuklab JS da filter qilish o'rniga
      // MongoDB $regex ishlatiladi. Bu indeks bilan juda tezroq ishlaydi.
      // Izoh: telegramChatId "123,456,789" formatida saqlangani uchun exact match
      // mumkin emas — shuning uchun regex muqobil yechim.
      // Aniqroq bo'lishi uchun: boshida, oxirida yoki vergullar orasida bo'lishini tekshiramiz.
      const students = await Student.find({
        telegramChatId: {
          $regex: `(^|,)\\s*${safeChatId}\\s*(,|$)`
        }
      });

      if (!students || students.length === 0) {
        return res.status(404).json({ success: false, message: "O'quvchi topilmadi" });
      }

      // ─── Oy hisoblash ────────────────────────────────────────────────────────
      const today = new Date();
      let year  = today.getFullYear();
      let month = today.getMonth() + 1;
      if (today.getDate() <= 5) {
        month -= 1;
        if (month === 0) { month = 12; year -= 1; }
      }
      const targetMonth = `${year}-${String(month).padStart(2, "0")}`;

      // FIX 5: N+1 muammosi yechimi — barcha studentlar uchun to'lovlarni
      // bitta so'rovda olamiz, keyin JS da guruhlash qilamiz.
      const studentIds = students.map(s => s._id);
      const studentIdStrs = students.map(s => s._id.toString());

      const [allPayments, allTeacherIds] = (() => {
        const tIds = new Set();
        students.forEach(st => {
          if (st.groupsData?.length) st.groupsData.forEach(g => g.teacherId && tIds.add(g.teacherId));
          else if (st.teacherIds?.length) st.teacherIds.forEach(id => tIds.add(id));
          else if (st.teacherId) tIds.add(String(st.teacherId));
        });
        return [null, [...tIds]];
      })();

      // Barcha to'lovlarni bitta so'rovda olamiz
      const [monthPayments, historyPayments, teachers] = await Promise.all([
        Payment.find({
          $or: [
            { studentId: { $in: studentIds } },
            { studentId: { $in: studentIdStrs } }
          ],
          month: targetMonth
        }),
        Payment.find({
          $or: [
            { studentId: { $in: studentIds } },
            { studentId: { $in: studentIdStrs } }
          ]
        }).sort({ date: -1 }),
        allTeacherIds.length > 0
          ? User.find({ _id: { $in: allTeacherIds } }, 'fullName username')
          : Promise.resolve([])
      ]);

      // teacherId → name map
      const teacherMap = {};
      teachers.forEach(t => { teacherMap[String(t._id)] = t.fullName || t.username; });

      // studentId bo'yicha to'lovlarni guruhlash
      const monthPaymentsByStudent  = {};
      const historyPaymentsByStudent = {};

      monthPayments.forEach(p => {
        const sid = String(p.studentId);
        if (!monthPaymentsByStudent[sid]) monthPaymentsByStudent[sid] = [];
        monthPaymentsByStudent[sid].push(p);
      });

      historyPayments.forEach(p => {
        const sid = String(p.studentId);
        if (!historyPaymentsByStudent[sid]) historyPaymentsByStudent[sid] = [];
        historyPaymentsByStudent[sid].push(p);
      });

      // ─── Har bir student uchun hisoblash ─────────────────────────────────────
      const enrichedStudents = students.map((student) => {
        const safeId = student._id.toString();
        const studentGroups = student.group
          ? student.group.split(',').map(g => g.trim()).filter(Boolean)
          : [];

        const getPrice = (groupName) => {
          if (student.groupsData?.length) {
            const match = student.groupsData.find(x => x.name === groupName);
            if (match?.price !== undefined) return Number(match.price);
          }
          return 300000;
        };

        const currentMonthPmts = monthPaymentsByStudent[safeId] || [];
        const paymentsHistory  = historyPaymentsByStudent[safeId] || [];

        let EXPECTED_TOTAL    = 0;
        let totalPaidForMonth = 0;
        let overallQarz       = 0;
        const debtDetails     = [];

        if (studentGroups.length > 0) {
          studentGroups.forEach(g => {
            const currentPrice = getPrice(g);
            const groupPmts    = currentMonthPmts.filter(p => p.groupName === g || !p.groupName);
            const paidForGroup = groupPmts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            const expectedForGroup = groupPmts.length > 0
              ? (Number(groupPmts[0].priceAtThatTime) || currentPrice)
              : currentPrice;

            EXPECTED_TOTAL    += expectedForGroup;
            totalPaidForMonth += paidForGroup;

            const qarzForGroup = expectedForGroup - paidForGroup;
            if (qarzForGroup > 0) overallQarz += qarzForGroup;

            debtDetails.push({
              group: g,
              paid: paidForGroup,
              qarz: qarzForGroup > 0 ? qarzForGroup : 0,
              isPaid: qarzForGroup <= 0,
              coursePrice: expectedForGroup
            });
          });
        } else {
          EXPECTED_TOTAL = 300000;
          totalPaidForMonth = currentMonthPmts.reduce((s, p) => s + (Number(p.amount) || 0), 0);
          overallQarz = Math.max(0, EXPECTED_TOTAL - totalPaidForMonth);
        }

        const isExcepted = student.exceptionMonths?.includes(targetMonth);

        let paymentStatus = "unpaid";
        if (isExcepted)            paymentStatus = "excepted";
        else if (overallQarz <= 0) paymentStatus = "paid";
        else if (totalPaidForMonth > 0) paymentStatus = "partial";

        // Ustozlar
        let tIdsForStudent = [];
        if (student.groupsData?.length) tIdsForStudent = student.groupsData.map(g => g.teacherId).filter(Boolean);
        else if (student.teacherIds?.length) tIdsForStudent = student.teacherIds;
        else if (student.teacherId) tIdsForStudent = [String(student.teacherId)];

        const teacherNames = [...new Set(tIdsForStudent)]
          .map(id => teacherMap[String(id)])
          .filter(Boolean);

        return {
          data: student,
          paymentStatus,
          month: targetMonth,
          coursePrice: EXPECTED_TOTAL,
          totalPaid: totalPaidForMonth,
          qarz: overallQarz,
          debtDetails,
          paymentsHistory,
          teacherName: teacherNames.length > 0 ? teacherNames.join(', ') : "O'quv markazi ustozi"
        };
      });

      return res.status(200).json({ success: true, students: enrichedStudents });
    } catch (error) {
      console.error("Profile API xatosi:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  return res.status(405).json({ message: "Ruxsat etilmagan metod" });
}