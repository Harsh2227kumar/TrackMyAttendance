import React, { useState, useEffect } from 'react';
import { CurrentUser, EventRecord, EventAttendance, Student } from '../types/index.ts';
import {
  getEvents,
  createEvent,
  getStudents,
  getAttendanceForEvent,
  saveEventAttendanceDraft,
  submitEventAttendance,
} from '../services/dbService.ts';
import { generateEventAttendancePDF } from '../utils/exportImport.ts';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  Plus,
  Trash2,
  FileCheck,
  Download,
  AlertCircle,
  CheckCircle2,
  Save,
  ArrowLeft,
  FileText,
} from 'lucide-react';

interface OrganiserPortalProps {
  currentUser: CurrentUser;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

interface AttendanceRowInput {
  student_id: string;
  prn: string;
  student_name: string;
  semester: number;
  section: string;
  current_attendance_percentage: string | number;
}

export const OrganiserPortal: React.FC<OrganiserPortalProps> = ({ currentUser, activeTab, onSelectTab }) => {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  // Event Creation state
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '14:00',
    end_time: '17:00',
    venue: '',
    description: '',
  });

  // Active event being edited/filled for attendance
  const [activeEvent, setActiveEvent] = useState<EventRecord | null>(null);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRowInput[]>([]);

  // Fast PRN Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<Student[]>([]);

  // UI state
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submittedSuccessEvent, setSubmittedSuccessEvent] = useState<EventRecord | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [evts, studs] = await Promise.all([getEvents(), getStudents()]);
      setEvents(evts);
      setAllStudents(studs.filter((s) => s.status === 'active'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter search suggestions in real-time as user types PRN or last digits
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) {
      setSearchSuggestions([]);
      return;
    }

    const matches = allStudents.filter((s) => {
      const prn = s.prn.toLowerCase();
      const name = s.name.toLowerCase();
      return prn.includes(q) || name.includes(q);
    });

    setSearchSuggestions(matches.slice(0, 8));
  }, [searchQuery, allStudents]);

  // Open Event for Attendance Entry
  const handleOpenEventAttendance = async (event: EventRecord) => {
    setActiveEvent(event);
    setSearchQuery('');
    setSearchSuggestions([]);
    setStatusMessage(null);
    setSubmittedSuccessEvent(null);

    // Load existing attendees
    try {
      const existing = await getAttendanceForEvent(event.id);
      setAttendanceRows(
        existing.map((att) => ({
          student_id: att.student_id,
          prn: att.prn,
          student_name: att.student_name,
          semester: att.semester,
          section: att.section,
          current_attendance_percentage: att.current_attendance_percentage,
        }))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Select student from PRN search suggestions
  const handleSelectStudent = (student: Student) => {
    // Duplicate check
    const isAlreadyAdded = attendanceRows.some((row) => row.student_id === student.id || row.prn === student.prn);
    if (isAlreadyAdded) {
      setStatusMessage({
        text: `Student ${student.name} (PRN: ${student.prn}) is already added to this event.`,
        type: 'error',
      });
      setSearchQuery('');
      setSearchSuggestions([]);
      return;
    }

    // Add new row with empty/default attendance %
    setAttendanceRows((prev) => [
      ...prev,
      {
        student_id: student.id,
        prn: student.prn,
        student_name: student.name,
        semester: student.semester,
        section: student.section,
        current_attendance_percentage: '',
      },
    ]);

    setSearchQuery('');
    setSearchSuggestions([]);
    setStatusMessage(null);
  };

  const handleRemoveRow = (index: number) => {
    setAttendanceRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePercentageChange = (index: number, val: string) => {
    setAttendanceRows((prev) => {
      const copy = [...prev];
      copy[index].current_attendance_percentage = val;
      return copy;
    });
  };

  // Create Event Form Submit
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title.trim() || !newEvent.venue.trim()) {
      setStatusMessage({ text: 'Please fill in Title and Venue.', type: 'error' });
      return;
    }

    setIsProcessing(true);
    try {
      const created = await createEvent(
        {
          title: newEvent.title.trim(),
          date: newEvent.date,
          start_time: newEvent.start_time,
          end_time: newEvent.end_time,
          venue: newEvent.venue.trim(),
          description: newEvent.description.trim(),
          organiser_id: currentUser.id,
          organiser_name: currentUser.name,
          status: 'draft',
        },
        currentUser
      );

      await loadData();
      // Immediately open the created event for attendance entry
      handleOpenEventAttendance(created);
      setStatusMessage({
        text: `Event "${created.title}" created. Now search PRNs and enter attendance percentages.`,
        type: 'success',
      });
      // Reset form
      setNewEvent({
        title: '',
        date: new Date().toISOString().split('T')[0],
        start_time: '14:00',
        end_time: '17:00',
        venue: '',
        description: '',
      });
    } catch (err: any) {
      setStatusMessage({ text: err?.message || 'Error creating event', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Save Draft
  const handleSaveDraft = async () => {
    if (!activeEvent) return;
    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const formatted = attendanceRows.map((r) => ({
        student_id: r.student_id,
        prn: r.prn,
        student_name: r.student_name,
        semester: r.semester,
        section: r.section,
        current_attendance_percentage: Number(r.current_attendance_percentage) || 0,
      }));

      await saveEventAttendanceDraft(activeEvent.id, formatted, currentUser);
      await loadData();
      setStatusMessage({
        text: `Draft saved successfully (${attendanceRows.length} attendees recorded).`,
        type: 'success',
      });
    } catch (err: any) {
      setStatusMessage({ text: err?.message || 'Error saving draft', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm Submission
  const handleConfirmSubmission = async () => {
    if (!activeEvent) return;

    // Validate percentage inputs
    for (let i = 0; i < attendanceRows.length; i++) {
      const row = attendanceRows[i];
      const pct = Number(row.current_attendance_percentage);
      if (isNaN(pct) || pct < 0 || pct > 100 || row.current_attendance_percentage === '') {
        setStatusMessage({
          text: `Invalid Current Attendance % for ${row.student_name} (PRN: ${row.prn}). Must be between 0 and 100.`,
          type: 'error',
        });
        setSubmitModalOpen(false);
        return;
      }
    }

    setIsProcessing(true);
    try {
      const formatted = attendanceRows.map((r) => ({
        student_id: r.student_id,
        prn: r.prn,
        student_name: r.student_name,
        semester: r.semester,
        section: r.section,
        current_attendance_percentage: Number(r.current_attendance_percentage),
      }));

      await submitEventAttendance(activeEvent.id, formatted, currentUser);
      await loadData();

      const updated = {
        ...activeEvent,
        status: 'submitted' as const,
        student_count: formatted.length,
      };
      setActiveEvent(updated);
      setSubmittedSuccessEvent(updated);
      setSubmitModalOpen(false);
      setStatusMessage(null);
    } catch (err: any) {
      setStatusMessage({ text: err?.message || 'Submission failed.', type: 'error' });
      setSubmitModalOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPDF = async (event: EventRecord) => {
    try {
      const records = await getAttendanceForEvent(event.id);
      generateEventAttendancePDF(event, records);
    } catch (err) {
      console.error(err);
      alert('Error generating attendance sheet PDF.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Event Attendance Screen */}
      {activeEvent ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Header */}
          <div className="p-6 bg-white border-b border-slate-200 text-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <button
                onClick={() => {
                  setActiveEvent(null);
                  loadData();
                }}
                className="inline-flex items-center space-x-1.5 text-xs text-blue-900 font-semibold hover:text-blue-800 mb-2 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Events List</span>
              </button>
              <div className="flex items-center space-x-3">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{activeEvent.title}</h1>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    activeEvent.status === 'submitted' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {activeEvent.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-800" />
                  <span className="text-slate-700">{activeEvent.date}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-blue-800" />
                  <span className="text-slate-700">
                    {activeEvent.start_time} - {activeEvent.end_time}
                  </span>
                </span>
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-800" />
                  <span className="text-slate-700">{activeEvent.venue}</span>
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {activeEvent.status === 'submitted' && (
                <button
                  id="download-event-pdf-btn"
                  onClick={() => handleDownloadPDF(activeEvent)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF Sheet</span>
                </button>
              )}
            </div>
          </div>

          {/* Success Banner if just submitted */}
          {submittedSuccessEvent && (
            <div className="p-4 bg-emerald-50 border-b border-emerald-200 text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2 text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <strong className="font-bold">Attendance Submitted Successfully!</strong>
                  <p className="text-emerald-700">
                    {submittedSuccessEvent.title} has been officially locked with {attendanceRows.length} attendees.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDownloadPDF(submittedSuccessEvent)}
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow transition self-start sm:self-auto"
              >
                Download Official PDF
              </button>
            </div>
          )}

          {/* Status Alert Banner */}
          {statusMessage && (
            <div
              className={`p-4 border-b text-xs flex items-center space-x-2 ${
                statusMessage.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Fast PRN Search & Student Autocomplete */}
          {activeEvent.status !== 'submitted' ? (
            <div className="p-6 border-b border-slate-200 bg-slate-50">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
                Fast Student Search (PRN / Partial / Last 3-4 Digits)
              </label>
              <div className="relative max-w-xl">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    id="search-prn-input"
                    placeholder="Enter PRN (e.g. 24070521256 or 256) or student name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-mono"
                  />
                </div>

                {/* Search Suggestions Dropdown */}
                {searchSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-30 max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {searchSuggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectStudent(s)}
                        className="w-full text-left p-3 hover:bg-blue-50 transition flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-mono font-bold text-blue-700">{s.prn}</div>
                          <div className="text-xs font-semibold text-slate-900">{s.name}</div>
                        </div>
                        <div className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          Sem {s.semester} • Sec {s.section}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Tip: Typing last 3-4 digits instantly filters students. Clicking a student adds them to the attendance
                sheet below.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-slate-100 text-slate-700 text-xs border-b border-slate-200 flex items-center space-x-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>This event has been submitted and locked. Only Admins can modify attendance records.</span>
            </div>
          )}

          {/* Attendance Table */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <span>Event Attendance Records</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-mono">
                  {attendanceRows.length} Students
                </span>
              </h2>

              {activeEvent.status !== 'submitted' && (
                <div className="flex items-center space-x-2">
                  <button
                    id="save-draft-btn"
                    onClick={handleSaveDraft}
                    disabled={isProcessing}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Draft</span>
                  </button>

                  <button
                    id="submit-attendance-btn"
                    onClick={() => {
                      if (attendanceRows.length === 0) {
                        setStatusMessage({ text: 'Please add at least one student before submitting.', type: 'error' });
                        return;
                      }
                      setSubmitModalOpen(true);
                    }}
                    disabled={isProcessing}
                    className="inline-flex items-center space-x-1.5 px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow transition disabled:opacity-50"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Submit Attendance</span>
                  </button>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="min-w-full text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">#</th>
                    <th className="py-2.5 px-3 text-left">PRN</th>
                    <th className="py-2.5 px-3 text-center w-16">Sem</th>
                    <th className="py-2.5 px-3 text-center w-16">Sec</th>
                    <th className="py-2.5 px-3 text-left">Student Name</th>
                    <th className="py-2.5 px-3 text-left w-48">
                      Current Attendance % <span className="text-rose-500">*</span>
                    </th>
                    {activeEvent.status !== 'submitted' && (
                      <th className="py-2.5 px-3 text-center w-20">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {attendanceRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No students added yet. Use the PRN search above to add attendees.
                      </td>
                    </tr>
                  ) : (
                    attendanceRows.map((row, index) => (
                      <tr key={row.student_id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{index + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{row.prn}</td>
                        <td className="py-2.5 px-3 text-center">{row.semester}</td>
                        <td className="py-2.5 px-3 text-center font-semibold">{row.section}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{row.student_name}</td>
                        <td className="py-2.5 px-3">
                          {activeEvent.status === 'submitted' ? (
                            <span className="font-semibold text-slate-900">
                              {row.current_attendance_percentage}%
                            </span>
                          ) : (
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                placeholder="e.g. 78.5"
                                value={row.current_attendance_percentage}
                                onChange={(e) => handlePercentageChange(index, e.target.value)}
                                className="w-24 px-2 py-1 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none text-right font-mono"
                              />
                              <span className="text-slate-500 font-medium">%</span>
                            </div>
                          )}
                        </td>
                        {activeEvent.status !== 'submitted' && (
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleRemoveRow(index)}
                              className="text-slate-400 hover:text-rose-600 transition p-1"
                              title="Remove from event"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Note about manual percentage entry */}
            <div className="p-3 bg-slate-50 rounded text-[11px] text-slate-500 flex items-start space-x-1.5">
              <span className="font-semibold text-slate-700">Policy:</span>
              <span>
                "Current Attendance Percentage" is entered manually by the organiser representing the student's status at
                the time of event participation. The system does not compute or alter this figure.
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Event List / Creation Dashboard */
        <div className="space-y-6">
          {/* Top Banner - Subtle Light Theme */}
          <div className="bg-white text-slate-900 p-6 rounded-xl shadow-xs border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-emerald-800 font-semibold mb-1">
                College Event Attendance Desk
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Event Organiser Portal</h1>
              <p className="text-xs text-slate-500 mt-1">
                Log and verify official student event attendance, save working drafts, and generate printable sheets.
              </p>
            </div>
            <button
              id="open-create-event-modal"
              onClick={() => onSelectTab('create_event')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create New Event</span>
            </button>
          </div>

          {/* Tab: Create Event Form */}
          {activeTab === 'create_event' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <h2 className="text-base font-bold text-slate-900">Create New Event Attendance Record</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter event details to initialize student attendance tracking.
                </p>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Event Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Engineers' Day Celebration / Hackathon 2026"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Venue *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. S0-2 Auditorium / Lab 4"
                      value={newEvent.venue}
                      onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time *</label>
                    <input
                      type="time"
                      required
                      value={newEvent.start_time}
                      onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">End Time *</label>
                    <input
                      type="time"
                      required
                      value={newEvent.end_time}
                      onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={2}
                      placeholder="Brief note about the activity or competition..."
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => onSelectTab('dashboard')}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow transition disabled:opacity-50"
                  >
                    Create & Add Students
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Events Grid */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">All College Events ({events.length})</h2>

            {events.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No events found. Click "+ Create New Event" to start recording attendance.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="p-5 rounded-xl border border-slate-200 hover:border-blue-400 transition bg-slate-50/50 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            event.status === 'submitted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {event.status}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">{event.date}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{event.title}</h3>
                      <div className="text-xs text-slate-500 mt-2 space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {event.start_time} - {event.end_time}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{event.venue}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{event.student_count || 0} Registered Attendees</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between">
                      <button
                        onClick={() => handleOpenEventAttendance(event)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        {event.status === 'submitted' ? 'View Attendance' : 'Edit Attendance →'}
                      </button>

                      {event.status === 'submitted' && (
                        <button
                          onClick={() => handleDownloadPDF(event)}
                          title="Download Attendance PDF"
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal before Submit */}
      {submitModalOpen && activeEvent && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Submit Attendance?</h3>

            <div className="bg-slate-50 p-4 rounded-lg text-xs space-y-2 text-slate-700">
              <div>
                <span className="text-slate-500 block">Event:</span>
                <strong className="text-slate-900">{activeEvent.title}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Date & Time:</span>
                <strong className="text-slate-900">
                  {activeEvent.date} ({activeEvent.start_time} - {activeEvent.end_time})
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Students:</span>
                <strong className="text-slate-900">{attendanceRows.length} attendees recorded</strong>
              </div>
            </div>

            <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded border border-amber-200">
              <strong>Notice:</strong> Once submitted, attendance cannot be edited without Admin authorization.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setSubmitModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-submit-attendance-btn"
                onClick={handleConfirmSubmission}
                disabled={isProcessing}
                className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow transition disabled:opacity-50"
              >
                {isProcessing ? 'Submitting...' : 'Yes, Submit Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
