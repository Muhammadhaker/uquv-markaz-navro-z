// ════════════════════════════════════════════════════════════════════════════
// QARZ HISOBLASH — UMUMIY MANTIQ
//
// Avval bu formulaning aynan bir xil nusxasi Groups.jsx va
// StudentDetailModal.jsx fayllarida alohida-alohida yozilgan edi (50+ qator
// takrorlangan kod). Agar formula o'zgarishi kerak bo'lsa, ikkala joyda ham
// qo'lda tuzatish talab qilinardi va ular osongina bir-biridan farqlanib
// qolishi mumkin edi. Endi ikkalasi ham shu yerdan import qiladi.
//
// ESLATMA: backenddagi api/student-profile.js'da BOSHQA (qasddan boshqacha)
// hisoblash bor — u faqat JORIY OYning holatini ko'rsatadi (ota-ona uchun),
// bu yerdagi formula esa o'quvchi qo'shilgan kundan buyon JAMI qarzni
// hisoblaydi (admin/ustoz uchun). Ular shu sabab ataylab alohida qoldirilgan.
// ════════════════════════════════════════════════════════════════════════════

export const DEFAULT_PRICE = 300000;

/**
 * O'quvchi qo'shilgan kundan (addedAt) buyon nechta oylik davr (sikl)
 * o'tganini hisoblaydi. Kamida 1 qaytaradi.
 */
export const calculateCycles = (addedAtStr) => {
  if (!addedAtStr) return 1;
  const added = new Date(addedAtStr);
  if (isNaN(added.getTime())) return 1;

  const today = new Date();
  let m = (today.getFullYear() - added.getFullYear()) * 12 + today.getMonth() - added.getMonth();

  if (today.getDate() < added.getDate()) {
    m--;
  }
  return Math.max(1, m + 1);
};

/**
 * Berilgan guruh bo'yicha o'quvchining bitta guruhdagi jami qarzini hisoblaydi.
 * Har bir to'langan oy uchun o'sha vaqtdagi narxni (priceAtThatTime) ishlatadi,
 * hali to'lanmagan oylar uchun esa joriy narxni qo'llaydi.
 *
 * @param {string} groupName
 * @param {Array}  studentPayments - shu o'quvchining BARCHA to'lovlari (filtrlanmagan)
 * @param {number} currentPrice - guruhning joriy (bugungi) narxi
 * @param {number} activeCycles - calculateCycles() natijasi
 */
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

    // Eski to'lovlar uchun himoya: agar arxivda narx-snapshot yozilmagan
    // bo'lsa, o'sha oyda to'langan jami summani 100% narx deb hisoblaymiz.
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

/**
 * Berilgan o'quvchining barcha guruhlari bo'yicha to'liq qarz hisobotini
 * qaytaradi (guruhi bo'lmasa ham ishlaydi — "Umumiy" holat).
 *
 * @param {object} student - groupsData/group/addedAt maydonlariga ega hujjat
 * @param {Array}  allPayments - TIZIMDAGI barcha to'lovlar (studentId bo'yicha filtrlanadi)
 * @param {(groupName:string)=>number} [getPriceFn] - narxni topish funksiyasi (ixtiyoriy override)
 */
export const calculateStudentDebt = (student, allPayments, getPriceFn) => {
  const activeCycles = calculateCycles(student.addedAt);
  const studentPayments = allPayments.filter(p => p.studentId === student._id);
  const studentGroups = student.group ? student.group.split(',').map(g => g.trim()).filter(Boolean) : [];

  const getPrice = getPriceFn || ((groupName) => {
    if (student.groupsData && Array.isArray(student.groupsData)) {
      const found = student.groupsData.find(g => g.name?.trim().toLowerCase() === groupName?.trim().toLowerCase());
      if (found && found.price !== undefined) return Number(found.price);
    }
    return DEFAULT_PRICE;
  });

  if (studentGroups.length > 0) {
    const groupDebts = studentGroups.map(g => calculateGroupDebt(g, studentPayments, getPrice(g), activeCycles));
    const totalPaid = groupDebts.reduce((sum, d) => sum + d.paid, 0);
    const expectedTotal = groupDebts.reduce((sum, d) => sum + d.expectedTotal, 0);
    const overallDebt = groupDebts.reduce((sum, d) => sum + d.qarz, 0);
    const debtDetails = groupDebts.filter(d => d.qarz > 0).map(d => ({ group: d.group, qarz: d.qarz }));

    return { activeCycles, groupDebts, debtDetails, totalPaid, expectedTotal, overallDebt, isPartial: totalPaid > 0 && overallDebt > 0 };
  }

  const expectedTotal = DEFAULT_PRICE * activeCycles;
  const totalPaid = studentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const overallDebt = Math.max(0, expectedTotal - totalPaid);

  return { activeCycles, groupDebts: [], debtDetails: [], totalPaid, expectedTotal, overallDebt, isPartial: totalPaid > 0 && overallDebt > 0 };
};