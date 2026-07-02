import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { Printer, ArrowLeft, Loader2, Filter, Users, Image as ImageIcon, CheckSquare, Square, RefreshCw } from "lucide-react";

export default function PrintBadges() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState("Barchasi");
  
  const [printMode, setPrintMode] = useState("front"); 
  const [selectedIds, setSelectedIds] = useState([]);
  
  const [previewMode, setPreviewMode] = useState("front"); 

  const role = localStorage.getItem("userRole");
  let teacherName = localStorage.getItem("userFullName") || localStorage.getItem("username");
  
  if (role === "super_admin" || teacherName === "Navroz") {
    teacherName = "G'ulomov Navro'z";
  } else if (!teacherName) {
    teacherName = "O'qituvchi";
  }

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "x-user-role": role || "",
    "x-user-id": localStorage.getItem("userId") || "",
    "x-parent-id": localStorage.getItem("parentTeacherId") || ""
  });

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch("/api/students", { headers: getAuthHeaders() });
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

  const selectedStudents = filteredStudents.filter(s => selectedIds.includes(s._id));
  
  const printPages = [];
  for (let i = 0; i < selectedStudents.length; i += 8) {
    printPages.push(selectedStudents.slice(i, i + 8));
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  const printContent = (
    <div className="print-only">
      {printPages.map((pageStudents, pageIndex) => (
        <div key={pageIndex} className="print-page">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((slot) => {
            // 🔥 MUKAMMAL KO'ZGU FORMULASI (O'ng va Chap o'rni almashuvi aniq ishlashi uchun)
            const actualIndex = printMode === 'front' 
              ? slot 
              : Math.floor(slot / 4) * 4 + (3 - (slot % 4));
              
            const student = pageStudents[actualIndex];

            if (!student) return <div key={slot} className="print-badge-card empty-slot"></div>;

            return (
              <div key={slot} className="print-badge-card">
                {printMode === 'front' ? (
                  <>
                    <div className="header-section">
                      <div className="header-title">G'ulomov Math Group</div>
                      <div className="header-sub">Student Access Badge</div>
                    </div>
                    <div className="qr-container">
                      <div className="qr-box">
                        <QRCodeSVG value={`https://t.me/navroz_math_group_bot?start=${student._id}`} size={135} level="M" />
                      </div>
                    </div>
                    <div className="student-details">
                      <div className="st-name">{student.name}</div>
                      <div className="st-group">📚 {student.group || "Guruhsiz"}</div>
                      <div className="st-teacher">USTOZ: {teacherName}</div>
                    </div>
                  </>
                ) : (
                  <div className="back-side">
                    <div className="logo-wrapper">
                      {/* 🔥 LOGO YIRIKLASHTIRILDI */}
                      <img src="/icon-192.png" className="logo-img" alt="Logo" />
                    </div>
                    
                    <div className="social-qr-wrapper">
                      <div className="social-qr-item">
                        <div className="qr-border border-sky">
                          {/* 🔥 QR KOD KATTALASHTIRILDI */}
                          <QRCodeSVG value="https://t.me/gulomov_math_group" size={54} level="M" fgColor="#0284c7" />
                        </div>
                        <span className="text-sky mt-1">TELEGRAM</span>
                      </div>
                      <div className="social-qr-item">
                        <div className="qr-border border-pink">
                          {/* 🔥 QR KOD KATTALASHTIRILDI */}
                          <QRCodeSVG value="https://instagram.com/gulomov_math_group" size={54} level="M" fgColor="#db2777" />
                        </div>
                        <span className="text-pink mt-1">INSTAGRAM</span>
                      </div>
                    </div>

                    {/* 🔥 YANGI QIDIRUV YOZUVI (TELEGRAM VA INSTAGRAM NOMLARI) */}
                    <div className="footer-strip">
                      <span className="footer-subtitle">QIDIRUV UCHUN</span>
                      <span className="footer-handle">@GULOMOV_MATH_GROUP</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div className="no-print p-4 md:p-8 max-w-6xl mx-auto pb-24">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6 border-b border-slate-200 pb-6">
          <div>
            <button 
              onClick={() => window.history.back()} 
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 font-bold mb-3 transition-colors w-fit px-3 py-1.5 -ml-3 rounded-lg hover:bg-slate-100"
            >
              <ArrowLeft size={16} /> Orqaga qaytish
            </button>
            <h1 className="text-2xl font-bold text-slate-800">Ekonom Bejiklar (68x100)</h1>
            <p className="text-slate-500 text-sm mt-1">
              Mutlaq simmetrik dizayn. Orqa va oldi yuzasi 100% mos tushadi.
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

        <div className="mb-8 flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 justify-between">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="text-slate-500 font-bold px-2 flex items-center gap-2">
                <Filter size={20} className="text-indigo-500" /> Guruh:
              </div>
              <select
                value={selectedGroup}
                onChange={handleGroupChange}
                className="w-full sm:w-56 py-2.5 px-4 rounded-xl outline-none font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 cursor-pointer focus:ring-2 focus:ring-indigo-500/50"
              >
                {uniqueGroups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto border border-slate-200">
              <button 
                onClick={() => setPreviewMode('front')} 
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${previewMode === 'front' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Oldi tarafi
              </button>
              <button 
                onClick={() => setPreviewMode('back')} 
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${previewMode === 'back' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <RefreshCw size={14} className={previewMode === 'back' ? 'animate-spin-once' : ''} />
                Orqa tarafi
              </button>
            </div>
          </div>

          <button 
            onClick={toggleAll}
            className="text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-4 py-2.5 rounded-xl transition-colors w-full md:w-auto text-center"
          >
            {selectedIds.length === filteredStudents.length ? "Barchasini bekor qilish" : "Barchasini tanlash"}
          </button>
        </div>

        <div className="screen-badges-grid">
          {filteredStudents.map((student) => {
            const isSelected = selectedIds.includes(student._id);
            return (
              <div 
                key={student._id} 
                onClick={() => toggleSelection(student._id)}
                className={`screen-badge-card cursor-pointer transition-all duration-300 
                  ${isSelected ? 'ring-2 ring-indigo-500 shadow-md' : 'opacity-40 grayscale-[40%] scale-95'}
                  ${previewMode === 'back' ? 'rotate-y-180-effect' : ''}
                `}
              >
                <div className="absolute top-1 right-1 bg-white rounded-md z-20 shadow-sm">
                  {isSelected ? <CheckSquare className="text-indigo-600" size={18} /> : <Square className="text-slate-400" size={18} />}
                </div>

                {previewMode === 'front' ? (
                  <>
                    <div className="header-section">
                      <div className="header-title">G'ulomov Math Group</div>
                      <div className="header-sub">Student Access Badge</div>
                    </div>

                    <div className="qr-container">
                      <div className="qr-box">
                        <QRCodeSVG value={`https://t.me/navroz_math_group_bot?start=${student._id}`} size={135} level="M" />
                      </div>
                    </div>

                    <div className="student-details">
                      <div className="st-name">{student.name}</div>
                      <div className="st-group">📚 {student.group || "Guruhsiz"}</div>
                      <div className="st-teacher">USTOZ: {teacherName}</div>
                    </div>
                  </>
                ) : (
                  <div className="back-side w-full h-full relative">
                    <div className="logo-wrapper">
                      <img src="/icon-192.png" className="logo-img" alt="Logo" />
                    </div>
                    
                    <div className="social-qr-wrapper">
                      <div className="social-qr-item">
                        <div className="qr-border border-sky">
                          <QRCodeSVG value="https://t.me/gulomov_math_group" size={54} level="M" fgColor="#0284c7" />
                        </div>
                        <span className="text-sky mt-1">TELEGRAM</span>
                      </div>
                      <div className="social-qr-item">
                        <div className="qr-border border-pink">
                          <QRCodeSVG value="https://instagram.com/gulomov_math_group" size={54} level="M" fgColor="#db2777" />
                        </div>
                        <span className="text-pink mt-1">INSTAGRAM</span>
                      </div>
                    </div>

                    <div className="footer-strip absolute bottom-0 left-0 w-full flex flex-col items-center justify-center">
                      <span className="footer-subtitle">QIDIRUV UCHUN</span>
                      <span className="footer-handle">@GULOMOV_MATH_GROUP</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {filteredStudents.length === 0 && (
            <div className="w-full text-center py-16 text-slate-400 flex flex-col items-center gap-3">
              <Users size={48} className="opacity-40" />
              <p className="font-medium text-lg">Bu guruhda o'quvchilar yo'q.</p>
            </div>
          )}
        </div>
      </div>

      {typeof document !== 'undefined' && createPortal(
        <>
          {printContent}
          <style>{`
            .print-only { display: none; }
            
            .screen-badges-grid {
              display: flex;
              flex-wrap: wrap;
              gap: 15px; 
              justify-content: center;
              perspective: 1000px; 
            }

            .screen-badge-card {
              width: 68mm; 
              height: 100mm;  
              background: #f1f5f9; 
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              align-items: center;
              position: relative;
              overflow: hidden;
              border: 1px solid #94a3b8; 
              box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
              border-radius: 6px;
              justify-content: space-between;
              transform-style: preserve-3d;
            }

            .rotate-y-180-effect {
              animation: flipIn 0.4s ease-out forwards;
            }

            @keyframes flipIn {
              0% { transform: rotateY(90deg); opacity: 0.5; }
              100% { transform: rotateY(0deg); opacity: 1; }
            }

            .animate-spin-once {
              animation: spinOnce 0.4s ease-out;
            }

            @keyframes spinOnce {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(180deg); }
            }

            .header-section {
              width: 100%;
              background-color: #1e3a8a !important; 
              padding: 4mm 0; 
              text-align: center;
            }
            .header-title {
              color: #ffffff !important;
              font-size: 11px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 1px;
            }
            .header-sub {
              color: #93c5fd !important;
              font-size: 7px;
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
              padding: 5px; 
              background: #ffffff !important; 
              border: 1px solid #e2e8f0 !important;
              border-radius: 8px;
            }
            .qr-box svg { width: 38mm !important; height: 38mm !important; }
            
            .student-details { width: 100%; text-align: center; padding-bottom: 4mm; }
            .st-name {
              font-size: 13px;
              font-weight: 800;
              color: #1e293b !important;
              text-transform: uppercase;
              margin-bottom: 2px;
              padding: 0 4px;
              line-height: 1.1;
            }
            .st-group { font-size: 10px; color: #4f46e5 !important; font-weight: 700; }
            .st-teacher { font-size: 8px; color: #64748b !important; font-weight: 800; margin-top: 3px; text-transform: uppercase; }

            /* 🔥 ORQA YUZ O'ZGARISHLARI */
            .back-side {
              display: flex;
              flex-direction: column;
              width: 100%;
              height: 100%;
              justify-content: flex-start;
              background-color: #f1f5f9 !important; 
              padding-top: 4mm; 
              position: relative;
            }
            .logo-wrapper {
              width: 100%;
              display: flex;
              justify-content: center;
              align-items: center;
              margin-top: 2mm;
              margin-bottom: auto; 
            }
            .logo-img {
              width: 58mm !important; /* 🔥 LOGO YIRIKLASHDI (38dan 58ga) */
              height: 58mm !important;
              object-fit: contain;
            }
            .social-qr-wrapper {
              width: 100%;
              display: flex;
              justify-content: space-evenly;
              padding-bottom: 12.5mm; /* Footer uchun joy */
              align-items: flex-end;
            }
            .social-qr-item {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 2px;
            }
            .qr-border {
              padding: 2px;
              border-radius: 4px;
              background: #fff !important;
            }
            .border-sky { border: 1px solid #bae6fd !important; }
            .border-pink { border: 1px solid #fbcfe8 !important; }
            
            .social-qr-item span {
              font-size: 8px;
              font-weight: 900;
              text-transform: uppercase;
            }
            .text-sky { color: #0284c7 !important; }
            .text-pink { color: #db2777 !important; }

            /* 🔥 YANGI DIZAYNDAGI FOOTER */
            .footer-strip {
              background: #1e3a8a !important;
              width: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 4.5px 0;
            }
            .footer-subtitle {
              font-size: 7px;
              color: #93c5fd !important;
              font-weight: 800;
              letter-spacing: 1.5px;
              margin-bottom: 1px;
            }
            .footer-handle {
              font-size: 11.5px;
              color: #ffffff !important;
              font-weight: 900;
              letter-spacing: 1.5px;
            }

            @media print {
              body > *:not(.print-only):not(style):not(script) {
                display: none !important;
              }

              .print-only { 
                display: block !important; 
                width: 100% !important;
              }

              @page { 
                size: A4 landscape; 
                margin: 0 !important; 
              }
              
              html, body {
                background-color: #ffffff !important;
                margin: 0 !important;
                padding: 0 !important;
                height: auto !important; 
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              /* 🔥 MUHIM: MUKAMMAL SIMMETRIYA FORMULASI */
              .print-page {
                width: 297mm !important;
                height: 210mm !important;
                max-height: 210mm !important; 
                overflow: hidden !important;
                background-color: #ffffff !important;
                position: relative !important;
                
                display: flex !important;
                flex-wrap: wrap !important;
                align-content: flex-start !important;
                
                /* 
                 Hisob-kitob (O'ng va Chap bir xil tushishi uchun): 
                 Qog'oz eni: 297mm. Bejiklar (4ta * 68mm) = 272mm.
                 O'rtadagi 3ta gap (3 * 3mm) = 9mm. 
                 Jami content = 281mm. 
                 Qolgan bo'sh joy = 297 - 281 = 16mm. 
                 Demak ikki chetiga roppa-rosa 8.0mm dan qoldirilsa ideal simmetriya bo'ladi!
                */
                padding-left: 8mm !important; 
                padding-top: 3.5mm !important;
                gap: 3mm 3mm !important; 
                
                page-break-after: always !important;
                break-after: page !important;
                box-sizing: border-box !important;
              }

              .print-page:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }

              .print-badge-card {
                width: 68mm !important;
                height: 100mm !important;
                background-color: #f1f5f9 !important; 
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: space-between !important;
                position: relative !important;
                overflow: hidden !important;
                
                border: 1px solid #94a3b8 !important; 
                box-sizing: border-box !important;

                box-shadow: none !important;
                border-radius: 0 !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }

              .empty-slot {
                visibility: hidden !important;
                border: none !important;
                background: transparent !important;
              }
            }
          `}</style>
        </>,
        document.body
      )}
    </>
  );
}