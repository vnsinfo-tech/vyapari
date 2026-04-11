import { useSelector } from 'react-redux';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function DashboardLayout() {
  const { sidebarOpen } = useSelector(s => s.ui);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-60' : 'lg:ml-16'}`}>
        <Navbar />
        <main className="p-3 md:p-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
