import { useState, useEffect } from "react";
import { X, User, Phone, Users, BookOpen } from "lucide-react";

export default function AddStudentModal({ isOpen, onClose, studentToEdit }) {
  const [formData, setFormData] = useState({
    name: "",
    parentName: "",
    phone: "+998 ",
    group: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (studentToEdit) {
      setFormData({
        name: studentToEdit.name,
        parentName: studentToEdit.parentName || "",
        phone: studentToEdit.phone,
        group: studentToEdit.group,
      });
    }
  }, [studentToEdit]);

  const handlePhoneChange = (e) => {
    let input = e.target.value.replace(/\D/g, "");
    if (input.startsWith("998")) input = input.substring(3);
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
    const method = studentToEdit ? "PUT" : "POST";
    const body = studentToEdit
      ? { id: studentToEdit._id, ...formData }
      : formData;

    try {
      await fetch("/api/students", {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  // Masalan AddStudentModal.jsx ichidagi handleSubmit tugagach:
  await fetch("/api/logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adminName: localStorage.getItem("username") || "Admin",
      actionType: "update",
      details: `O'quvchi qo'shildi/tahrirlandi: ${formData.name} (Fani: ${formData.group})`
    })
  });
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-xl font-bold mb-4">
          {studentToEdit ? "Tahrirlash" : "Yangi o'quvchi"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            required
            className="w-full p-3 border rounded-xl outline-none focus:border-indigo-500"
            placeholder="O'quvchi F.I.SH"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <input
            required
            className="w-full p-3 border rounded-xl outline-none focus:border-indigo-500"
            placeholder="Ota-ona F.I.SH"
            value={formData.parentName}
            onChange={(e) =>
              setFormData({ ...formData, parentName: e.target.value })
            }
          />
          <input
            required
            className="w-full p-3 border rounded-xl outline-none focus:border-indigo-500"
            placeholder="+998 99 123 45 67"
            value={formData.phone}
            onChange={handlePhoneChange}
            maxLength={17}
          />

          {/* YANGILANGAN GURUH TANLASH QISMI */}
          <div className="space-y-1">
            <input
              required
              list="group-suggestions"
              className="w-full p-3 border rounded-xl outline-none focus:border-indigo-500"
              placeholder="Guruh nomi (Mas: Matematika 1-guruh)"
              value={formData.group}
              onChange={(e) =>
                setFormData({ ...formData, group: e.target.value })
              }
            />
            <datalist id="group-suggestions">
              <option value="Matematika 1-guruh" />
              <option value="Matematika 2-guruh" />
              <option value="Ingliz tili 1-guruh" />
              <option value="Matematika, Ingliz tili" />
            </datalist>
            <p className="text-[11px] text-slate-500 leading-tight">
              Yangi guruh ochish uchun nomini to'liq yozing. O'quvchini boshqa guruhga o'tkazish uchun yozuvni tahrirlang.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-slate-100 font-medium text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
            >
              Bekor
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 font-medium text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-70"
            >
              {loading ? "Saqlanmoqda..." : "Saqlash"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}