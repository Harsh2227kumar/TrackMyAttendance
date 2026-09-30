import React, { useState, useEffect } from 'react';
import { CurrentUser, UserRole, Student } from '../types/index.ts';
import { getStudents, authenticateUser } from '../services/dbService.ts';
import { Building2, Shield, UserCheck, GraduationCap, Lock, ArrowRight, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: CurrentUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('STUDENT');
  const [studentLoginMode, setStudentLoginMode] = useState<'universal' | 'prn'>('universal');
  const [identifier, setIdentifier] = useState('student.universal');
  const [password, setPassword] = useState('Password123!');
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dbLoading, setDbLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      setDbLoading(true);
      try {
        const students = await getStudents();
        setStudentsList(students);
      } catch (e) {
        console.error('Error fetching students count for login:', e);
      } finally {
        setDbLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    if (role === 'ADMIN') {
      setIdentifier('admin.academic');
      setPassword('Password123!');
    } else if (role === 'ORGANISER') {
      setIdentifier('org.vp');
      setPassword('Password123!');
    } else {
      if (studentLoginMode === 'universal') {
        setIdentifier('student.universal');
        setPassword('Password123!');
      } else if (studentsList.length > 0) {
        const first = studentsList[0];
        const firstName = first.name.split(/\s+/)[0].toLowerCase();
        const last3 = first.prn.slice(-3);
        setIdentifier(first.prn);
        setPassword(`${firstName}.${last3}`);
      } else {
        setIdentifier('');
        setPassword('');
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const result = await authenticateUser(selectedRole, identifier, password);
      if (result.success && result.user) {
        onLogin(result.user);
      } else {
        setErrorMessage(result.error || 'Invalid credentials. Please verify your username and password.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-slate-800">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* SIT Logo Emblem */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-900 text-white shadow-sm mb-3">
          <Building2 className="w-7 h-7" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          SYMBIOSIS INSTITUTE OF TECHNOLOGY
        </h1>
        <p className="text-xs font-semibold tracking-wider text-blue-700 uppercase mt-0.5">
          NAGPUR CAMPUS • ERP ATTENDANCE PORTAL
        </p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Academic master records, event attendance logging, student correction requests & audit control.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white border border-slate-200/90 shadow-xs rounded-2xl p-6 sm:p-8 space-y-5">
          {/* Role selector tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Select Portal Access Role
              </label>
              <span className="text-[11px] text-slate-400">
                {studentsList.length > 0 ? (
                  <span className="inline-flex items-center text-emerald-600 font-medium">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> {studentsList.length} Students Enrolled
                  </span>
                ) : (
                  <span className="text-amber-600 font-medium">Database Ready</span>
                )}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/60">
              <button
                type="button"
                id="role-select-admin"
                onClick={() => handleRoleSelect('ADMIN')}
                className={`py-2 px-1 text-xs font-semibold rounded-lg flex flex-col items-center justify-center space-y-1 transition ${
                  selectedRole === 'ADMIN'
                    ? 'bg-white text-blue-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Shield className="w-4 h-4 text-amber-600" />
                <span>Admin</span>
              </button>

              <button
                type="button"
                id="role-select-organiser"
                onClick={() => handleRoleSelect('ORGANISER')}
                className={`py-2 px-1 text-xs font-semibold rounded-lg flex flex-col items-center justify-center space-y-1 transition ${
                  selectedRole === 'ORGANISER'
                    ? 'bg-white text-blue-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Organiser</span>
              </button>

              <button
                type="button"
                id="role-select-student"
                onClick={() => handleRoleSelect('STUDENT')}
                className={`py-2 px-1 text-xs font-semibold rounded-lg flex flex-col items-center justify-center space-y-1 transition ${
                  selectedRole === 'STUDENT'
                    ? 'bg-white text-blue-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>Student</span>
              </button>
            </div>
          </div>

          {/* Student Sub-Mode Toggle (Universal vs PRN) */}
          {selectedRole === 'STUDENT' && (
            <div className="p-3 bg-blue-50/70 border border-blue-200/90 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                  Student Portal Access Mode
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-semibold border border-blue-200">
                  Universal Request Mode
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-white rounded-lg border border-blue-200">
                <button
                  type="button"
                  id="mode-universal-student-btn"
                  onClick={() => {
                    setStudentLoginMode('universal');
                    setIdentifier('student.universal');
                    setPassword('Password123!');
                    setErrorMessage(null);
                  }}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-md transition text-center cursor-pointer ${
                    studentLoginMode === 'universal'
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'text-blue-900 hover:bg-blue-50'
                  }`}
                >
                  Universal Student Login
                </button>
                <button
                  type="button"
                  id="mode-prn-student-btn"
                  onClick={() => {
                    setStudentLoginMode('prn');
                    if (studentsList.length > 0) {
                      const first = studentsList[0];
                      const firstName = first.name.split(/\s+/)[0].toLowerCase();
                      const last3 = first.prn.slice(-3);
                      setIdentifier(first.prn);
                      setPassword(`${firstName}.${last3}`);
                    } else {
                      setIdentifier('');
                      setPassword('');
                    }
                    setErrorMessage(null);
                  }}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-md transition text-center cursor-pointer ${
                    studentLoginMode === 'prn'
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'text-blue-900 hover:bg-blue-50'
                  }`}
                >
                  Specific Student (PRN)
                </button>
              </div>
              <p className="text-[11px] text-blue-800 leading-tight">
                {studentLoginMode === 'universal'
                  ? 'Universal Student Mode allows creating and updating attendance requests on behalf of ANY student using student name or PRN search autocomplete.'
                  : 'Individual student login using assigned Permanent Registration Number (PRN).'}
              </p>
            </div>
          )}

          {/* Error Message Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200/90 rounded-lg text-rose-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Authentication Notice</span>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Notice when student selected but students collection is empty */}
          {selectedRole === 'STUDENT' && studentLoginMode === 'prn' && studentsList.length === 0 && !dbLoading && (
            <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-lg text-amber-900 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Awaiting Student Master Upload</span>
                <p className="mt-0.5 text-amber-800">
                  No individual student PRNs registered yet. You can sign in using Universal Student Login, or Academic Admin can upload the Student Master list.
                </p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {selectedRole === 'STUDENT' && studentLoginMode === 'prn'
                  ? 'Student Permanent Registration No. (PRN)'
                  : 'Username'}
              </label>
              <input
                type="text"
                id="login-identifier-input"
                required
                placeholder={
                  selectedRole === 'STUDENT'
                    ? studentLoginMode === 'universal'
                      ? 'student.universal'
                      : 'Enter your PRN'
                    : selectedRole === 'ORGANISER'
                    ? 'org.vp'
                    : 'admin.academic'
                }
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
              />
              <div className="mt-1 text-[11px] text-slate-500">
                {selectedRole === 'ADMIN' && (
                  <span>Default username: <code className="font-mono text-slate-700 font-semibold">admin.academic</code></span>
                )}
                {selectedRole === 'ORGANISER' && (
                  <span>Default username: <code className="font-mono text-slate-700 font-semibold">org.vp</code></span>
                )}
                {selectedRole === 'STUDENT' && studentLoginMode === 'universal' && (
                  <span>Universal login username: <code className="font-mono text-slate-700 font-semibold">student.universal</code></span>
                )}
                {selectedRole === 'STUDENT' && studentLoginMode === 'prn' && (
                  <span>Enter your assigned PRN number</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  id="login-password-input"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    selectedRole === 'STUDENT' && studentLoginMode === 'prn'
                      ? 'Format: {firstname}.{prn last 3 digits}'
                      : 'Password'
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                />
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {selectedRole === 'STUDENT' && studentLoginMode === 'prn' ? (
                  <span>Formula: <code className="font-mono text-slate-700 font-semibold">{'{firstname}.{last 3 digits of PRN}'}</code></span>
                ) : (
                  <span>Default password: <code className="font-mono text-slate-700 font-semibold">Password123!</code></span>
                )}
              </div>
            </div>

            <button
              type="submit"
              id="login-submit-btn"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <span>Authenticating with Database...</span>
              ) : (
                <>
                  <span>
                    {selectedRole === 'STUDENT' && studentLoginMode === 'universal'
                      ? 'Sign In as Universal Student Portal'
                      : 'Sign In to ERP Portal'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Credential Helpers */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2.5">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-blue-700" />
                Credential Quick-Fill:
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                id="quick-fill-universal-student-btn"
                onClick={() => {
                  setSelectedRole('STUDENT');
                  setStudentLoginMode('universal');
                  setIdentifier('student.universal');
                  setPassword('Password123!');
                  setErrorMessage(null);
                }}
                className="text-left px-2.5 py-1.5 rounded-lg bg-blue-50/80 hover:bg-blue-100/70 border border-blue-200 text-xs transition"
              >
                <div className="font-medium text-blue-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-blue-700" />
                    <span>Universal Student</span>
                  </span>
                  <span className="text-[9px] px-1 py-0.2 bg-blue-200/80 text-blue-900 rounded font-bold uppercase">
                    Any Student
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  student.universal • Password123!
                </div>
              </button>

              <button
                type="button"
                id="quick-fill-admin-btn"
                onClick={() => {
                  setSelectedRole('ADMIN');
                  setIdentifier('admin.academic');
                  setPassword('Password123!');
                  setErrorMessage(null);
                }}
                className="text-left px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs transition"
              >
                <div className="font-medium text-slate-800 flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-amber-600" />
                  <span>Admin Credentials</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  admin.academic • Password123!
                </div>
              </button>

              <button
                type="button"
                id="quick-fill-org-btn"
                onClick={() => {
                  setSelectedRole('ORGANISER');
                  setIdentifier('org.vp');
                  setPassword('Password123!');
                  setErrorMessage(null);
                }}
                className="text-left px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs transition"
              >
                <div className="font-medium text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-3 h-3 text-emerald-600" />
                  <span>Organiser Credentials</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  org.vp • Password123!
                </div>
              </button>

              {studentsList.length > 0 && (
                <button
                  type="button"
                  id="quick-fill-student-btn"
                  onClick={() => {
                    setSelectedRole('STUDENT');
                    setStudentLoginMode('prn');
                    const first = studentsList[0];
                    const firstName = first.name.split(/\s+/)[0].toLowerCase();
                    const last3 = first.prn.slice(-3);
                    setIdentifier(first.prn);
                    setPassword(`${firstName}.${last3}`);
                    setErrorMessage(null);
                  }}
                  className="text-left px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs transition"
                >
                  <div className="font-medium text-slate-800 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-blue-700" />
                      <span className="truncate max-w-[120px]">{studentsList[0].name}</span>
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">PRN</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {studentsList[0].prn} • {studentsList[0].name.split(/\s+/)[0].toLowerCase()}.{studentsList[0].prn.slice(-3)}
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-[11px] text-center text-slate-400 mt-4">
          Symbiosis Institute of Technology, Nagpur • Academic Attendance Security
        </p>
      </div>
    </div>
  );
};
