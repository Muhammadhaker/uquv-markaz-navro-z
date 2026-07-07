import { useState, useEffect } from "react";
import { X, Plus, DollarSign, Loader2, UserCheck } from "lucide-react";

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
  const [teachers, setTeachers] = useState([]);
  const [selectedGroupTeacher, setSelectedGroupTeacher] = useState(""); 

  const role = localStorage.getItem("userRole");
  const currentUserId = localStorage.getItem("userId");

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "x-user-role": role || "",
    "x-user-id": currentUserId || "",
    "x-parent-id": localStorage.getItem("parentTeacherId") || ""
  });

  useEffect(() => {
    if (isOpen && role === "super_admin") {
      fetch("/api/auth", { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setTeachers(data.data.filter(u => u.role === "teacher"));
          }
        })
        .catch(err => console.error("Ustozlarni yuklashda xato:", err));
    }
  }, [isOpen, role]);

  useEffect(() => {
    if (studentToEdit) {
      let parsedGroups = [];
      if (Array.isArray(studentToEdit.groupsData) && studentToEdit.groupsData.length > 0) {
        parsedGroups = studentToEdit.groupsData;
      } else if (studentToEdit.group) {
        parsedGroups = studentToEdit.group.split(",").map(g => ({
          name: g.trim(), price: 300000, teacherId: studentToEdit.teacherId || currentUserId
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
    setSelectedGroupTeacher("");
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
    if (!trimmed) return;

    if (role === "super_admin" && !selectedGroupTeacher) {
      alert("Iltimos, bu guruh uchun ustozni tanlang!");
      return;
    }

    const targetTeacherId = role === "super_admin" ? selectedGroupTeacher : currentUserId;
    
    const alreadyExists = formData.groupsData.some(g => g.name.toLowerCase() === trimmed.toLowerCase());
    if (!alreadyExists) {
      setFormData(prev => ({
        ...prev, groupsData: [...prev.groupsData, { name: trimmed, price: 300000, teacherId: targetTeacherId }],
      }));
    }
    setCurrentGroupInput("");
    setSelectedGroupTeacher("");
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
    let currentGroups = [...formData.groupsData];
    
    if (currentGroups.length === 0) {
      alert("Iltimos, o'quvchiga kamida bitta guruh kiriting va qo'shish tugmasini bosing!");
      return;
    }

    setLoading(true);
    const method = studentToEdit ? "PUT" : "POST";
    const finalGroupString = currentGroups.map(g => g.name).join(", "); 
    
    let finalPhone = formData.phone.trim();
    if (finalPhone === "+998") finalPhone = "Kiritilmagan";

    const body = { 
      ...(studentToEdit && { id: studentToEdit._id }),
      ...formData, 
      phone: finalPhone,
      group: finalGroupString,
      groupsData: currentGroups
    };

    try {
      const response = await fetch("/api/students", {
        method: method,
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      
      if (response.ok) {
        const adminName = localStorage.getItem("userFullName") || "Admin";
        await fetch("/api/logs", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            adminName: adminName,
            actionType: studentToEdit ? "update" : "create",
            details: `O'quvchi ${studentToEdit ? "tahrirlandi" : "qo'shildi"}: ${formData.name} (Guruhlari: ${finalGroupString})`
          })
        });
        onClose();
      } else {
        alert("Xatolik: Server ma'lumotni qabul qilmadi.");
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
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
      {/* max-h-[90vh] va p-5 orqali vertikal joy tejaldi */}
      <div className="bg-white rounded-3xl w-full max-w-xl p-5 shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200 custom-scrollbar">
        
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800">
            {studentToEdit ? "Tahrirlash" : "Yangi o'quvchi"}
          </h2>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full bg-slate-50 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-3.5">
          
          {/* 🔥 1-QATOR: O'quvchi FISH va Ota-ona FISH (Yonma-yon) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">O'quvchi F.I.SH</label>
              <input
                required
                className="w-full py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700 bg-slate-50 text-sm"
                placeholder="Masalan: Boymurodov Asliddin"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Ota-ona F.I.SH</label>
              <input
                required
                className="w-full py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700 bg-slate-50 text-sm"
                placeholder="Masalan: Hayitov Bekzod"
                value={formData.parentName}
                onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
              />
            </div>
          </div>

          {/* 🔥 2-QATOR: Telefon va Qo'shilgan sana (Yonma-yon) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Telefon raqam</label>
              <input
                className="w-full py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700 bg-slate-50 text-sm tracking-wide"
                placeholder="Telefon (ixtiyoriy)"
                value={formData.phone}
                onChange={handlePhoneChange}
                maxLength={17}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Qo'shilgan sana</label>
              <input
                type="date"
                required
                className="w-full py-2.5 px-3.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700 bg-slate-50 text-sm cursor-pointer"
                value={formData.addedAt}
                onChange={(e) => setFormData({ ...formData, addedAt: e.target.value })}
              />
            </div>
          </div>

          {/* Guruh qo'shish bloki */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Fanni va Ustozni biriktirish:</label>
            
            <div className="flex flex-col sm:flex-row gap-2 bg-indigo-50/40 p-2.5 rounded-xl border border-indigo-100/60">
              <input
                type="text"
                className="flex-1 p-2.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-sm font-medium bg-white"
                placeholder="Mas: Matematika Sertifikat"
                value={currentGroupInput}
                onChange={(e) => setCurrentGroupInput(e.target.value)}
                onKeyDown={handleKeyDown} 
              />
              
              <div className="flex gap-2 flex-1 sm:flex-none">
                {role === "super_admin" && (
                  <select 
                    className="flex-1 sm:w-44 border border-indigo-200 p-2.5 rounded-lg outline-none focus:border-indigo-500 bg-white font-bold text-slate-700 cursor-pointer text-sm"
                    value={selectedGroupTeacher}
                    onChange={(e) => setSelectedGroupTeacher(e.target.value)}
                  >
                    <option value="" disabled>-- Ustoz --</option>
                    {teachers.map(t => (
                      <option key={t._id} value={t._id}>{t.fullName || t.username}</option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={addGroup}
                  className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1 active:scale-95 text-sm whitespace-nowrap"
                >
                  <Plus size={16} /> Qo'shish
                </button>
              </div>
            </div>
            
            {/* Tanlangan fanlar ro'yxati (Ancha ixcham qilingan) */}
            {formData.groupsData.length > 0 && (
              <div className="space-y-1.5 mt-2 bg-slate-50 p-2 rounded-xl border border-slate-100 max-h-40 overflow-y-auto custom-scrollbar">
                {formData.groupsData.map((g, index) => (
                  <div key={index} className="flex items-center justify-between gap-3 bg-white p-2 border border-slate-100 rounded-lg shadow-sm">
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => removeGroup(g.name)} className="text-rose-400 hover:text-rose-600 transition-colors p-0.5">
                          <X size={14} />
                        </button>
                        <span className="text-xs font-bold text-slate-700 truncate">{g.name}</span>
                      </div>
                      {role === "super_admin" && (
                        <div className="text-[9px] text-indigo-500 font-bold ml-5 truncate">
                          Ustoz: {teachers.find(t => t._id === g.teacherId)?.fullName || "Noma'lum"}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center relative flex-shrink-0">
                      <input 
                        type="text" 
                        inputMode="numeric"
                        className="w-24 py-1 pl-2 pr-6 border border-emerald-100 rounded-md outline-none focus:border-emerald-500 text-xs font-bold text-emerald-700 bg-emerald-50/40 text-center"
                        value={g.price === 0 ? "" : g.price.toLocaleString("ru-RU")}
                        onChange={(e) => handlePriceChange(g.name, e.target.value)}
                      />
                      <DollarSign size={12} className="absolute right-1.5 text-emerald-600/50 pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pastki tugmalar */}
          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="w-full py-3 bg-slate-100 font-bold text-slate-600 rounded-xl hover:bg-slate-200 transition-colors text-sm active:scale-95">Bekor qilish</button>
            <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 font-bold text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-70 flex justify-center items-center shadow-lg shadow-indigo-600/20 text-sm active:scale-95">
              {loading ? <Loader2 className="animate-spin" size={18} /> : "Saqlash"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}