import React, { useState, useEffect } from 'react';
import { CurrentUser, UserRole } from './types/index.ts';
import { Navbar } from './components/Navbar.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { StudentPortal } from './components/StudentPortal.tsx';
import { OrganiserPortal } from './components/OrganiserPortal.tsx';
import { AdminPortal } from './components/AdminPortal.tsx';
import {
  initializeLoginDatabaseIfNeeded,
  getAttendanceRequests,
  getStudents,
} from './services/dbService.ts';

const CURRENT_USER_KEY = 'sit_erp_current_user';

export default function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    const saved = localStorage.getItem(CURRENT_USER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  // Initialize login database without dummy data
  useEffect(() => {
    const initApp = async () => {
      try {
        await initializeLoginDatabaseIfNeeded();
        const reqs = await getAttendanceRequests();
        const pending = reqs.filter((r) => r.status === 'pending');
        setPendingRequestsCount(pending.length);
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setInitialLoading(false);
      }
    };
    initApp();
  }, []);

  // Update localStorage when user changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  }, [currentUser]);

  const handleLogin = (user: CurrentUser) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const handleRoleChange = async (newRole: UserRole) => {
    if (!currentUser) return;
    if (newRole === currentUser.role) return;

    if (newRole === 'STUDENT') {
      const students = await getStudents();
      if (students.length > 0) {
        const first = students[0];
        setCurrentUser({
          id: first.id,
          name: first.name,
          username: first.prn,
          role: 'STUDENT',
          prn: first.prn,
          semester: first.semester,
          section: first.section,
        });
      } else {
        alert('No student records uploaded yet. Please log in as Admin to upload the student list.');
        return;
      }
    } else if (newRole === 'ORGANISER') {
      setCurrentUser({
        id: 'org-vp',
        name: 'Prof. V. P. (Event Organiser)',
        username: 'org.vp',
        role: 'ORGANISER',
      });
    } else {
      setCurrentUser({
        id: 'admin-academic',
        name: 'Academic Cell Administrator',
        username: 'admin.academic',
        role: 'ADMIN',
      });
    }
    setActiveTab('dashboard');
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800 space-y-3">
        <div className="w-10 h-10 border-3 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold tracking-wider text-slate-600 uppercase">
          Initializing SIT Nagpur ERP Portal...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Professional ERP Navigation */}
      <Navbar
        currentUser={currentUser}
        onRoleChange={handleRoleChange}
        onLogout={handleLogout}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingRequestsCount={pendingRequestsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentUser.role === 'STUDENT' && (
          <StudentPortal currentUser={currentUser} activeTab={activeTab} onSelectTab={setActiveTab} />
        )}

        {currentUser.role === 'ORGANISER' && (
          <OrganiserPortal currentUser={currentUser} activeTab={activeTab} onSelectTab={setActiveTab} />
        )}

        {currentUser.role === 'ADMIN' && (
          <AdminPortal currentUser={currentUser} activeTab={activeTab} onSelectTab={setActiveTab} />
        )}
      </main>

      {/* Institutional ERP Footer */}
      <footer className="bg-white text-slate-500 text-xs py-4 border-t border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-800">Symbiosis Institute of Technology (SIT), Nagpur</span>
            <span className="text-slate-300">•</span>
            <span>ERP Attendance & Event Management System</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Firestore Database • Role-Based Access Control
          </div>
        </div>
      </footer>
    </div>
  );
}
