import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children }) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Chap tomonda menyu qotib turadi */}
      <Sidebar />
      
      {/* O'ng tomonda Header va Asosiy kontent */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        {/* Asosiy ma'lumotlar chiqadigan oyna */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}