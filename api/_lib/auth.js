// ════════════════════════════════════════════════════════════════════════════
// AVTORIZATSIYA YORDAMCHILARI
//
// MUHIM ESLATMA: x-user-role / x-user-id / x-parent-id headerlari HALI HAM
// kriptografik jihatdan tasdiqlanmagan (JWT yoki imzolangan sessiya emas).
// Brauzer konsolida istalgan kishi localStorage.setItem("userRole","super_admin")
// deb yozib, o'zini xohlagan roli qilib ko'rsatishi mumkin. Bu fayl faqat
// KOD TAKRORLANISHINI kamaytiradi — haqiqiy xavfsizlik emas. To'liq yechim —
// login vaqtida server imzolagan token (JWT) berish va har so'rovda uni
// tekshirish. Hozircha mavjud pattern bilan mos ishlaydi.
// ════════════════════════════════════════════════════════════════════════════

// So'rov headerlaridan rol/foydalanuvchi kontekstini o'qiydi
export const getRequestContext = (req) => {
  const role     = req.headers['x-user-role'] || null;
  const userId   = req.headers['x-user-id'] || null;
  const parentId = req.headers['x-parent-id'] || null;

  // Yordamchi bo'lsa — uning egasi (ustozi) ownerId hisoblanadi
  const ownerId = role === 'assistant' ? parentId : userId;

  return { role, userId, parentId, ownerId };
};

// Faqat ko'rsatilgan rollar so'rovni davom ettira oladi.
// Mos kelmasa, javobni to'g'ridan-to'g'ri yuboradi va `false` qaytaradi —
// chaqiruvchi shundan keyin darhol `return` qilishi kerak.
export const requireRole = (req, res, allowedRoles) => {
  const { role } = getRequestContext(req);
  if (!allowedRoles.includes(role)) {
    res.status(403).json({ success: false, message: "Ruxsat etilmagan!" });
    return false;
  }
  return true;
};