import { X, Phone, DollarSign, BookOpen } from 'lucide-react';

export default function StudentDetailModal({ student, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">{student.name}</h2>
          <button onClick={onClose}><X /></button>
        </div>
        
        <div className="space-y-4">
          <p className="flex items-center gap-2"><Phone size={18}/> {student.phone}</p>
          <p className="flex items-center gap-2"><BookOpen size={18}/> {student.group}</p>
          
          <div className="border-t pt-4 mt-4">
            <h3 className="font-bold mb-2">To'lovlar:</h3>
            <button className="w-full bg-indigo-600 text-white py-2 rounded-xl mb-2">
              To'lov qilish
            </button>
            <button className="w-full bg-slate-100 py-2 rounded-xl">
              To'lovlar tarixi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}