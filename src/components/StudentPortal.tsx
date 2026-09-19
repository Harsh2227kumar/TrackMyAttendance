import React, { useState, useEffect } from 'react';
import { CurrentUser, Faculty, Subject, AttendanceRequest, AttendanceRequestItem } from '../types/index.ts';
import {
  getFacultyList,
  getSubjectsList,
  getAttendanceRequests,
  createAttendanceRequest,
} from '../services/dbService.ts';
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
} from 'lucide-react';

interface StudentPortalProps {
  currentUser: CurrentUser;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ currentUser, activeTab, onSelectTab }) => {
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [myRequests, setMyRequests] = useState<AttendanceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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
      const [fac, sub, reqs] = await Promise.all([
        getFacultyList(),
        getSubjectsList(),
        getAttendanceRequests(currentUser.id),
      ]);
      setFacultyList(fac.filter((f) => f.status === 'active'));
      setSubjectsList(sub.filter((s) => s.status === 'active'));
      setMyRequests(reqs);
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
        item.subject_name = selectedSub ? selectedSub.name : '';
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

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Validation
    for (let i = 0; i < requestItems.length; i++) {
      const it = requestItems[i];
      if (!it.date) {
        setErrorMessage(`Entry #${i + 1}: Please select a date.`);
        return;
      }
      if (!it.subject_id) {
        setErrorMessage(`Entry #${i + 1}: Please select a Subject from the Master list.`);
        return;
      }
      if (!it.faculty_id) {
        setErrorMessage(`Entry #${i + 1}: Please select a Faculty member from the Master list.`);
        return;
      }
      if (!it.event_title.trim()) {
        setErrorMessage(`Entry #${i + 1}: Please specify the Event / College Activity.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await createAttendanceRequest(
        {
          student_id: currentUser.id,
          student_prn: currentUser.prn || '',
          student_name: currentUser.name,
          semester: currentUser.semester || 5,
          section: currentUser.section || 'A',
          items: requestItems,
        },
        currentUser
      );

      setSuccessMessage('Attendance Update Request submitted successfully! Awaiting Admin review.');
      // Reset form
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
      }, 1200);
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
                  Hello, {currentUser.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2.5 mt-3 text-xs text-slate-600">
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-900 rounded-lg border border-blue-200 font-mono font-semibold">
                    PRN: {currentUser.prn || '24070521001'}
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                    Semester: <strong className="text-slate-900">{currentUser.semester || 5}</strong>
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                    Section: <strong className="text-slate-900">{currentUser.section || 'A'}</strong>
                  </span>
                </div>
              </div>

              <div>
                <button
                  id="student-cta-new-request"
                  onClick={() => onSelectTab('new_request')}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-xs transition cursor-pointer"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>+ Attendance Update Request</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-500 mb-1">Total Requests Submitted</div>
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
                        <span className="text-xs text-slate-500">{new Date(req.created_at).toLocaleDateString()}</span>
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
                      <div className="text-sm font-semibold text-slate-900 mt-1">
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
            <h1 className="text-xl font-bold text-slate-900">Attendance Update Request</h1>
            <p className="text-xs text-slate-600 mt-1">
              Submit attendance correction entries for missed lectures due to verified college events or official duty.
            </p>
          </div>

          <form onSubmit={handleSubmitRequest} className="p-6 space-y-6">
            {/* Auto-populated Read-Only Student Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-2">
                Student Master Information (Read-Only)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-blue-700 block">Student Name:</span>
                  <strong className="text-slate-900 font-semibold text-sm">{currentUser.name}</strong>
                </div>
                <div>
                  <span className="text-blue-700 block">PRN:</span>
                  <strong className="text-slate-900 font-mono font-semibold text-sm">
                    {currentUser.prn || '24070521001'}
                  </strong>
                </div>
                <div>
                  <span className="text-blue-700 block">Semester:</span>
                  <strong className="text-slate-900 font-semibold text-sm">{currentUser.semester || 5}</strong>
                </div>
                <div>
                  <span className="text-blue-700 block">Section:</span>
                  <strong className="text-slate-900 font-semibold text-sm">{currentUser.section || 'A'}</strong>
                </div>
              </div>
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

                    {/* Subject dropdown from Master List */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Subject (Master List) *
                      </label>
                      <select
                        required
                        value={item.subject_id}
                        onChange={(e) => handleItemChange(index, 'subject_id', e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                      >
                        <option value="">-- Select Subject --</option>
                        {subjectsList.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.code}: {sub.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Faculty independent selection */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Faculty Member *
                      </label>
                      <select
                        required
                        value={item.faculty_id}
                        onChange={(e) => handleItemChange(index, 'faculty_id', e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                      >
                        <option value="">-- Select Faculty --</option>
                        {facultyList.map((fac) => (
                          <option key={fac.id} value={fac.id}>
                            {fac.name} ({fac.department})
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500 mt-0.5">
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
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 text-xs font-semibold px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow transition disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Submitting Request...' : 'Submit Request'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: My Requests */}
      {activeTab === 'my_requests' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">My Attendance Update Requests</h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Track approval status and feedback from college administration.
              </p>
            </div>
            <button
              onClick={() => onSelectTab('new_request')}
              className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
            >
              + New Request
            </button>
          </div>

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
              {myRequests.map((req) => (
                <div key={req.id} className="p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-3">
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
                        Submitted on {new Date(req.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 font-mono">Request ID: {req.id.slice(0, 8)}</div>
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
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {req.items?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-medium text-slate-900 whitespace-nowrap">{item.date}</td>
                            <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                              {item.start_time} - {item.end_time}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-800">{item.subject_name}</td>
                            <td className="py-2 px-3 text-slate-600">{item.faculty_name}</td>
                            <td className="py-2 px-3 text-slate-700">
                              <div>{item.event_title}</div>
                              {item.reason && <div className="text-[11px] text-slate-500 italic">{item.reason}</div>}
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
            <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl">
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{currentUser.name}</h1>
              <p className="text-xs text-slate-500">Symbiosis Institute of Technology • Student Master Account</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-500 block">Permanent Registration Number (PRN)</span>
              <strong className="text-slate-900 font-mono text-sm">{currentUser.prn || '24070521001'}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-500 block">Username</span>
              <strong className="text-slate-900 font-mono text-sm">{currentUser.username}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-500 block">Enrolled Semester</span>
              <strong className="text-slate-900 text-sm">Semester {currentUser.semester || 5}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-500 block">Class Section</span>
              <strong className="text-slate-900 text-sm">Section {currentUser.section || 'A'}</strong>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <span className="font-semibold block mb-1">ERP Security Notice:</span>
            Student master data (Name, PRN, Semester, and Section) is maintained by the SIT Academic Cell. Students
            cannot edit these master fields directly.
          </div>
        </div>
      )}
    </div>
  );
};
