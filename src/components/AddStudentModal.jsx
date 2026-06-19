import { useState, useEffect } from "react";
import { X, User, Phone, Users, BookOpen } from "lucide-react";

// O'quv markazingizdagi barcha fanlar ro'yxati (Buni istalgancha ko'paytirishingiz mumkin)
const AVAILABLE_SUBJECTS = ["Matematika", "Ingliz tili", "Rus tili", "Fizika"];

export default function AddStudentModal({ isOpen, onClose, studentToEdit }) {
  const [formData, setFormData] = useState({
    name: "",
    parentName: "",
    phone: "+998 ",
    groups: [], // Endi guruh bitta so'z emas, massiv (Array) bo'ladi
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (studentToEdit) {
      // Tahrirlashda o'quvchining fanlarini (vergul bilan ajratilgan yozuvni) qayta massivga aylantiramiz
      const studentGroups = studentToEdit.group 
        ? studentToEdit.group.split(",").map(g => g.trim()) 
        : [];
        
      setFormData({
        name: studentToEdit.name,
        parentName: studentToEdit.parentName || "",
        phone: studentToEdit.phone,
        groups: studentGroups,
      });
    } else {
      // Yangi o'quvchi qo'shilayotganda oynani tozalab qo'yamiz
      setFormData({
        name: "",
        parentName: "",
        phone: "+998 ",
        groups: [],
      });
    }
  }, [studentToEdit, isOpen]);

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

  // YANGI: Fanlarni tanlash/o'chirish logikasi
  const toggleSubject = (subject) => {
    setFormData((prev) => {
      const isSelected = prev.groups.includes(subject);
      return {
        ...prev,
        groups: isSelected
          ? prev.groups.filter((g) => g !== subject) // Agar tanlangan bo'lsa o'chiramiz
          : [...prev.groups, subject],               // Tanlanmagan bo'lsa qo'shamiz
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Majburiy tekshiruv
    if (formData.groups.length === 0) {
      alert("Iltimos, o'quvchiga kamida bitta fanni tanlang!");
      return;
    }

    setLoading(true);
    const method = studentToEdit ? "PUT" : "POST";
    
    // Massivni yana orqaga (bazaga saqlash uchun) string'ga o'giramiz: "Matematika, Ingliz tili"
    const finalGroupString = formData.groups.join(", "); 
    
    const body = studentToEdit
      ? { id: studentToEdit._id, ...formData, group: finalGroupString }
      : { ...formData, group: finalGroupString };

    try {
      const response = await fetch("/api/students", {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      if (response.ok) {
        // TUGAGANDAN KEYIN LOGGA YOZISH (To'g'ri joylashtirildi)
        const adminName = localStorage.getItem("username") || "Admin";
        await fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adminName: adminName,
            actionType: studentToEdit ? "update" : "create",
            details: `O'quvchi ${studentToEdit ? "tahrirlandi" : "qo'shildi"}: ${formData.name} (Fani: ${finalGroupString})`
          })
        });

        onClose();
      }
    } catch (error) {
      console.error(error);
      alert("Saqlashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

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

          {/* YANGI GURUH TANLASH QISMI (TUGMACHALAR) */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Fanlarni tanlang:</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SUBJECTS.map((subject) => {
                const isSelected = formData.groups.includes(subject);
                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => toggleSubject(subject)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                      isSelected 
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700" 
                        : "border-slate-100 bg-white text-slate-600 hover:border-indigo-200"
                    }`}
                  >
                    {subject}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
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