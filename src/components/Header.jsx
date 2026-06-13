import { useNavigate } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();
  const username = localStorage.getItem('username');

  return (
    <header className="bg-white shadow-sm px-4 md:px-8 py-4 flex justify-between items-center border-b">
      <h2 className="font-bold text-slate-700 hidden md:block">Bosh Admin Paneli</h2>
      <div className="flex items-center gap-4 ml-auto">
        <span className="font-medium text-slate-600">{username}</span>
        <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="text-red-500 font-bold text-sm bg-red-50 px-4 py-2 rounded-lg">
          Chiqish
        </button>
      </div>
    </header>
  );
}