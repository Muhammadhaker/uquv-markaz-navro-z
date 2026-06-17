import { useNavigate } from "react-router-dom";
import NotificationBell from "./NotificationBell"; // <-- QO'NG'IROQCHA IMPORT QILINDI

export default function Header() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "Admin";

  return (
    <header className="bg-white shadow-sm px-4 md:px-8 py-4 flex justify-between items-center border-b">
      <h2 className="font-bold text-slate-700 hidden md:block">
        Bosh Admin Paneli
      </h2>
      <div className="flex items-center gap-2 sm:gap-4 ml-auto pl-12 md:pl-0">
        <span className="font-medium text-slate-600 hidden sm:block">
          {username}
        </span>
        
        {/* QO'NG'IROQCHA SHU YERGA QO'SHILDI (Ism va Chiqish tugmasi orasida) */}
        <NotificationBell />

        <button
          onClick={() => {
            localStorage.clear();
            navigate("/login");
          }}
          className="text-red-500 font-bold text-sm bg-red-50 px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-colors hover:bg-red-100"
        >
          Chiqish
        </button>
      </div>
    </header>
  );
}