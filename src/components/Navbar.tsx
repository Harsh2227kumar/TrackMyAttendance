import React from 'react';
import { CurrentUser, UserRole } from '../types/index.ts';
import { Building2, LogOut, Shield, UserCheck, GraduationCap, ChevronDown } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  badge?: number;
}

interface NavbarProps {
  currentUser: CurrentUser;
  onRoleChange: (newRole: UserRole) => void;
  onLogout: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  pendingRequestsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onRoleChange,
  onLogout,
  activeTab,
  onSelectTab,
  pendingRequestsCount = 0,
}) => {
  const [roleMenuOpen, setRoleMenuOpen] = React.useState(false);

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return <Shield className="w-4 h-4 text-amber-600" />;
      case 'ORGANISER':
        return <UserCheck className="w-4 h-4 text-emerald-600" />;
      case 'STUDENT':
        return <GraduationCap className="w-4 h-4 text-blue-600" />;
    }
  };

  const navItems: Record<UserRole, NavItem[]> = {
    STUDENT: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'new_request', label: currentUser.is_universal ? '+ Universal Request' : '+ Update Request' },
      { id: 'my_requests', label: currentUser.is_universal ? 'All Student Requests' : 'My Requests' },
      { id: 'profile', label: currentUser.is_universal ? 'Portal Info' : 'My Profile' },
    ],
    ORGANISER: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'create_event', label: '+ Create Event' },
      { id: 'events_list', label: 'My Events' },
    ],
    ADMIN: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'students', label: 'Students' },
      { id: 'faculty', label: 'Faculty' },
      { id: 'subjects', label: 'Subjects' },
      { id: 'events', label: 'Events' },
      {
        id: 'requests',
        label: 'Requests',
        badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
      },
      { id: 'reports', label: 'Reports & Export' },
      { id: 'audit', label: 'Audit Logs' },
      { id: 'settings', label: 'Settings' },
    ],
  };

  const currentNav = navItems[currentUser.role] || [];

  return (
    <header className="bg-white/95 backdrop-blur-md text-slate-800 border-b border-slate-200/90 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & ERP Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-900 flex items-center justify-center text-white font-bold shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-base tracking-tight text-slate-900">SIT NAGPUR</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-900 font-mono font-medium border border-blue-200/70">
                  ERP ATTENDANCE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">Symbiosis Institute of Technology</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {currentNav.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => onSelectTab(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                    isActive
                      ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200/80 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Profile & Role Switcher */}
          <div className="flex items-center space-x-3">
            {/* Role switch dropdown */}
            <div className="relative">
              <button
                id="role-switcher-btn"
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/60 text-xs font-medium border border-slate-200 transition text-slate-700"
              >
                {getRoleIcon(currentUser.role)}
                <span className="text-slate-900 font-semibold">{currentUser.role}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white border border-slate-200 shadow-lg py-1.5 z-50">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Switch Active Role:
                  </div>
                  <button
                    id="switch-to-admin"
                    onClick={() => {
                      onRoleChange('ADMIN');
                      setRoleMenuOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center space-x-2 hover:bg-slate-50 ${
                      currentUser.role === 'ADMIN' ? 'text-blue-900 font-bold bg-blue-50/50' : 'text-slate-700'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-600" />
                    <span>ADMIN (Complete ERP)</span>
                  </button>
                  <button
                    id="switch-to-organiser"
                    onClick={() => {
                      onRoleChange('ORGANISER');
                      setRoleMenuOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center space-x-2 hover:bg-slate-50 ${
                      currentUser.role === 'ORGANISER' ? 'text-blue-900 font-bold bg-blue-50/50' : 'text-slate-700'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ORGANISER (Events)</span>
                  </button>
                  <button
                    id="switch-to-student"
                    onClick={() => {
                      onRoleChange('STUDENT');
                      setRoleMenuOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center space-x-2 hover:bg-slate-50 ${
                      currentUser.role === 'STUDENT' ? 'text-blue-900 font-bold bg-blue-50/50' : 'text-slate-700'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                    <span>STUDENT (Requests)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Current User Label */}
            <div className="hidden lg:block text-right">
              <div className="text-xs font-semibold text-slate-900">{currentUser.name}</div>
              <div className="text-[11px] text-slate-500">
                {currentUser.is_universal
                  ? 'Universal Student Delegate'
                  : currentUser.prn
                  ? `PRN: ${currentUser.prn}`
                  : currentUser.username}
              </div>
            </div>

            {/* Logout button */}
            <button
              id="logout-btn"
              onClick={onLogout}
              title="Sign Out"
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex overflow-x-auto py-2 space-x-1 border-t border-slate-100">
          {currentNav.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`px-3 py-1 text-xs whitespace-nowrap rounded-lg font-medium ${
                activeTab === item.id
                  ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200/80'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
              {item.badge !== undefined && ` (${item.badge})`}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
