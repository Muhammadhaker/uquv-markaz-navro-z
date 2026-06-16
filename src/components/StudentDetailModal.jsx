import { X, Phone, BookOpen, CreditCard, History } from "lucide-react";
import PaymentModal from "./PaymentModal";
import { useState } from "react";

export default function StudentDetailModal({ student, onClose, onRefresh }) {
  const [isPayOpen, setIsPayOpen] = useState(false);

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
          <div className="flex justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">{student.name}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Phone size={18} className="text-indigo-500" /> {student.phone}
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <BookOpen size={18} className="text-indigo-500" /> {student.group}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setIsPayOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all"
            >
              <CreditCard size={18} /> To'lov qilish
            </button>
            <button className="w-full flex items-center justify-center gap-2 bg-slate-100 py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-200 transition-all">
              <History size={18} /> To'lovlar tarixi
            </button>
          </div>
        </div>
      </div>

      {isPayOpen && (
        <PaymentModal
          student={student}
          isOpen={true}
          onClose={() => {
            setIsPayOpen(false);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
