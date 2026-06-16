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
            className="w-full p-3 border rounded-xl"
            placeholder="O'quvchi F.I.SH"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <input
            required
            className="w-full p-3 border rounded-xl"
            placeholder="Ota-ona F.I.SH"
            value={formData.parentName}
            onChange={(e) =>
              setFormData({ ...formData, parentName: e.target.value })
            }
          />
          <input
            required
            className="w-full p-3 border rounded-xl"
            placeholder="+998 99 123 45 67"
            value={formData.phone}
            onChange={handlePhoneChange}
            maxLength={17}
          />
          <select
            required
            className="w-full p-3 border rounded-xl"
            value={formData.group}
            onChange={(e) =>
              setFormData({ ...formData, group: e.target.value })
            }
          >
            <option value="">Fanni tanlang...</option>
            <option value="Matematika">Matematika</option>
            <option value="Ingliz tili">Ingliz tili</option>
            <option value="Matematika, Ingliz tili">
              Matematika, Ingliz tili
            </option>
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-slate-100 rounded-xl"
            >
              Bekor
            </button>
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 text-white rounded-xl"
            >
              Saqlash
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
