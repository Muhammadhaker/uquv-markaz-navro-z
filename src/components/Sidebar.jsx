import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  const role = localStorage.getItem('userRole');

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen flex flex-col shadow-xl">
      <div className="p-6 text-2xl font-bold border-b border-gray-800 text-center tracking-wider">
        CRM TIZIMI
      </div>
      
      <nav className="flex-1 p-4 space-y-2 mt-4">
        {/* Faqat Bosh Admin uchun */}
        {role === 'super_admin' && (
          <NavLink 
            to="/dashboard" 
            className={({isActive}) => `block p-3 rounded-lg transition-colors duration-200 ${isActive ? 'bg-blue-600 shadow-md' : 'hover:bg-gray-800'}`}
          >
            📊 Umumiy Statistika
          </NavLink>
        )}

        {/* Barcha Adminlar uchun */}
        <NavLink 
          to="/groups" 
          className={({isActive}) => `block p-3 rounded-lg transition-colors duration-200 ${isActive ? 'bg-blue-600 shadow-md' : 'hover:bg-gray-800'}`}
        >
          📚 Guruhlar
        </NavLink>
        
        <NavLink 
          to="/attendance" 
          className={({isActive}) => `block p-3 rounded-lg transition-colors duration-200 ${isActive ? 'bg-blue-600 shadow-md' : 'hover:bg-gray-800'}`}
        >
          ✅ Davomat
        </NavLink>
      </nav>
    </div>
  );
}