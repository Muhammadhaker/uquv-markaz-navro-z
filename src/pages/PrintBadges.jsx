import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { Printer, ArrowLeft, Loader2, Filter, Users, Image as ImageIcon, CheckSquare, Square, RefreshCw, Maximize, Search, X } from "lucide-react";

export default function PrintBadges() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedGroup, setSelectedGroup] = useState("Barchasi");
  const [searchQuery, setSearchQuery] = useState(""); 
  
  const [printMode, setPrintMode] = useState("front"); 
  const [selectedIds, setSelectedIds] = useState([]); // 🔥 XOTIRA: Hamma guruhdan tanlanganlar shu yerda turadi
  const [previewMode, setPreviewMode] = useState("front"); 

  const [badgeWidth, setBadgeWidth] = useState(68);
  const [badgeHeight, setBadgeHeight] = useState(100);

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

  // Ekranda ko'rinadigan o'quvchilar (Filter va qidiruv ishlagan holat)
  const filteredStudents = students.filter((s) => {
    const sGroups = s.group ? s.group.split(",").map((g) => g.trim()) : [];
    const matchesGroup = selectedGroup === "Barchasi" || sGroups.includes(selectedGroup);
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  const handleGroupChange = (e) => setSelectedGroup(e.target.value);
  const handleSearchChange = (e) => setSearchQuery(e.target.value);

  const toggleSelection = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const allVisibleSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedIds.includes(s._id));

  const toggleAll = () => {
    if (allVisibleSelected) {
      const visibleIds = filteredStudents.map(s => s._id);
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      const visibleIds = filteredStudents.map(s => s._id);
      setSelectedIds(prev => [...new Set([...prev, ...visibleIds])]);
    }
  };

  const handlePrint = (mode) => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintMode("front"), 500);
    }, 300);
  };

  const handleResetSize = () => {
    setBadgeWidth(68);
    setBadgeHeight(100);
  };

  // 🔥 ASOSIY TO'G'RILANGAN JOY: Pechatga Endi ekrandagi emas, BAZADAGI barcha tanlanganlar ketadi
  const selectedStudentsForPrint = students.filter(s => selectedIds.includes(s._id));
  
  // =========================================================================
  // 📐 MATEMATIKA VA MAX O'LCHAMLAR
  // =========================================================================
  const badgeW = Number(badgeWidth) > 30 ? Number(badgeWidth) : 68;
  const badgeH = Number(badgeHeight) > 40 ? Number(badgeHeight) : 100;
  
  const scale = badgeW / 68; 
  const qrFrontMm = 48 * scale; 
  const qrSocialMm = 18 * scale; 
  const logoMm = 62 * scale;     

  const A4_W = 297; 
  const A4_H = 210; 
  const GAP = 3;    

  let cols = Math.floor((A4_W + GAP) / (badgeW + GAP)); 
  if (cols < 1) cols = 1;
  
  let rows = Math.floor((A4_H + GAP) / (badgeH + GAP));
  if (rows < 1) rows = 1;

  const badgesPerPage = cols * rows;

  const paddingLeft = Math.max(0, (A4_W - (cols * badgeW + (cols - 1) * GAP)) / 2);
  const paddingTop = Math.max(0, (A4_H - (rows * badgeH + (rows - 1) * GAP)) / 2);

  // Pechat uchun varaqlar yaratish
  const printPages = [];
  for (let i = 0; i < selectedStudentsForPrint.length; i += badgesPerPage) {
    printPages.push(selectedStudentsForPrint.slice(i, i + badgesPerPage));
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
        <div key={pageIndex} className="print-page" style={{ paddingLeft: `${paddingLeft}mm`, paddingTop: `${paddingTop}mm`, gap: `${GAP}mm` }}>
          {[...Array(badgesPerPage).keys()].map((slot) => {
            
            const actualIndex = printMode === 'front' 
              ? slot 
              : Math.floor(slot / cols) * cols + ((cols - 1) - (slot % cols));
              
            const student = pageStudents[actualIndex];

            if (!student) return <div key={slot} className="print-badge-card empty-slot"></div>;

            return (
              <div key={slot} className="print-badge-card" style={{ width: `${badgeW}mm`, height: `${badgeH}mm` }}>
                {printMode === 'front' ? (
                  <div className="front-side">
                    <div className="header-section">
                      <div className="header-title">G'ulomov Math Group</div>
                      <div className="header-sub">Student Access Badge</div>
                    </div>
                    
                    <div className="qr-container">
                      <div className="qr-box">
                        <QRCodeSVG value={`https://t.me/navroz_math_group_bot?start=${student._id}`} style={{ width: `${qrFrontMm}mm`, height: `${qrFrontMm}mm` }} level="M" />
                      </div>
                    </div>

                    <div className="student-details">
                      <div className="st-name">{student.name}</div>
                      <div className="st-group">📚 {student.group || "Guruhsiz"}</div>
                      <div className="st-teacher">USTOZ: {teacherName}</div>
                    </div>
                  </div>
                ) : (
                  <div className="back-side">
                    <div className="logo-wrapper">
                      <img src="/icon-192.png" className="logo-img" alt="Logo" style={{ width: `${logoMm}mm`, height: `${logoMm}mm` }} />
                    </div>
                    
                    <div className="social-qr-wrapper">
                      <div className="social-qr-item">
                        <div className="qr-border border-sky">
                          <QRCodeSVG value="https://t.me/gulomov_math_group" style={{ width: `${qrSocialMm}mm`, height: `${qrSocialMm}mm` }} level="M" fgColor="#0284c7" />
                        </div>
                        <span className="platform-name text-sky">TELEGRAM</span>
                        <span className="handle-name text-sky">@GULOMOV_MATH_GROUP</span>
                      </div>
                      <div className="social-qr-item">
                        <div className="qr-border border-pink">
                          <QRCodeSVG value="https://www.instagram.com/gulomov_math_group/?hl=en#" style={{ width: `${qrSocialMm}mm`, height: `${qrSocialMm}mm` }} level="M" fgColor="#db2777" />
                        </div>
                        <span className="platform-name text-pink">INSTAGRAM</span>
                        <span className="handle-name text-pink">@GULOMOV_MATHGROUP</span>
                      </div>
                    </div>

                    <div className="footer-strip">
                      <span className="footer-handle">MANTIQ • BILIM • NATIJA</span>
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
            <h1 className="text-2xl font-bold text-slate-800">Dinamik Bejiklar</h1>
            <p className="text-slate-500 text-sm mt-1">
              O'lchamga qarab A4 qog'oz varag'iga avtomat moslashadi.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button 
              onClick={() => handlePrint('front')}
              disabled={selectedIds.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {/* 🔥 TUGMADA HAM TANLANGANLARNING JAMI SONI KO'RINADI */}
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

        <div className="mb-8 flex flex-col xl:flex-row items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 justify-between">
          <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              
              <div className="flex items-center gap-2 bg-slate-50 border border-indigo-200 px-3 py-2.5 rounded-xl w-full sm:w-60 focus-within:ring-2 focus-within:ring-indigo-500/30 transition-all relative">
                <Search size={18} className="text-indigo-500 flex-shrink-0" />
                <input 
                  type="text" 
                  placeholder="Ism bo'yicha qidiruv..." 
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="bg-transparent outline-none w-full text-slate-700 font-semibold placeholder:text-slate-400 placeholder:font-medium pr-6"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors"
                    title="Qidiruvni tozalash"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <select
                value={selectedGroup}
                onChange={handleGroupChange}
                className="w-full sm:w-48 py-2.5 px-4 rounded-xl outline-none font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 cursor-pointer focus:ring-2 focus:ring-indigo-500/50"
              >
                {uniqueGroups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
              <Maximize size={18} className="text-slate-400 hidden sm:block" />
              <div className="flex items-center gap-1">
                <input 
                  type="number" 
                  value={badgeWidth} 
                  onChange={(e) => setBadgeWidth(e.target.value)}
                  className="w-14 sm:w-16 py-1 text-center font-bold text-slate-700 rounded-md border border-slate-200 outline-none focus:border-indigo-500"
                  title="Eni (mm)"
                />
                <span className="text-slate-400 font-bold text-xs">x</span>
                <input 
                  type="number" 
                  value={badgeHeight} 
                  onChange={(e) => setBadgeHeight(e.target.value)}
                  className="w-14 sm:w-16 py-1 text-center font-bold text-slate-700 rounded-md border border-slate-200 outline-none focus:border-indigo-500"
                  title="Bo'yi (mm)"
                />
              </div>
              <span className="text-xs font-bold text-slate-400 mr-2">mm</span>
              
              {(Number(badgeWidth) !== 68 || Number(badgeHeight) !== 100) && (
                <button 
                  onClick={handleResetSize}
                  className="text-[10px] font-black uppercase tracking-wide bg-rose-100 text-rose-600 px-2 py-1.5 rounded hover:bg-rose-200 transition-colors"
                >
                  Asl
                </button>
              )}
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
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
            className="text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-4 py-2.5 rounded-xl transition-colors w-full xl:w-auto text-center"
          >
            {allVisibleSelected ? "Ekranda ko'ringanlarni bekor qilish" : "Ekranda ko'ringanlarni tanlash"}
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
                style={{ width: `${badgeW}mm`, height: `${badgeH}mm` }}
              >
                <div className="absolute top-1 right-1 bg-white rounded-md z-20 shadow-sm">
                  {isSelected ? <CheckSquare className="text-indigo-600" size={18} /> : <Square className="text-slate-400" size={18} />}
                </div>

                {previewMode === 'front' ? (
                  <div className="front-side w-full h-full">
                    <div className="header-section">
                      <div className="header-title">G'ulomov Math Group</div>
                      <div className="header-sub">Student Access Badge</div>
                    </div>

                    <div className="qr-container">
                      <div className="qr-box">
                        <QRCodeSVG value={`https://t.me/navroz_math_group_bot?start=${student._id}`} style={{ width: `${qrFrontMm}mm`, height: `${qrFrontMm}mm` }} level="M" />
                      </div>
                    </div>

                    <div className="student-details">
                      <div className="st-name">{student.name}</div>
                      <div className="st-group">📚 {student.group || "Guruhsiz"}</div>
                      <div className="st-teacher">USTOZ: {teacherName}</div>
                    </div>
                  </div>
                ) : (
                  <div className="back-side w-full h-full relative">
                    <div className="logo-wrapper">
                      <img src="/icon-192.png" className="logo-img" alt="Logo" style={{ width: `${logoMm}mm`, height: `${logoMm}mm` }} />
                    </div>
                    
                    <div className="social-qr-wrapper">
                      <div className="social-qr-item">
                        <div className="qr-border border-sky">
                          <QRCodeSVG value="https://t.me/gulomov_math_group" style={{ width: `${qrSocialMm}mm`, height: `${qrSocialMm}mm` }} level="M" fgColor="#0284c7" />
                        </div>
                        <span className="platform-name text-sky">TELEGRAM</span>
                        <span className="handle-name text-sky">@GULOMOV_MATH_GROUP</span>
                      </div>
                      <div className="social-qr-item">
                        <div className="qr-border border-pink">
                          <QRCodeSVG value="https://www.instagram.com/gulomov_math_group/?hl=en#" style={{ width: `${qrSocialMm}mm`, height: `${qrSocialMm}mm` }} level="M" fgColor="#db2777" />
                        </div>
                        <span className="platform-name text-pink">INSTAGRAM</span>
                        <span className="handle-name text-pink">@GULOMOV_MATHGROUP</span>
                      </div>
                    </div>

                    <div className="footer-strip absolute bottom-0 left-0 w-full flex flex-col items-center justify-center">
                      <span className="footer-handle">MANTIQ • BILIM • NATIJA</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {filteredStudents.length === 0 && (
            <div className="w-full text-center py-16 text-slate-400 flex flex-col items-center gap-3">
              <Users size={48} className="opacity-40" />
              <p className="font-medium text-lg">Bu qidiruvga mos o'quvchilar yo'q.</p>
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

            .front-side {
              display: flex;
              flex-direction: column;
              width: 100%;
              height: 100%;
              justify-content: space-between;
              background-color: #f1f5f9 !important; 
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
              padding: 2mm 0; 
            }
            .qr-box { 
              padding: 5px; 
              background: #ffffff !important; 
              border: 1px solid #e2e8f0 !important;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
            }
            
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
              margin-top: 4mm;
              margin-bottom: auto; 
            }
            .logo-img {
              object-fit: contain;
            }

            .social-qr-wrapper {
              width: 100%;
              display: flex;
              justify-content: space-evenly;
              padding-bottom: 11mm; 
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
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .border-sky { border: 1px solid #bae6fd !important; }
            .border-pink { border: 1px solid #fbcfe8 !important; }
            
            .text-sky { color: #0284c7 !important; }
            .text-pink { color: #db2777 !important; }

            .platform-name {
              font-size: 8.5px;
              font-weight: 900;
              text-transform: uppercase;
              margin-top: 3px;
            }

            .handle-name {
              font-size: 6.5px;
              font-weight: 800;
              letter-spacing: 0.2px;
            }

            .footer-strip {
              background: #1e3a8a !important;
              width: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 6px 0;
              position: absolute;
              bottom: 0;
            }
            
            .footer-handle {
              font-size: 8px;
              color: #ffffff !important;
              font-weight: 800;
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
                box-sizing: border-box !important;
                page-break-after: always !important;
                break-after: page !important;
              }

              .print-page:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }

              .print-badge-card {
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