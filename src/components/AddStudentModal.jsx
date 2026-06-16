import { useState, useEffect } from "react";
import { X, User, Phone, Users } from "lucide-react";

export default function AddStudentModal({ isOpen, onClose, studentToEdit }) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "+998 ",
    group: "",
  });
  const [loading, setLoading] = useState(false);

  // Agar tahrirlash (Edit) tugmasi bosilgan bo'lsa, eski ma'lumotlarni to'ldiramiz
  useEffect(() => {
    if (studentToEdit) {
      setFormData({
        name: studentToEdit.name,
        phone: studentToEdit.phone,
        group: studentToEdit.group,
      });
    }
  }, [studentToEdit]);

  // TELEFON RAQAMNI YOZAYOTGANDA AVTOMAT FORMATLASH
  const handlePhoneChange = (e) => {
    let input = e.target.value.replace(/\D/g, ""); // Faqat raqamlarni olamiz
    if (input.startsWith("998")) input = input.substring(3); // 998 ni olib tashlaymiz

    let formatted = "+998 ";
    if (input.length > 0) formatted += input.substring(0, 2);
    if (input.length > 2) formatted += " " + input.substring(2, 5);
    if (input.length > 5) formatted += " " + input.substring(5, 7);
    if (input.length > 7) formatted += " " + input.substring(7, 9);

    setFormData({ ...formData, phone: formatted });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Xuddi eski API'ingizdek yuboramiz (Edit bo'lsa PUT, yangi bo'lsa POST)
    const method = studentToEdit ? "PUT" : "POST";
    const body = studentToEdit
      ? { id: studentToEdit._id, ...formData }
      : formData;

    try {
      const res = await fetch("/api/students", {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        onClose(); // Saqlangach oynani yopamiz va yangilaymiz
      } else {
        alert("Xatolik yuz berdi");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">
            {studentToEdit
              ? "O'quvchini tahrirlash"
              : "Yangi o'quvchi qo'shish"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              F.I.SH
            </label>
            <div className="relative">
              <User
                className="absolute left-3 top-3.5 text-slate-400"
                size={18}
              />
              <input
                required
                type="text"
                placeholder="Masalan: Tursunov Muhammad"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full pl-10 pr-4 py-3 rounded-xl border focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Telefon raqam
            </label>
            <div className="relative">
              <Phone
                className="absolute left-3 top-3.5 text-slate-400"
                size={18}
              />
              <input
                required
                type="text"
                placeholder="+998 99 123 45 67"
                value={formData.phone}
                onChange={handlePhoneChange}
                maxLength={17}
                className="w-full pl-10 pr-4 py-3 rounded-xl border focus:border-indigo-500 outline-none font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Guruh nomi
            </label>
            <div className="relative">
              <Users
                className="absolute left-3 top-3.5 text-slate-400"
                size={18}
              />
              <input
                required
                type="text"
                placeholder="Masalan: Ingliz tili"
                value={formData.group}
                onChange={(e) =>
                  setFormData({ ...formData, group: e.target.value })
                }
                className="w-full pl-10 pr-4 py-3 rounded-xl border focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-slate-100 font-bold rounded-xl hover:bg-slate-200"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Saqlanmoqda..." : "Saqlash"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
