import { useState } from 'react';

export default function Attendance() {
  const [students, setStudents] = useState([
    { _id: '1', name: 'Aliyev Vali', status: null },
    { _id: '2', name: 'Karimova Lola', status: null },
    { _id: '3', name: 'Mamatov Jasur', status: null },
  ]);

  // Davomatni belgilash
  const markAttendance = (id, status) => {
    setStudents(students.map(s => s._id === id ? { ...s, status } : s));
  };

  const saveAttendance = () => {
    alert("Davomat saqlandi!"); // Bu yerda /api/attendance ga POST qilinadi
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Davomat - {new Date().toLocaleDateString()}</h1>
        <button 
          onClick={saveAttendance}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 shadow-sm"
        >
          Saqlash
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {students.map((student) => (
          <div key={student._id} className="flex justify-between items-center p-4 border-b last:border-0 hover:bg-gray-50">
            <span className="font-medium text-gray-700">{student.name}</span>
            
            <div className="flex space-x-2">
              <button 
                onClick={() => markAttendance(student._id, 'keldi')}
                className={`px-4 py-2 rounded text-sm font-medium transition ${student.status === 'keldi' ? 'bg-green-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-600'}`}
              >
                Keldi
              </button>
              
              <button 
                onClick={() => markAttendance(student._id, 'kelmadi')}
                className={`px-4 py-2 rounded text-sm font-medium transition ${student.status === 'kelmadi' ? 'bg-red-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600'}`}
              >
                Kelmadi
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}