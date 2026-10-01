import React, { useState, useEffect, useMemo } from 'react';
import { CurrentUser, Faculty, Subject, AttendanceRequest, AttendanceRequestItem, Student } from '../types/index.ts';
import {
  getFacultyList,
  getSubjectsList,
  getAttendanceRequests,
  createAttendanceRequest,
  updateAttendanceRequest,
  deleteAttendanceRequest,
  getStudents,
} from '../services/dbService.ts';
import { formatDateDMY } from '../utils/dateUtils.ts';
import { SearchableSubjectCombobox, SearchableFacultyCombobox } from './SearchableCombobox.tsx';
import {
  GraduationCap,
  CalendarPlus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Trash2,
  Send,
  BookOpen,
  UserCheck,
  User,
  ArrowRight,
  Search,
  Users,
  Check,
  Sparkles,
  Edit2,
  Building2,
} from 'lucide-react';

interface StudentPortalProps {
  currentUser: CurrentUser;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ currentUser, activeTab, onSelectTab }) => {
  const isUniversal = Boolean(
    currentUser.is_universal ||
    currentUser.id === 'student-universal' ||
    currentUser.username === 'student.universal' ||
    currentUser.prn === 'UNIVERSAL'
  );

  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [myRequests, setMyRequests] = useState<AttendanceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentAttendancePct, setCurrentAttendancePct] = useState<string>('');

  // Universal Student autocomplete state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [requestsSearchTerm, setRequestsSearchTerm] = useState<string>('');

  // Request editing state (for modifying existing pending requests)
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);

  // Form State for multi-item attendance update request
  const [requestItems, setRequestItems] = useState<AttendanceRequestItem[]>([
    {
      id: 'item-1',
      date: new Date().toISOString().split('T')[0],
      start_time: '10:00',
      end_time: '11:00',
      event_title: '',
      subject_id: '',
      subject_name: '',
      faculty_id: '',
      faculty_name: '',
      reason: '',
    },
  ]);

  // Load master data from DB
  const loadData = async () => {
    setLoading(true);
    try {
      const [fac, sub, reqs, students] = await Promise.all([
        getFacultyList(),
        getSubjectsList(),
        getAttendanceRequests(currentUser.id),
        getStudents(),
      ]);
      setFacultyList(fac.filter((f) => f.status === 'active'));
      setSubjectsList(sub.filter((s) => s.status === 'active'));
      setMyRequests(reqs);
      setStudentsList(students.filter((s) => s.status === 'active' || !s.status));
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to load data from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser.id]);

  // Filter students for autocomplete search by name or PRN
  const filteredStudents = useMemo(() => {
    const term = studentSearchTerm.trim().toLowerCase();
    if (!term) return studentsList;
    return studentsList.filter((s) => {
      const nameMatch = (s.name || '').toLowerCase().includes(term);
      const prnMatch = (s.prn || '').toLowerCase().includes(term);
      const semSecMatch = `sem ${s.semester} ${s.section}`.toLowerCase().includes(term);
      return nameMatch || prnMatch || semSecMatch;
    });
  }, [studentsList, studentSearchTerm]);

  const handleAddItem = () => {
    setRequestItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        start_time: '11:00',
        end_time: '12:00',
        event_title: '',
        subject_id: '',
        subject_name: '',
        faculty_id: '',
        faculty_name: '',
        reason: '',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (requestItems.length === 1) {
      alert('Request must contain at least one attendance entry.');
      return;
    }
    setRequestItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof AttendanceRequestItem, value: any) => {
    setRequestItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === 'subject_id') {
        const selectedSub = subjectsList.find((s) => s.id === value);
        item.subject_id = value;
        item.subject_name = selectedSub ? `${selectedSub.code}: ${selectedSub.name}` : '';
      } else if (field === 'faculty_id') {
        const selectedFac = facultyList.find((f) => f.id === value);
        item.faculty_id = value;
        item.faculty_name = selectedFac ? selectedFac.name : '';
      } else {
        (item as any)[field] = value;
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleItemSubjectSelect = (index: number, sub: Subject | null) => {
    setRequestItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        subject_id: sub ? sub.id : '',
        subject_name: sub ? `${sub.code}: ${sub.name}` : '',
      };
      return updated;
    });
  };

  const handleItemFacultySelect = (index: number, fac: Faculty | null) => {
    setRequestItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        faculty_id: fac ? fac.id : '',
        faculty_name: fac ? fac.name : '',
      };
      return updated;
    });
  };

  const handleStartEditRequest = (req: AttendanceRequest) => {
    setEditingRequestId(req.id);
    if (isUniversal) {
      const matched = studentsList.find((s) => s.prn === req.student_prn);
      if (matched) {
        setSelectedStudent(matched);
        setStudentSearchTerm(`${matched.name} (${matched.prn})`);
      } else {
        setSelectedStudent({
          id: req.student_id,
          prn: req.student_prn,
          name: req.student_name,
          semester: req.semester,
          section: req.section,
          username: '',
          status: 'active',
          created_at: '',
        });
        setStudentSearchTerm(`${req.student_name} (${req.student_prn})`);
      }
    }
    setCurrentAttendancePct(
      req.current_attendance_percentage !== null && req.current_attendance_percentage !== undefined
        ? String(req.current_attendance_percentage)
        : ''
    );
    setRequestItems(
      req.items.map((it, idx) => ({
        id: it.id || `edit-${idx}-${Date.now()}`,
        date: it.date,
        start_time: it.start_time,
        end_time: it.end_time,
        event_title: it.event_title,
        subject_id: it.subject_id,
        subject_name: it.subject_name,
        faculty_id: it.faculty_id,
        faculty_name: it.faculty_name,
        reason: it.reason || '',
        status: it.status || 'pending',
      }))
    );
    setErrorMessage('');
    setSuccessMessage('');
    onSelectTab('new_request');
  };

  const handleCancelEdit = () => {
    setEditingRequestId(null);
    setRequestItems([
      {
        id: `item-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        start_time: '10:00',
        end_time: '11:00',
        event_title: '',
        subject_id: '',
        subject_name: '',
        faculty_id: '',
        faculty_name: '',
        reason: '',
      },
    ]);
    setCurrentAttendancePct('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!window.confirm('Are you sure you want to withdraw this attendance request? This cannot be undone.')) {
      return;
    }
    try {
      await deleteAttendanceRequest(requestId, currentUser);
      await loadData();
    } catch (err: any) {
      alert(`Failed to withdraw request: ${err?.message || err}`);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Target student resolution
    let targetStudentId = currentUser.id;
    let targetStudentPrn = currentUser.prn || '';
    let targetStudentName = currentUser.name;
    let targetSemester = currentUser.semester ?? 0;
    let targetSection = currentUser.section || '';

    if (isUniversal) {
      if (!selectedStudent) {
        setErrorMessage('Universal Student Mode: Please search and select a Student Name or PRN before submitting.');
        return;
      }
      targetStudentId = selectedStudent.id;
      targetStudentPrn = selectedStudent.prn;
      targetStudentName = selectedStudent.name;
      targetSemester = selectedStudent.semester ?? 0;
      targetSection = selectedStudent.section || '';
    }

    // Validation
    for (let i = 0; i < requestItems.length; i++) {
      const it = requestItems[i];
      if (!it.date) {
        setErrorMessage(`Entry #${i + 1}: Please select a date.`);
        return;
      }
      if (!it.subject_id) {
        setErrorMessage(`Entry #${i + 1}: Please select a Subject using the searchable subject list.`);
        return;
      }
      if (!it.faculty_id) {
        setErrorMessage(`Entry #${i + 1}: Please select a Faculty member using the searchable faculty list.`);
        return;
      }
      if (!it.event_title.trim()) {
        setErrorMessage(`Entry #${i + 1}: Please specify the Event / College Activity.`);
        return;
      }
    }

    // Validate optional Current Attendance Percentage
    let parsedPct: number | null = null;
    if (currentAttendancePct.trim() !== '') {
      const num = Number(currentAttendancePct);
      if (isNaN(num) || num < 0 || num > 100) {
        setErrorMessage('Current Attendance % must be a valid number between 0 and 100.');
        return;
      }
      parsedPct = Math.round(num * 10) / 10;
    }

    setSubmitting(true);
    try {
      if (editingRequestId) {
        await updateAttendanceRequest(
          editingRequestId,
          {
            student_id: targetStudentId,
            student_prn: targetStudentPrn,
            student_name: targetStudentName,
            semester: targetSemester,
            section: targetSection,
            current_attendance_percentage: parsedPct,
            items: requestItems,
          },
          currentUser
        );

        setSuccessMessage('Attendance Update Request was successfully modified and updated!');
        setEditingRequestId(null);
      } else {
        await createAttendanceRequest(
          {
            student_id: targetStudentId,
            student_prn: targetStudentPrn,
            student_name: targetStudentName,
            semester: targetSemester,
            section: targetSection,
            current_attendance_percentage: parsedPct,
            items: requestItems,
          },
          currentUser
        );

        const successNotice = isUniversal
          ? `Attendance Update Request for "${targetStudentName}" (PRN: ${targetStudentPrn}) submitted successfully! Awaiting Admin review.`
          : 'Attendance Update Request submitted successfully! Awaiting Admin review.';
        setSuccessMessage(successNotice);
      }

      // Reset form
      setCurrentAttendancePct('');
      setRequestItems([
        {
          id: `item-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          start_time: '10:00',
          end_time: '11:00',
          event_title: '',
          subject_id: '',
          subject_name: '',
          faculty_id: '',
          faculty_name: '',
          reason: '',
        },
      ]);
      await loadData();
      setTimeout(() => {
        onSelectTab('my_requests');
      }, 1400);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error submitting request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab: Student Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Welcome Card - Clean Light Theme */}
          <div className="bg-white text-slate-900 rounded-xl p-6 shadow-xs border border-slate-200/90">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-blue-800 font-semibold mb-1">
                  Symbiosis Institute of Technology • Student ERP
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  {isUniversal ? 'Universal Student Portal' : `Hello, ${currentUser.name}`}
                </h1>
                <div className="flex flex-wrap items-center gap-2.5 mt-3 text-xs text-slate-600">
                  {isUniversal ? (
                    <>
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-900 rounded-lg border border-blue-200 font-bold uppercase flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-700" />
                        <span>Universal Student Mode</span>
                      </span>
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                        Enrolled Students: <strong className="text-slate-900 font-mono">{studentsList.length}</strong>
                      </span>
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                        Scope: <strong className="text-slate-900">Submit Request for Any Student</strong>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-900 rounded-lg border border-blue-200 font-mono font-semibold">
                        PRN: {currentUser.prn || '—'}
                      </span>
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                        Semester: <strong className="text-slate-900">{currentUser.semester ?? '—'}</strong>
                      </span>
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                        Section: <strong className="text-slate-900">{currentUser.section || '—'}</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <button
                  id="student-cta-new-request"
                  onClick={() => onSelectTab('new_request')}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-xs transition cursor-pointer"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>{isUniversal ? '+ Attendance Request (Any Student)' : '+ Attendance Update Request'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-500 mb-1">
                {isUniversal ? 'Total Requests (All Students)' : 'Total Requests Submitted'}
              </div>
              <div className="text-3xl font-bold text-slate-900">{myRequests.length}</div>
              <div className="text-xs text-slate-500 mt-1">Across all registered semesters</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-500 mb-1">Approved Corrections</div>
              <div className="text-3xl font-bold text-emerald-600">
                {myRequests.filter((r) => r.status === 'approved').length}
              </div>
              <div className="text-xs text-slate-500 mt-1">Verified by department coordinators</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-500 mb-1">Pending Review</div>
              <div className="text-3xl font-bold text-amber-500">
                {myRequests.filter((r) => r.status === 'pending').length}
              </div>
              <div className="text-xs text-slate-500 mt-1">In Admin attendance review queue</div>
            </div>
          </div>

          {/* Recent Requests Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Recent Attendance Requests</h2>
              <button
                onClick={() => onSelectTab('my_requests')}
                className="text-xs text-blue-600 font-semibold hover:text-blue-800 flex items-center space-x-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {myRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No attendance correction requests submitted yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {myRequests.slice(0, 3).map((req) => (
                  <div key={req.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-slate-500">{formatDateDMY(req.created_at)}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                            req.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : req.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200">
                          {req.student_name}
                        </span>
                        <span className="font-mono text-xs text-slate-600">PRN: {req.student_prn}</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        {req.items?.length || 1} missing lecture attendance entry(s)
                      </div>
                      {req.admin_comment && (
                        <div className="text-xs text-slate-600 mt-1 italic">
                          Admin note: "{req.admin_comment}"
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onSelectTab('my_requests')}
                      className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded border border-slate-200"
                    >
                      Details
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: New Attendance Update Request Form */}
      {activeTab === 'new_request' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-slate-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-bold text-slate-900">
                    {editingRequestId ? 'Update Attendance Request' : 'Attendance Update Request'}
                  </h1>
                  {editingRequestId && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-amber-100 text-amber-900 border border-amber-300">
                      Editing Request #{editingRequestId.slice(0, 8)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  {editingRequestId
                    ? 'Modify missing lecture entries, dates, searchable subjects, and faculty details for this pending request.'
                    : 'Submit attendance correction entries for missed lectures due to verified college events or official duty.'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {editingRequestId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                  >
                    ✕ Cancel Editing
                  </button>
                )}
                {isUniversal && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-900 border border-blue-200">
                    <Sparkles className="w-3.5 h-3.5 mr-1 text-blue-700" /> Universal Student Mode
                  </span>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmitRequest} className="p-6 space-y-6">
            {/* Universal Student Selector with Autocomplete */}
            {isUniversal && (
              <div className="bg-slate-50/80 border-2 border-blue-500/70 rounded-xl p-4 sm:p-5 space-y-3.5 relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-blue-900 text-white text-[10px] font-bold uppercase tracking-wider">
                        Universal Student Selector
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        Select Target Student
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Search by student name or PRN. Verified master data will auto-populate below.
                    </p>
                  </div>
                  {selectedStudent && (
                    <button
                      type="button"
                      id="change-selected-student-btn"
                      onClick={() => {
                        setSelectedStudent(null);
                        setStudentSearchTerm('');
                        setIsSearchOpen(true);
                      }}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-3 py-1 rounded-lg border border-rose-200 hover:bg-rose-50 transition cursor-pointer self-start sm:self-auto"
                    >
                      ✕ Change Student
                    </button>
                  )}
                </div>

                {/* Autocomplete Input Container */}
                <div className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      id="student-autocomplete-search-input"
                      placeholder="Search student by Name or PRN (autocomplete)..."
                      value={studentSearchTerm}
                      onChange={(e) => {
                        setStudentSearchTerm(e.target.value);
                        setIsSearchOpen(true);
                        if (selectedStudent && e.target.value !== `${selectedStudent.name} (${selectedStudent.prn})`) {
                          setSelectedStudent(null);
                        }
                      }}
                      onFocus={() => setIsSearchOpen(true)}
                      className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    {studentSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setStudentSearchTerm('');
                          setSelectedStudent(null);
                          setIsSearchOpen(false);
                        }}
                        className="text-slate-400 hover:text-slate-600 absolute right-3 top-2.5 text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Dropdown Menu */}
                  {isSearchOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setIsSearchOpen(false)}
                      />
                      <div className="absolute z-30 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 max-h-60 overflow-y-auto divide-y divide-slate-100">
                        {filteredStudents.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-500">
                            {studentsList.length === 0
                              ? 'No students found in the database. Please add students in the Admin Portal first.'
                              : `No enrolled students match "${studentSearchTerm}".`}
                          </div>
                        ) : (
                          filteredStudents.map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => {
                                setSelectedStudent(st);
                                setStudentSearchTerm(`${st.name} (${st.prn})`);
                                setIsSearchOpen(false);
                                setErrorMessage('');
                              }}
                              className={`w-full text-left p-3 hover:bg-blue-50/70 transition flex items-center justify-between cursor-pointer ${
                                selectedStudent?.id === st.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                              }`}
                            >
                              <div>
                                <div className="font-semibold text-slate-900 text-xs flex items-center gap-2">
                                  <span>{st.name}</span>
                                  <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 font-bold">
                                    PRN: {st.prn}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  Semester {st.semester} • Section {st.section}
                                </div>
                              </div>
                              <span className="text-[11px] font-semibold text-blue-700 shrink-0">
                                Select Student →
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Selected Student Confirmation Pill */}
                {selectedStudent ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold text-emerald-950">
                          Target Student Selected: {selectedStudent.name}
                        </span>
                        <span className="text-emerald-700 font-mono text-[11px] block mt-0.5">
                          PRN: {selectedStudent.prn} • Semester {selectedStudent.semester} (Section {selectedStudent.section})
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-200/80 text-emerald-900 text-[10px] font-bold uppercase">
                      Ready to Submit
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-lg flex items-center space-x-2 text-xs text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Please select a student above to create an attendance correction request on their behalf.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Auto-populated Read-Only Student Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-2 flex items-center justify-between">
                <span>Student Master Information ({isUniversal ? 'Selected Student Record' : 'Read-Only'})</span>
                {isUniversal && selectedStudent && (
                  <span className="text-emerald-700 font-bold lowercase flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> verified from SIT master database
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-blue-700 block">Student Name:</span>
                  <strong className="text-slate-900 font-semibold text-sm">
                    {isUniversal ? (selectedStudent ? selectedStudent.name : '—') : currentUser.name}
                  </strong>
                </div>
                <div>
                  <span className="text-blue-700 block">PRN:</span>
                  <strong className="text-slate-900 font-mono font-semibold text-sm">
                    {isUniversal ? (selectedStudent ? selectedStudent.prn : '—') : (currentUser.prn || '—')}
                  </strong>
                </div>
                <div>
                  <span className="text-blue-700 block">Semester:</span>
                  <strong className="text-slate-900 font-semibold text-sm">
                    {isUniversal
                      ? (selectedStudent ? selectedStudent.semester : '—')
                      : (currentUser.semester ?? '—')}
                  </strong>
                </div>
                <div>
                  <span className="text-blue-700 block">Section:</span>
                  <strong className="text-slate-900 font-semibold text-sm">
                    {isUniversal
                      ? (selectedStudent ? selectedStudent.section : '—')
                      : (currentUser.section || '—')}
                  </strong>
                </div>
              </div>
            </div>

            {/* Student Current Attendance Percentage Input */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-xs font-bold text-slate-800">
                  Current Attendance Percentage (Optional)
                </label>
                <span className="text-[11px] text-slate-500">
                  If unknown or not entered, it will be marked as "Not Entered".
                </span>
              </div>
              <div className="flex items-center space-x-2 max-w-xs">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="e.g. 78.5"
                  value={currentAttendancePct}
                  onChange={(e) => setCurrentAttendancePct(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-mono"
                />
                <span className="text-sm font-bold text-slate-600">%</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                If your ERP portal displays your current attendance %, enter it here to help the department verify your eligibility. If not entered, the administrative cell will verify from class records.
              </p>
            </div>

            {/* Notification messages */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Multiple Request Items List */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Missing Attendance Entries ({requestItems.length})
                </h2>
                <button
                  type="button"
                  id="add-another-item-btn"
                  onClick={handleAddItem}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Another Entry</span>
                </button>
              </div>

              {requestItems.map((item, index) => (
                <div
                  key={item.id}
                  className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4 relative transition hover:border-slate-300"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-xs font-bold font-mono">
                      Entry #{index + 1}
                    </span>
                    {requestItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-slate-400 hover:text-rose-600 text-xs flex items-center space-x-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Date */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Date of Missed Lecture *
                      </label>
                      <input
                        type="date"
                        required
                        value={item.date}
                        onChange={(e) => handleItemChange(index, 'date', e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                      />
                    </div>

                    {/* Time */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time *</label>
                      <input
                        type="time"
                        required
                        value={item.start_time}
                        onChange={(e) => handleItemChange(index, 'start_time', e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">End Time *</label>
                      <input
                        type="time"
                        required
                        value={item.end_time}
                        onChange={(e) => handleItemChange(index, 'end_time', e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Event / Reason */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        College Event / Reason *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Engineers' Day Celebration"
                        value={item.event_title}
                        onChange={(e) => handleItemChange(index, 'event_title', e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                      />
                    </div>

                    {/* Searchable Subject Combobox from Master List */}
                    <div>
                      <SearchableSubjectCombobox
                        label="Subject (Master List)"
                        required
                        subjects={subjectsList}
                        selectedSubjectId={item.subject_id}
                        onSelect={(sub) => handleItemSubjectSelect(index, sub)}
                        placeholder="Search code or subject title..."
                        id={`subject-select-${index}`}
                      />
                    </div>

                    {/* Searchable Faculty Combobox from Master List */}
                    <div>
                      <SearchableFacultyCombobox
                        label="Faculty Member"
                        required
                        facultyList={facultyList}
                        selectedFacultyId={item.faculty_id}
                        onSelect={(fac) => handleItemFacultySelect(index, fac)}
                        placeholder="Search faculty name or dept..."
                        id={`faculty-select-${index}`}
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        *Subject & Faculty are selected independently per SIT guidelines.
                      </p>
                    </div>
                  </div>

                  {/* Justification details */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reason / Duty Details
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Stage coordinator for exhibition or lab competition participation"
                      value={item.reason}
                      onChange={(e) => handleItemChange(index, 'reason', e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleAddItem}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 text-xs font-semibold px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Another Entry</span>
              </button>

              <button
                type="submit"
                id="submit-attendance-request-btn"
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 text-xs font-semibold px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow transition disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {submitting
                    ? editingRequestId
                      ? 'Saving Updates...'
                      : 'Submitting Request...'
                    : editingRequestId
                    ? 'Update & Save Request'
                    : 'Submit Request'}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: My Requests */}
      {activeTab === 'my_requests' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900">
                  {isUniversal ? 'All Student Attendance Requests' : 'My Attendance Update Requests'}
                </h1>
                {isUniversal && (
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-[10px] font-bold uppercase tracking-wider">
                    Universal View
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {isUniversal
                  ? 'Track approval status and administration feedback across all student submissions.'
                  : 'Track approval status and feedback from college administration.'}
              </p>
            </div>
            <button
              onClick={() => onSelectTab('new_request')}
              className="self-start sm:self-auto px-4 py-2 text-xs font-semibold bg-blue-900 hover:bg-blue-800 text-white rounded-lg shadow-xs transition cursor-pointer"
            >
              {isUniversal ? '+ Request for Any Student' : '+ New Request'}
            </button>
          </div>

          {/* Quick Filter Bar for Universal / Multi-student */}
          {myRequests.length > 0 && (
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row items-center gap-3 justify-between">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  placeholder="Filter by Student Name, PRN, or Subject..."
                  value={requestsSearchTerm}
                  onChange={(e) => setRequestsSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-7 py-2 bg-white border border-slate-300 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                {requestsSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setRequestsSearchTerm('')}
                    className="text-slate-400 hover:text-slate-600 absolute right-2.5 top-2 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="text-xs text-slate-500 self-end sm:self-center font-medium">
                Showing <strong className="text-slate-800">{
                  myRequests.filter((r) => {
                    const term = requestsSearchTerm.trim().toLowerCase();
                    if (!term) return true;
                    return (
                      (r.student_name || '').toLowerCase().includes(term) ||
                      (r.student_prn || '').toLowerCase().includes(term) ||
                      (r.items || []).some(
                        (it) =>
                          it.subject_name?.toLowerCase().includes(term) ||
                          it.event_title?.toLowerCase().includes(term)
                      )
                    );
                  }).length
                }</strong> of {myRequests.length} requests
              </div>
            </div>
          )}

          {myRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              <CalendarPlus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-800">No requests submitted</p>
              <p className="text-xs text-slate-500 mt-1">
                You have not submitted any attendance update requests yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {myRequests
                .filter((r) => {
                  const term = requestsSearchTerm.trim().toLowerCase();
                  if (!term) return true;
                  return (
                    (r.student_name || '').toLowerCase().includes(term) ||
                    (r.student_prn || '').toLowerCase().includes(term) ||
                    (r.items || []).some(
                      (it) =>
                        it.subject_name?.toLowerCase().includes(term) ||
                        it.event_title?.toLowerCase().includes(term)
                    )
                  );
                })
                .map((req) => (
                  <div key={req.id} className="p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-bold uppercase flex items-center space-x-1.5 ${
                            req.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : req.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {req.status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {req.status === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
                          {req.status === 'pending' && <Clock className="w-3.5 h-3.5" />}
                          <span>Status: {req.status}</span>
                        </span>
                        <span className="text-xs text-slate-500">
                          Submitted on {formatDateDMY(req.created_at)}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          Current Att.:{' '}
                          {req.current_attendance_percentage !== null && req.current_attendance_percentage !== undefined ? (
                            <strong className="text-slate-900 font-mono font-bold">
                              {req.current_attendance_percentage}%
                            </strong>
                          ) : (
                            <span className="italic text-slate-400">Not Entered</span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-slate-500 font-mono">Request ID: {req.id.slice(0, 8)}</span>
                        {req.status === 'pending' && (
                          <div className="flex items-center space-x-1.5 ml-2">
                            <button
                              type="button"
                              onClick={() => handleStartEditRequest(req)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition cursor-pointer"
                              title="Edit this attendance request"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRequest(req.id)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition cursor-pointer"
                              title="Withdraw and cancel this attendance request"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Withdraw</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Target Student Identity Pill */}
                    <div className="flex flex-wrap items-center gap-2 p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-lg text-xs">
                      <span className="font-bold text-blue-950 flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-blue-700" />
                        <span>Student: {req.student_name}</span>
                      </span>
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-blue-200 text-slate-800 font-semibold">
                        PRN: {req.student_prn || '—'}
                      </span>
                      <span className="bg-white px-2 py-0.5 rounded border border-blue-200 text-slate-700">
                        Semester {req.semester ?? '—'}
                      </span>
                      <span className="bg-white px-2 py-0.5 rounded border border-blue-200 text-slate-700">
                        Section {req.section || '—'}
                      </span>
                    </div>

                    {/* Admin feedback banner */}
                    {req.admin_comment && (
                      <div className="p-3 bg-slate-50 border-l-4 border-blue-600 rounded text-xs text-slate-700">
                        <span className="font-semibold text-slate-900 block mb-0.5">Admin Comment:</span>
                        {req.admin_comment}
                      </div>
                    )}

                    {/* Items list */}
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="min-w-full text-xs divide-y divide-slate-200">
                        <thead className="bg-slate-50 text-slate-600 font-semibold">
                          <tr>
                            <th className="py-2.5 px-3 text-left">Date</th>
                            <th className="py-2.5 px-3 text-left">Time</th>
                            <th className="py-2.5 px-3 text-left">Subject</th>
                            <th className="py-2.5 px-3 text-left">Faculty</th>
                            <th className="py-2.5 px-3 text-left">Event / Reason</th>
                            <th className="py-2.5 px-3 text-center">Item Review</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {req.items?.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-medium text-slate-900 whitespace-nowrap">{formatDateDMY(item.date)}</td>
                              <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                                {item.start_time} - {item.end_time}
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-800">{item.subject_name}</td>
                              <td className="py-2 px-3 text-slate-600">{item.faculty_name}</td>
                              <td className="py-2 px-3 text-slate-700">
                                <div>{item.event_title}</div>
                                {item.reason && <div className="text-[11px] text-slate-500 italic">"{item.reason}"</div>}
                                {item.admin_note && (
                                  <div className="text-[11px] text-blue-700 font-medium mt-0.5">
                                    Note: {item.admin_note}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    (item.status || req.status) === 'approved'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : (item.status || req.status) === 'rejected'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {item.status || req.status || 'pending'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Student Profile */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-2xl mx-auto space-y-6">
          <div className="flex items-center space-x-4 border-b border-slate-200 pb-4">
            <div className="w-14 h-14 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-xl shadow-xs">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {isUniversal ? 'Universal Student Portal' : currentUser.name}
              </h1>
              <p className="text-xs text-slate-500">
                {isUniversal
                  ? 'Multi-Student Attendance Request & Master Record Delegate'
                  : 'Symbiosis Institute of Technology • Student Master Account'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            {isUniversal ? (
              <>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block">Access Mode</span>
                  <strong className="text-blue-900 font-semibold text-sm">Universal Student Portal</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block">Username</span>
                  <strong className="text-slate-900 font-mono text-sm">{currentUser.username}</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block">Enrolled Students in Database</span>
                  <strong className="text-slate-900 text-sm font-mono">{studentsList.length} Students</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block">Request Creation Scope</span>
                  <strong className="text-emerald-700 text-sm">Any Student (Name / PRN Autocomplete)</strong>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block">Permanent Registration Number (PRN)</span>
                  <strong className="text-slate-900 font-mono text-sm">{currentUser.prn || '—'}</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block">Username</span>
                  <strong className="text-slate-900 font-mono text-sm">{currentUser.username}</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block">Enrolled Semester</span>
                  <strong className="text-slate-900 text-sm">
                    {currentUser.semester ? `Semester ${currentUser.semester}` : '—'}
                  </strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 block">Class Section</span>
                  <strong className="text-slate-900 text-sm">
                    {currentUser.section ? `Section ${currentUser.section}` : '—'}
                  </strong>
                </div>
              </>
            )}
          </div>

          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-950 text-xs">
            <span className="font-semibold block mb-1">
              {isUniversal ? 'Universal Student Delegation Notice:' : 'ERP Security Notice:'}
            </span>
            {isUniversal
              ? 'You are signed into the Universal Student Portal. You can submit attendance correction requests on behalf of any enrolled student at SIT Nagpur. Each submission automatically links the student\'s verified PRN and academic details for Admin review.'
              : 'Student master data (Name, PRN, Semester, and Section) is maintained by the SIT Academic Cell. Students cannot edit these master fields directly.'}
          </div>
        </div>
      )}
    </div>
  );
};
