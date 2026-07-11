// ════════════════════════════════════════════════════════════════════════════
// QARZ HISOBLASH — UMUMIY FUNKSIYALAR
//
// Avval bu logika Groups.jsx va StudentDetailModal.jsx ichida ikki marta,
// deyarli bir xil (lekin mustaqil) yozilgan edi. Agar formula o'zgarsa,
// ikkalasini ham qo'lda sinxronlash kerak bo'lardi — bu xato qilish xavfini
// oshiradi. Endi ikkalasi ham shu yerdan import qiladi.
// ════════════════════════════════════════════════════════════════════════════

const DEFAULT_PRICE = 300000;

// O'quvchi qo'shilgan sanadan hozirgi kungacha nechta "oylik davr" o'tganini
// hisoblaydi (masalan 15-yanvarda qo'shilgan bo'lsa, 15-fevralda 2-davr boshlanadi).
export const calculateCycles = (addedAtStr) => {
  if (!addedAtStr) return 1;
  const added = new Date(addedAtStr);
  if (isNaN(added.getTime())) return 1;

  const today = new Date();
  let m = (today.getFullYear() - added.getFullYear()) * 12 + today.getMonth() - added.getMonth();
  if (today.getDate() < added.getDate()) m--;

  return Math.max(1, m + 1);
};

// Bitta guruh uchun qarzni hisoblaydi — to'lovlar tarixidagi har bir oy uchun
// o'sha vaqtdagi narxni ("priceAtThatTime") hisobga oladi, agar u yozilmagan
// bo'lsa to'langan summani yoki joriy narxni zaxira sifatida ishlatadi.
export const calculateGroupDebt = (groupName, studentPayments, currentPrice, activeCycles) => {
  const groupPayments = studentPayments.filter(p => p.groupName === groupName || !p.groupName);
  const totalPaid = groupPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  let expectedTotalFromHistory = 0;
  let paidMonthsCount = 0;

  const uniqueMonths = [...new Set(groupPayments.map(p => p.month))];

  uniqueMonths.forEach(m => {
    const paymentsForThisMonth = groupPayments.filter(p => p.month === m);
    const firstPaymentForMonth = paymentsForThisMonth[0];
    const sumForThisMonth = paymentsForThisMonth.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    // Eski to'lovlar himoyasi: agar arxivda narx snapshoti yozilmagan bo'lsa,
    // o'sha oyda to'langan summani 100% narx deb qabul qilamiz.
    const historicalPrice = firstPaymentForMonth.priceAtThatTime
      ? Number(firstPaymentForMonth.priceAtThatTime)
      : (sumForThisMonth > 0 ? sumForThisMonth : currentPrice);

    expectedTotalFromHistory += historicalPrice;
    paidMonthsCount++;
  });

  const unpaidMonthsCount = Math.max(0, activeCycles - paidMonthsCount);
  expectedTotalFromHistory += (unpaidMonthsCount * currentPrice);

  const qarz = expectedTotalFromHistory - totalPaid;

  return {
    group: groupName,
    paid: totalPaid,
    expectedTotal: expectedTotalFromHistory,
    qarz: qarz > 0 ? qarz : 0,
    isPaid: qarz <= 0,
    isPartial: totalPaid > 0 && qarz > 0
  };
};

// Bitta o'quvchi uchun BARCHA guruhlari bo'yicha qarzni yig'ib, umumiy
// natijani qaytaradi. `getPrice(groupName)` — guruh narxini qaytaruvchi funksiya.
export const calculateStudentDebt = (student, allPayments, getPrice) => {
  const studentGroups = student.group
    ? student.group.split(',').map(g => g.trim()).filter(Boolean)
    : [];

  const studentPayments = allPayments.filter(p => p.studentId === student._id);
  const activeCycles = calculateCycles(student.addedAt);

  let overallDebt = 0;
  let totalPaid = 0;
  let expectedTotal = 0;
  const debtDetails = [];

  if (studentGroups.length > 0) {
    studentGroups.forEach(g => {
      const currentPrice = getPrice ? getPrice(student, g) : DEFAULT_PRICE;
      const result = calculateGroupDebt(g, studentPayments, currentPrice, activeCycles);

      overallDebt += result.qarz;
      totalPaid += result.paid;
      expectedTotal += result.expectedTotal;
      debtDetails.push(result);
    });
  } else {
    expectedTotal = DEFAULT_PRICE * activeCycles;
    totalPaid = studentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    overallDebt = Math.max(0, expectedTotal - totalPaid);
  }

  return {
    activeCycles,
    debtDetails,
    overallDebt,
    totalPaid,
    expectedTotal,
    isPartial: totalPaid > 0 && overallDebt > 0
  };
};

// Standart guruh narxini student.groupsData'dan oladi, topilmasa 300 000 qaytaradi.
export const getGroupPrice = (student, groupName) => {
  if (student.groupsData && Array.isArray(student.groupsData)) {
    const match = student.groupsData.find(
      x => x.name?.trim().toLowerCase() === groupName?.trim().toLowerCase()
    );
    if (match?.price !== undefined) return Number(match.price);
  }
  return DEFAULT_PRICE;
};