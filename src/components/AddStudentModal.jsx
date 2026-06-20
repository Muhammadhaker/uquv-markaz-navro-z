import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";

export default function AddStudentModal({ isOpen, onClose, studentToEdit }) {
  const [formData, setFormData] = useState({
    name: "",
    parentName: "",
    phone: "+998 ",
    telegramChatId: "", // 🔥 YANGI: Telegram ID qo'shildi
    groups: [], // Guruhlar ro'yxati (Massiv)
  });
  
  // Admin yozayotgan joriy guruh nomi
  const [currentGroupInput, setCurrentGroupInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (studentToEdit) {
      // Tahrirlashda: "Matematika 1-guruh, Ingliz tili 2" degan yozuvni bo'laklab olamiz
      const studentGroups = studentToEdit.group 
        ? studentToEdit.group.split(",").map(g => g.trim()).filter(Boolean) 
        : [];
        
      setFormData({
        name: studentToEdit.name,
        parentName: studentToEdit.parentName || "",
        phone: studentToEdit.phone,
        telegramChatId: studentToEdit.telegramChatId || "", // 🔥 Tahrirlashda ID ni yuklash
        groups: studentGroups,
      });
    } else {
      setFormData({
        name: "",
        parentName: "",
        phone: "+998 ",
        telegramChatId: "", // 🔥 Yangi qo'shishda bo'sh turadi
        groups: [],
      });
    }
    setCurrentGroupInput(""); // Inputni tozalash
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

  // Guruhni ro'yxatga qo'shish funksiyasi
  const addGroup = () => {
    const trimmed = currentGroupInput.trim();
    if (trimmed && !formData.groups.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        groups: [...prev.groups, trimmed],
      }));
    }
    setCurrentGroupInput(""); // Qo'shgandan keyin inputni tozalaymiz
  };

  // Enter bosilganda formani jo'natib yubormasdan, guruhni qo'shish
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addGroup();
    }
  };

  // Guruhni o'chirish (x bosilganda)
  const removeGroup = (groupToRemove) => {
    setFormData((prev) => ({
      ...prev,
      groups: prev.groups.filter((g) => g !== groupToRemove),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.groups.length === 0) {
      alert("Iltimos, o'quvchiga kamida bitta guruh kiriting!");
      return;
    }

    setLoading(true);
    const method = studentToEdit ? "PUT" : "POST";
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
        const adminName = localStorage.getItem("username") || "Admin";
        await fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adminName: adminName,
            actionType: studentToEdit ? "update" : "create",
            details: `O'quvchi ${studentToEdit ? "tahrirlandi" : "qo'shildi"}: ${formData.name} (Guruhlari: ${finalGroupString})`
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
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
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

          {/* 🔥 YANGI: TELEGRAM ID INPUTI */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">Telegram Chat ID (Ixtiyoriy):</label>
            <input
              type="text"
              className="w-full mt-1 p-3 border rounded-xl outline-none focus:border-indigo-500"
              placeholder="Masalan: 2025338995"
              value={formData.telegramChatId}
              onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value.replace(/\D/g, "") })}
            />
          </div>

          {/* DYNAMIC GURUH QO'SHISH QISMI */}
          <div className="space-y-2 pt-2 border p-3 rounded-xl bg-slate-50">
            <label className="text-xs font-bold text-slate-500 uppercase">Guruhlarni kiriting:</label>
            
            {/* Kiritish maydoni va qo'shish tugmasi */}
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 p-2.5 border rounded-lg outline-none focus:border-indigo-500 text-sm"
                placeholder="Mas: Matematika 1-guruh"
                value={currentGroupInput}
                onChange={(e) => setCurrentGroupInput(e.target.value)}
                onKeyDown={handleKeyDown} // Enter bosilganda qo'shadi
              />
              <button
                type="button"
                onClick={addGroup}
                className="bg-indigo-100 text-indigo-700 px-3 rounded-lg font-bold hover:bg-indigo-200 transition-colors flex items-center gap-1"
              >
                <Plus size={16} /> Qo'shish
              </button>
            </div>
            
            <p className="text-[11px] text-slate-400">Guruh nomini yozib "Enter" ni yoki "Qo'shish" tugmasini bosing.</p>

            {/* Tanlangan guruhlar ro'yxati (Teglar) */}
            {formData.groups.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {formData.groups.map((g, index) => (
                  <div key={index} className="flex items-center gap-1.5 bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                    {g}
                    <button type="button" onClick={() => removeGroup(g)} className="hover:text-rose-300 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
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