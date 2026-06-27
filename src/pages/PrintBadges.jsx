import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, ArrowLeft, Loader2, Filter, Users, Image as ImageIcon, CheckSquare, Square } from "lucide-react";

export default function PrintBadges() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState("Barchasi");
  
  const [printMode, setPrintMode] = useState("front"); 
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch("/api/students");
        const data = await res.json();
        if (data.success) {
          const sortedStudents = data.data.sort((a, b) => a.name.localeCompare(b.name));
          setStudents(sortedStudents);
          setSelectedIds(sortedStudents.map(s => s._id)); 
        }
      } catch (err) {
        console.error("O'quvchilarni yuklashda xato:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const allGroups = students.flatMap((s) =>
    s.group ? s.group.split(",").map((g) => g.trim()) : []
  );
  const uniqueGroups = ["Barchasi", ...new Set(allGroups)].filter(Boolean);

  const filteredStudents = students.filter((s) => {
    if (selectedGroup === "Barchasi") return true;
    const sGroups = s.group ? s.group.split(",").map((g) => g.trim()) : [];
    return sGroups.includes(selectedGroup);
  });

  const handleGroupChange = (e) => {
    const newGroup = e.target.value;
    setSelectedGroup(newGroup);
    
    const newFiltered = students.filter((s) => {
      if (newGroup === "Barchasi") return true;
      const sGroups = s.group ? s.group.split(",").map((g) => g.trim()) : [];
      return sGroups.includes(newGroup);
    });
    setSelectedIds(newFiltered.map(s => s._id));
  };

  const toggleSelection = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([]); 
    } else {
      setSelectedIds(filteredStudents.map(s => s._id)); 
    }
  };

  const handlePrint = (mode) => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintMode("front"), 500);
    }, 300);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24">
      
      <div className="no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6 border-b border-slate-200 pb-6">
          <div>
            <button 
              onClick={() => window.history.back()} 
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 font-bold mb-3 transition-colors w-fit px-3 py-1.5 -ml-3 rounded-lg hover:bg-slate-100"
            >
              <ArrowLeft size={16} /> Orqaga qaytish
            </button>
            <h1 className="text-2xl font-bold text-slate-800">Tejamkor Bejiklar (1 varaqda 9 ta)</h1>
            <p className="text-slate-500 text-sm mt-1">
              Yonma-yon 3 ta, pastma-past 3 ta joylashadigan ixcham format (60x95mm).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button 
              onClick={() => handlePrint('front')}
              disabled={selectedIds.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Printer size={20} /> <span>Oldi (QR) - {selectedIds.length} ta</span>
            </button>

            <button 
              onClick={() => handlePrint('back')}
              disabled={selectedIds.length === 0}
              className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <ImageIcon size={20} /> <span>Orqasi (Logo) - {selectedIds.length} ta</span>
            </button>
          </div>
        </div>

        <div className="mb-8 flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 justify-between">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="text-slate-500 font-bold px-2 flex items-center gap-2">
              <Filter size={20} className="text-indigo-500" /> Guruh:
            </div>
            <select
              value={selectedGroup}
              onChange={handleGroupChange}
              className="w-full sm:w-64 py-2.5 px-4 rounded-xl outline-none font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 cursor-pointer focus:ring-2 focus:ring-indigo-500/50"
            >
              {uniqueGroups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={toggleAll}
            className="text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-4 py-2.5 rounded-xl transition-colors w-full sm:w-auto text-center"
          >
            {selectedIds.length === filteredStudents.length ? "Barchasini bekor qilish" : "Barchasini tanlash"}
          </button>
        </div>
      </div>

      <div id="print-section" className="print-area">
        
        {printMode === 'front' && filteredStudents.map((student) => {
          const isSelected = selectedIds.includes(student._id);
          
          return (
            <div 
              key={student._id} 
              onClick={() => toggleSelection(student._id)}
              className={`badge-card front-side cursor-pointer transition-all duration-200 
                ${isSelected ? 'ring-2 ring-indigo-500 shadow-md' : 'opacity-40 grayscale-[40%] scale-95 no-print'}`}
            >
              <div className="absolute top-1 right-1 no-print bg-white rounded-md z-10 shadow-sm">
                {isSelected ? <CheckSquare className="text-indigo-600" size={18} /> : <Square className="text-slate-400" size={18} />}
              </div>

              <div className="header-section">
                <div className="header-title">G'ulomov Math Group</div>
                <div className="header-sub">Student Access Badge</div>
              </div>

              <div className="qr-container">
                <div className="qr-box">
                  <QRCodeSVG value={`https://t.me/navroz_math_group_bot?start=${student._id}`} size={160} level="M" />
                </div>
              </div>

              <div className="student-details">
                <div className="st-name">{student.name}</div>
                <div className="st-group">📚 {student.group || "Guruhsiz"}</div>
              </div>
            </div>
          )
        })}

        {printMode === 'back' && Array.from({ length: selectedIds.length }).map((_, index) => (
          <div key={index} className="badge-card back-side">
            <img src="/icon-192.png" className="logo-img" alt="Logo" />
            <div className="footer-strip">Mantiq • Bilim • Natija</div>
          </div>
        ))}

        {printMode === 'front' && filteredStudents.length === 0 && (
          <div className="w-full text-center py-16 text-slate-400 no-print flex flex-col items-center gap-3">
            <Users size={48} className="opacity-40" />
            <p className="font-medium text-lg">Bu guruhda o'quvchilar yo'q.</p>
          </div>
        )}
      </div>

      <style>{`
        .print-area {
          display: flex;
          flex-wrap: wrap;
          gap: 15px; 
          justify-content: center;
        }

        .badge-card {
          width: 60mm;   
          height: 95mm;  
          background: white;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          overflow: hidden;
          outline: 1px dashed #cbd5e1;
        }

        @media screen {
          .badge-card {
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
            border-radius: 6px;
          }
        }

        .front-side { justify-content: space-between; }
        
        .header-section {
          width: 100%;
          background-color: #1e3a8a; 
          padding: 5mm 0;
          text-align: center;
        }
        .header-title {
          color: #ffffff;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 1px;
        }
        .header-sub {
          color: #93c5fd;
          font-size: 6.5px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .qr-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
        }
        .qr-box {
          padding: 4px;
          background: #fff;
        }
        .qr-box svg {
          width: 38mm !important;
          height: 38mm !important;
        }
        .student-details {
          width: 100%;
          text-align: center;
          padding-bottom: 5mm;
        }
        .st-name {
          font-size: 14px;
          font-weight: 800;
          color: #1e293b;
          text-transform: uppercase;
          margin-bottom: 2px;
          padding: 0 4px;
          line-height: 1.1;
        }
        .st-group { font-size: 9px; color: #4f46e5; font-weight: 700; }

        .back-side {
          justify-content: center;
          background-color: #f8fafc;
        }
        .logo-img {
          width: 40mm;
          height: 40mm;
          object-fit: contain;
        }
        .footer-strip {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          background: #1e3a8a;
          color: #fff;
          font-size: 7px;
          font-weight: 800;
          text-align: center;
          padding: 4px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* 🖨️ YAKUNIY VA MUQOBIL PRINT SOZLAMALARI */
        @media print {
          @page { 
            size: A4 portrait; 
            margin: 0 !important; /* 🔥 Qog'oz chetidagi brauzer sanasi va URL larni yo'q qiladi */
          }
          
          /* Saytdagi barcha kontentni yashiramiz */
          body * {
            visibility: hidden;
          }
          
          html, body, #root {
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .no-print { display: none !important; }

          #print-section, #print-section * { 
            visibility: visible; 
          }

          /* 🔥 "OPPOQ KO'RPA" - SAYT ORQA FONINI TO'LIQ QOPLAYDI */
          #print-section {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            min-height: 100vh !important;
            background-color: #ffffff !important; /* CRM fonini oppoqqa bo'yaydi */
            z-index: 999999 !important;
            
            display: flex !important;
            flex-wrap: wrap !important;
            justify-content: flex-start !important;
            align-content: flex-start !important;
            gap: 0 !important; 
            
            /* A4 qog'ozni roppa-rosa o'rtasiga tekislash (210 - 180 = 30 / 2 = 15mm left padding) */
            padding-left: 15mm !important;
            padding-top: 10mm !important; 
            margin: 0 !important;
          }

          .badge-card {
            border: none !important; 
            outline: 1px dashed #cbd5e1 !important; 
            border-radius: 0 !important;
            page-break-inside: avoid;
            break-inside: avoid;
            background-color: #ffffff !important; /* Bejik fonini oq qilish */
          }
          
          /* Fon yoqilganda o'z rangini saqlab qoladigan elementlar */
          .header-section { background-color: #1e3a8a !important; }
          .footer-strip { background-color: #1e3a8a !important; }
        }
      `}</style>
    </div>
  );
}