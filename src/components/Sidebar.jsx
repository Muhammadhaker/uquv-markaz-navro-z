import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarCheck, UserCheck } from 'lucide-react';

export default function Sidebar() {
  const role = localStorage.getItem('userRole');

  return (
    <div className="w-64 bg-slate-900 text-slate-300 min-h-screen flex flex-col shadow-2xl z-10 relative">
      <div className="h-20 flex items-center justify-center border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-600/30">
            C
          </div>
          <span className="text-xl font-bold text-white tracking-wide">CRM TIZIMI</span>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2">
        {role === 'super_admin' && (
          <NavLink 
            to="/dashboard" 
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard size={20} />
            <span>Umumiy Statistika</span>
          </NavLink>
        )}

        <NavLink 
          to="/groups" 
          className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-800 hover:text-white'}`}
        >
          <Users size={20} />
          <span>Guruhlar va To'lov</span>
        </NavLink>
        
        <NavLink 
          to="/attendance" 
          className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-800 hover:text-white'}`}
        >
          <CalendarCheck size={20} />
          <span>Davomat</span>
        </NavLink>

        {/* FAQAT SUPER ADMIN KO'RADIGAN YANGI BO'LIM */}
        {role === 'super_admin' && (
          <NavLink 
            to="/admins" 
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <UserCheck size={20} />
            <span>Xodimlar</span>
          </NavLink>
        )}
      </nav>
    </div>
  );
}