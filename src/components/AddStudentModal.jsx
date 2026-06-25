import { useState, useEffect } from "react";
import { X, Plus, DollarSign } from "lucide-react";

export default function AddStudentModal({ isOpen, onClose, studentToEdit }) {
  const getSafeDate = (dateStr) => {
    try {
      if (!dateStr) return new Date().toISOString().split("T")[0];
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return new Date().toISOString().split("T")[0];
      return d.toISOString().split("T")[0];
    } catch (e) {
      return new Date().toISOString().split("T")[0];
    }
  };

  const [formData, setFormData] = useState({
    name: "",
    parentName: "",
    phone: "+998 ",
    groupsData: [],
    addedAt: getSafeDate(),
  });
  
  const [currentGroupInput, setCurrentGroupInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (studentToEdit) {
      let parsedGroups = [];
      if (Array.isArray(studentToEdit.groupsData) && studentToEdit.groupsData.length > 0) {
        parsedGroups = studentToEdit.groupsData;
      } else if (studentToEdit.group) {
        parsedGroups = studentToEdit.group.split(",").map(g => ({
          name: g.trim(), price: 300000
        })).filter(g => g.name);
      }
      setFormData({
        name: studentToEdit.name || "",
        parentName: studentToEdit.parentName || "",
        phone: studentToEdit.phone || "+998 ",
        groupsData: parsedGroups,
        addedAt: getSafeDate(studentToEdit.addedAt),
      });
    } else {
      setFormData({ name: "", parentName: "", phone: "+998 ", groupsData: [], addedAt: getSafeDate() });
    }
    setCurrentGroupInput(""); 
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

  const addGroup = () => {
    const trimmed = currentGroupInput.trim();
    if (trimmed) {
      const alreadyExists = formData.groupsData.some(g => g.name.toLowerCase() === trimmed.toLowerCase());
      if (!alreadyExists) {
        setFormData(prev => ({
          ...prev, groupsData: [...prev.groupsData, { name: trimmed, price: 300000 }],
        }));
      }
    }
    setCurrentGroupInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addGroup();
    }
  };

  const removeGroup = (groupNameToRemove) => {
    setFormData(prev => ({
      ...prev, groupsData: prev.groupsData.filter((g) => g.name !== groupNameToRemove),
    }));
  };

  const handlePriceChange = (groupName, newPriceStr) => {
    const rawNumber = Number(newPriceStr.replace(/\D/g, ""));
    setFormData(prev => ({
      ...prev, groupsData: prev.groupsData.map(g => 
        g.name === groupName ? { ...g, price: rawNumber } : g
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.groupsData.length === 0) {
      alert("Iltimos, o'quvchiga kamida bitta guruh kiriting!");
      return;
    }

    setLoading(true);
    const method = studentToEdit ? "PUT" : "POST";
    const finalGroupString = formData.groupsData.map(g => g.name).join(", "); 
    
    // 🔥 TELEFON MAJBURIY EMAS: Agar bo'sh qoldirsa "Kiritilmagan" deb saqlaydi
    let finalPhone = formData.phone.trim();
    if (finalPhone === "+998") finalPhone = "Kiritilmagan";

    const body = { 
      ...(studentToEdit && { id: studentToEdit._id }),
      ...formData, 
      phone: finalPhone,
      group: finalGroupString,
      groupsData: formData.groupsData
    };

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
      alert("Saqlashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-bold mb-4 text-slate-800">
          {studentToEdit ? "Tahrirlash" : "Yangi o'quvchi"}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            required
            className="w-full p-3 border rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700"
            placeholder="O'quvchi F.I.SH"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <input
            required
            className="w-full p-3 border rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700"
            placeholder="Ota-ona F.I.SH"
            value={formData.parentName}
            onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
          />
          <input
            className="w-full p-3 border rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700"
            placeholder="Telefon (ixtiyoriy)"
            value={formData.phone}
            onChange={handlePhoneChange}
            maxLength={17}
          />

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Qo'shilgan sana:</label>
              <input
                type="date"
                required
                className="w-full mt-1 p-3 border rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700"
                value={formData.addedAt}
                onChange={(e) => setFormData({ ...formData, addedAt: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t pt-4">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Guruhlarni kiriting:</label>
            
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 p-3 border rounded-xl outline-none focus:border-indigo-500 text-sm font-medium"
                placeholder="Mas: Matematika 1-guruh"
                value={currentGroupInput}
                onChange={(e) => setCurrentGroupInput(e.target.value)}
                onKeyDown={handleKeyDown} 
              />
              <button
                type="button"
                onClick={addGroup}
                className="bg-indigo-100 text-indigo-700 px-4 rounded-xl font-bold hover:bg-indigo-200 transition-colors flex items-center gap-1"
              >
                <Plus size={18} /> Qo'shish
              </button>
            </div>
            
            {formData.groupsData.length > 0 && (
              <div className="space-y-2 mt-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[11px] text-slate-400 font-medium mb-2">Tanlangan guruhlar narxini o'zgartirishingiz mumkin:</p>
                {formData.groupsData.map((g, index) => (
                  <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-white p-2 border rounded-lg shadow-sm">
                    <div className="flex items-center gap-2 max-w-[50%]">
                      <button type="button" onClick={() => removeGroup(g.name)} className="text-rose-400 hover:text-rose-600 transition-colors p-1">
                        <X size={16} />
                      </button>
                      <span className="text-sm font-bold text-slate-700 truncate">{g.name}</span>
                    </div>
                    <div className="flex items-center relative w-full sm:w-auto mt-2 sm:mt-0">
                      <input 
                        type="text" 
                        inputMode="numeric"
                        className="w-full sm:w-32 py-1.5 pl-3 pr-8 border rounded outline-none focus:border-emerald-500 text-sm font-bold text-emerald-600 bg-emerald-50"
                        value={g.price === 0 ? "" : g.price.toLocaleString("ru-RU")}
                        onChange={(e) => handlePriceChange(g.name, e.target.value)}
                      />
                      <DollarSign size={14} className="absolute right-2 text-emerald-600/50 pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <button type="button" onClick={onClose} className="w-full py-3 bg-slate-100 font-bold text-slate-500 rounded-xl hover:bg-slate-200 transition-colors">Bekor qilish</button>
            <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 font-bold text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-70 flex justify-center items-center">
              {loading ? "Saqlanmoqda..." : "Saqlash"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}