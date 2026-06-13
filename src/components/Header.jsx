import { useNavigate } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('userRole');

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm px-8 py-4 flex justify-between items-center border-b border-gray-200">
      <h2 className="text-xl font-semibold text-gray-700">
        {role === 'super_admin' ? 'Bosh Admin Paneli' : 'O\'qituvchi / Admin Paneli'}
      </h2>
      
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
            {username ? username.charAt(0).toUpperCase() : 'U'}
          </div>
          <span className="text-gray-700 font-medium capitalize">{username}</span>
        </div>
        
        <button 
          onClick={handleLogout}
          className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-500 hover:text-white transition-colors duration-200 text-sm font-semibold"
        >
          Tizimdan chiqish
        </button>
      </div>
    </header>
  );
}