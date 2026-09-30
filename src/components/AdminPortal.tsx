import React, { useState, useEffect, useRef } from 'react';
import {
  CurrentUser,
  Student,
  Faculty,
  Subject,
  EventRecord,
  EventAttendance,
  AttendanceRequest,
  AttendanceRequestItem,
  AuditLog,
  ReportFilterCriteria,
  ReportRow,
} from '../types/index.ts';
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getFacultyList,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  getSubjectsList,
  createSubject,
  updateSubject,
  deleteSubject,
  getEvents,
  getAttendanceForEvent,
  updateSingleAttendancePercentage,
  deleteEvent,
  getAttendanceRequests,
  reviewAttendanceRequest,
  queryAttendanceReports,
  getAuditLogs,
  seedInitialDatabaseIfNeeded,
  bulkCreateFaculty,
  clearAllDatabaseData,
} from '../services/dbService.ts';
import {
  exportReportsToExcel,
  generateEventAttendancePDF,
  parseAndValidateStudentExcel,
  parseAndValidateFacultyExcel,
  downloadFacultyExcelTemplate,
  downloadStudentExcelTemplate,
  ExcelImportValidationResult,
  FacultyImportValidationResult,
  ExportFormatType,
} from '../utils/exportImport.ts';
import {
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  FileCheck,
  BarChart3,
  History,
  Settings,
  Plus,
  Search,
  Download,
  Upload,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Edit2,
  ArrowUpDown,
  RefreshCw,
  Eye,
  FileSpreadsheet,
  Clock,
  Check,
  X,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';

interface AdminPortalProps {
  currentUser: CurrentUser;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ currentUser, activeTab, onSelectTab }) => {
  // Master state
  const [students, setStudents] = useState<Student[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Student Filters
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSemFilter, setStudentSemFilter] = useState<'ALL' | number>('ALL');
  const [studentSecFilter, setStudentSecFilter] = useState<'ALL' | string>('ALL');

  // Excel Import state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importResult, setImportResult] = useState<ExcelImportValidationResult | null>(null);
  const [importingFile, setImportingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add / Edit Student modal
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentForm, setStudentForm] = useState({
    prn: '',
    name: '',
    semester: 5,
    section: 'A',
    username: '',
    status: 'active' as 'active' | 'inactive',
  });

  // Faculty Modal
  const [facultyModalOpen, setFacultyModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [facultyForm, setFacultyForm] = useState({ name: '', department: 'Computer Science & Engineering', status: 'active' as 'active' | 'inactive' });

  // Faculty Excel Import state
  const [facultyImportModalOpen, setFacultyImportModalOpen] = useState(false);
  const [facultyImportResult, setFacultyImportResult] = useState<FacultyImportValidationResult | null>(null);
  const [facultyImportingFile, setFacultyImportingFile] = useState(false);
  const facultyFileInputRef = useRef<HTMLInputElement>(null);

  // Clear Database state
  const [clearDbModalOpen, setClearDbModalOpen] = useState(false);
  const [clearingDb, setClearingDb] = useState(false);

  // Subject Modal
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', status: 'active' as 'active' | 'inactive' });

  // Request Review modal
  const [selectedRequest, setSelectedRequest] = useState<AttendanceRequest | null>(null);
  const [reviewItems, setReviewItems] = useState<AttendanceRequestItem[]>([]);
  const [reviewOverallStatus, setReviewOverallStatus] = useState<'pending' | 'approved' | 'rejected' | 'partially_approved'>('approved');
  const [adminCommentInput, setAdminCommentInput] = useState('');
  const [reviewAttendancePct, setReviewAttendancePct] = useState<string>('');
  const [requestFilter, setRequestFilter] = useState<'ALL' | 'pending' | 'approved' | 'rejected' | 'partially_approved'>('ALL');
  const [requestSearch, setRequestSearch] = useState('');

  // Event Details / Attendance view
  const [selectedEventForView, setSelectedEventForView] = useState<EventRecord | null>(null);
  const [eventAttendees, setEventAttendees] = useState<EventAttendance[]>([]);
  const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(null);
  const [editAttendancePct, setEditAttendancePct] = useState<string>('');

  // ----------------------------------------------------
  // REPORTING ENGINE STATE (SQL-FIRST MULTI FILTER)
  // ----------------------------------------------------
  const [reportCriteria, setReportCriteria] = useState<ReportFilterCriteria>({
    semester: 'ALL',
    section: 'ALL',
    faculty_name: '',
    subject_name: '',
    event_title: '',
    date_from: '',
    date_to: '',
    prn: '',
    student_name: '',
    has_attendance_request: 'ALL',
    request_status: 'ALL',
    attendance_operator: 'ALL',
    custom_min: 60,
    custom_max: 80,
    sortBy: 'date',
    sortOrder: 'desc',
    page: 1,
    pageSize: 25,
  });

  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  const [allMatchingRows, setAllMatchingRows] = useState<ReportRow[]>([]);
  const [totalReportRecords, setTotalReportRecords] = useState(0);
  const [reportLoading, setReportLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormatType>('attendance_requests_wise');

  // Load all master data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [stu, fac, sub, evts, reqs, logs] = await Promise.all([
        getStudents(),
        getFacultyList(),
        getSubjectsList(),
        getEvents(),
        getAttendanceRequests(),
        getAuditLogs(),
      ]);
      setStudents(stu);
      setFaculty(fac);
      setSubjects(sub);
      setEvents(evts);
      setRequests(reqs);
      setAuditLogs(logs);
    } catch (err) {
      console.error(err);
      setStatusMsg({ text: 'Failed to load system data from database.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Run reporting query whenever criteria changes (debounced or triggered)
  const fetchReportResults = async () => {
    setReportLoading(true);
    try {
      const { rows, totalRecords, allMatchingRows: matching } = await queryAttendanceReports(reportCriteria);
      setReportRows(rows);
      setTotalReportRecords(totalRecords);
      if (matching) {
        setAllMatchingRows(matching);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReportResults();
    }
  }, [activeTab, reportCriteria]);

  // Handle Event view
  const handleOpenEventAttendees = async (evt: EventRecord) => {
    setSelectedEventForView(evt);
    try {
      const atts = await getAttendanceForEvent(evt.id);
      setEventAttendees(atts);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePercentage = async (attId: string) => {
    const num = Number(editAttendancePct);
    if (isNaN(num) || num < 0 || num > 100) {
      alert('Attendance % must be between 0 and 100.');
      return;
    }
    try {
      await updateSingleAttendancePercentage(attId, num, currentUser);
      if (selectedEventForView) {
        const updated = await getAttendanceForEvent(selectedEventForView.id);
        setEventAttendees(updated);
      }
      setEditingAttendanceId(null);
      setStatusMsg({ text: `Attendance % updated to ${num}% and audited.`, type: 'success' });
    } catch (err) {
      console.error(err);
    }
  };

  // ----------------------------------------------------
  // STUDENT CRUD & IMPORT
  // ----------------------------------------------------
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, studentForm, currentUser);
        setStatusMsg({ text: `Student ${studentForm.name} updated.`, type: 'success' });
      } else {
        await createStudent(studentForm, currentUser);
        setStatusMsg({ text: `Student ${studentForm.name} created.`, type: 'success' });
      }
      setStudentModalOpen(false);
      setEditingStudent(null);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Error saving student');
    }
  };

  const handleDeleteStudent = async (s: Student) => {
    if (!confirm(`Are you sure you want to delete student ${s.name} (PRN: ${s.prn})?`)) return;
    try {
      await deleteStudent(s.id, s.prn, currentUser);
      setStatusMsg({ text: `Student ${s.name} deleted.`, type: 'success' });
      await loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingFile(true);
    try {
      const existingPRNs = new Set(students.map((s) => s.prn));
      const res = await parseAndValidateStudentExcel(file, existingPRNs);
      setImportResult(res);
    } catch (err) {
      alert('Failed to parse Excel file. Please ensure columns: PRN, Name, Semester, Section are present.');
    } finally {
      setImportingFile(false);
    }
  };

  const handleConfirmExcelImport = async () => {
    if (!importResult || importResult.validRecords.length === 0) return;
    setLoading(true);
    try {
      let imported = 0;
      for (const rec of importResult.validRecords) {
        await createStudent(rec, currentUser);
        imported++;
      }
      setStatusMsg({ text: `Successfully imported ${imported} students from Excel.`, type: 'success' });
      setImportModalOpen(false);
      setImportResult(null);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Error importing records');
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // FACULTY & SUBJECT CRUD
  // ----------------------------------------------------
  const handleSaveFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFaculty) {
        await updateFaculty(editingFaculty.id, facultyForm, currentUser);
        setStatusMsg({ text: `Faculty member updated.`, type: 'success' });
      } else {
        await createFaculty(facultyForm, currentUser);
        setStatusMsg({ text: `Faculty member added.`, type: 'success' });
      }
      setFacultyModalOpen(false);
      setEditingFaculty(null);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Error saving faculty');
    }
  };

  const handleFacultyFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFacultyImportingFile(true);
    try {
      const existingFacultyNames = new Set(faculty.map((f) => f.name.toLowerCase()));
      const res = await parseAndValidateFacultyExcel(file, existingFacultyNames);
      setFacultyImportResult(res);
    } catch (err) {
      alert('Failed to parse Faculty Excel file. Please ensure column "Faculty Name" or "Name" is present.');
    } finally {
      setFacultyImportingFile(false);
    }
  };

  const handleConfirmFacultyImport = async () => {
    if (!facultyImportResult || facultyImportResult.validRecords.length === 0) return;
    setLoading(true);
    try {
      const res = await bulkCreateFaculty(facultyImportResult.validRecords, currentUser);
      setStatusMsg({ text: `Successfully imported ${res.count} faculty members.`, type: 'success' });
      setFacultyImportModalOpen(false);
      setFacultyImportResult(null);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Error importing faculty records');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllDatabase = async () => {
    setClearingDb(true);
    try {
      const res = await clearAllDatabaseData(currentUser);
      if (res.success) {
        setStatusMsg({ text: 'Database successfully cleared! Admin & Organiser logins restored.', type: 'success' });
        setClearDbModalOpen(false);
        await loadAllData();
      } else {
        alert(`Clear failed: ${res.message}`);
      }
    } catch (err: any) {
      alert(`Error clearing database: ${err?.message || err}`);
    } finally {
      setClearingDb(false);
    }
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSubject) {
        await updateSubject(editingSubject.id, subjectForm, currentUser);
        setStatusMsg({ text: `Subject updated.`, type: 'success' });
      } else {
        await createSubject(subjectForm, currentUser);
        setStatusMsg({ text: `Subject added.`, type: 'success' });
      }
      setSubjectModalOpen(false);
      setEditingSubject(null);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Error saving subject');
    }
  };

  // ----------------------------------------------------
  // ATTENDANCE REQUEST ACTIONS & CUSTOM REVIEW
  // ----------------------------------------------------
  const handleOpenReviewModal = (req: AttendanceRequest) => {
    setSelectedRequest(req);
    const items: AttendanceRequestItem[] = (req.items || []).map((it) => ({
      ...it,
      status: it.status || (req.status === 'approved' ? 'approved' : req.status === 'rejected' ? 'rejected' : 'approved'),
      admin_note: it.admin_note || '',
    }));
    setReviewItems(items);
    setReviewOverallStatus(req.status === 'pending' ? 'approved' : req.status);
    setAdminCommentInput(req.admin_comment || '');
    setReviewAttendancePct(
      req.current_attendance_percentage !== null && req.current_attendance_percentage !== undefined
        ? String(req.current_attendance_percentage)
        : ''
    );
  };

  const handleItemStatusChange = (index: number, newStatus: 'pending' | 'approved' | 'rejected') => {
    const updated = [...reviewItems];
    updated[index] = { ...updated[index], status: newStatus };
    setReviewItems(updated);

    // Auto-calculate suggested overall status based on items
    const allApproved = updated.every((i) => i.status === 'approved');
    const allRejected = updated.every((i) => i.status === 'rejected');
    if (allApproved) {
      setReviewOverallStatus('approved');
    } else if (allRejected) {
      setReviewOverallStatus('rejected');
    } else {
      setReviewOverallStatus('partially_approved');
    }
  };

  const handleItemNoteChange = (index: number, note: string) => {
    const updated = [...reviewItems];
    updated[index] = { ...updated[index], admin_note: note };
    setReviewItems(updated);
  };

  const handleApproveAllItems = () => {
    const updated = reviewItems.map((i) => ({ ...i, status: 'approved' as const }));
    setReviewItems(updated);
    setReviewOverallStatus('approved');
  };

  const handleRejectAllItems = () => {
    const updated = reviewItems.map((i) => ({ ...i, status: 'rejected' as const }));
    setReviewItems(updated);
    setReviewOverallStatus('rejected');
  };

  const handleResetAllToPending = () => {
    const updated = reviewItems.map((i) => ({ ...i, status: 'pending' as const }));
    setReviewItems(updated);
    setReviewOverallStatus('pending');
  };

  const handleSaveCustomReview = async () => {
    if (!selectedRequest) return;
    setLoading(true);
    try {
      let pctToSave: number | null = null;
      if (reviewAttendancePct.trim() !== '') {
        const num = Number(reviewAttendancePct);
        if (isNaN(num) || num < 0 || num > 100) {
          alert('Current Attendance % must be a number between 0 and 100');
          setLoading(false);
          return;
        }
        pctToSave = Math.round(num * 10) / 10;
      }

      await reviewAttendanceRequest(
        selectedRequest.id,
        reviewOverallStatus,
        adminCommentInput,
        currentUser,
        reviewItems,
        pctToSave
      );
      setStatusMsg({
        text: `Request for ${selectedRequest.student_name} (${selectedRequest.student_prn}) finalized as ${reviewOverallStatus.toUpperCase().replace('_', ' ')}.`,
        type: 'success',
      });
      setSelectedRequest(null);
      setAdminCommentInput('');
      setReviewAttendancePct('');
      setReviewItems([]);
      await loadAllData();
      if (activeTab === 'reports') {
        await fetchReportResults();
      }
    } catch (err: any) {
      alert(err.message || 'Error reviewing request');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReview = async (req: AttendanceRequest, status: 'approved' | 'rejected') => {
    if (!confirm(`Mark attendance request for ${req.student_name} (${req.student_prn}) as ${status.toUpperCase()}?`)) return;
    setLoading(true);
    try {
      const items = (req.items || []).map((it) => ({
        ...it,
        status: status,
      }));
      await reviewAttendanceRequest(
        req.id,
        status,
        `Quick ${status} by administrator`,
        currentUser,
        items,
        req.current_attendance_percentage
      );
      setStatusMsg({
        text: `Request for ${req.student_name} marked as ${status.toUpperCase()}.`,
        type: 'success',
      });
      await loadAllData();
      if (activeTab === 'reports') {
        await fetchReportResults();
      }
    } catch (err: any) {
      alert(err.message || 'Error updating request');
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // REPORT EXPORT TRIGGERS
  // ----------------------------------------------------
  const handleExportExcel = () => {
    const targetRows = allMatchingRows && allMatchingRows.length > 0 ? allMatchingRows : reportRows;
    if (targetRows.length === 0) {
      alert('No matching report records found to export. Adjust your filters.');
      return;
    }
    exportReportsToExcel(targetRows, exportFormat);
    setStatusMsg({
      text: `Exported ${targetRows.length} matching student records in "${exportFormat.replace(/_/g, ' ')}" format.`,
      type: 'success',
    });
  };

  // Filter students view
  const filteredStudents = students.filter((s) => {
    const q = studentSearch.toLowerCase();
    const matchesQuery = s.prn.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
    const matchesSem = studentSemFilter === 'ALL' || s.semester === studentSemFilter;
    const matchesSec = studentSecFilter === 'ALL' || s.section.toUpperCase() === studentSecFilter;
    return matchesQuery && matchesSem && matchesSec;
  });

  return (
    <div className="space-y-6">
      {/* Global Status Message */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between shadow-sm ${
            statusMsg.type === 'error'
              ? 'bg-rose-50 border border-rose-200 text-rose-800'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {statusMsg.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-600 font-bold">
            ×
          </button>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* TAB 1: ADMIN DASHBOARD */}
      {/* -------------------------------------------------- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Header Banner - Subtle, Classy Light Theme */}
          <div className="bg-white text-slate-900 p-6 rounded-xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-blue-800 font-semibold mb-0.5">
                Symbiosis Institute of Technology • Nagpur Campus
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Academic Administration & ERP Command</h1>
              <p className="text-xs text-slate-500 mt-1">
                Unified Student Master, Independent Faculty Master, Event Attendance & Audit Logs.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onSelectTab('reports')}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Multi-Filter Reports</span>
              </button>
            </div>
          </div>

          {/* Workflow Guide: When Database is empty, highlight next steps clearly */}
          {students.length === 0 && faculty.length === 0 && (
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-700" />
                  Database Ready • Initial Setup Workflow
                </span>
                <p className="text-xs text-slate-700">
                  The database is currently clean. Upload the <strong>Faculty List</strong> and <strong>Student List</strong> via Excel spreadsheets to activate the collegiate ERP.
                </p>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  id="guide-upload-faculty-btn"
                  onClick={() => {
                    onSelectTab('faculty');
                    setFacultyImportModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-white text-blue-900 border border-blue-300 hover:bg-blue-100/50 rounded-lg text-xs font-semibold shadow-2xs transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-800" />
                  <span>Upload Faculty List</span>
                </button>
                <button
                  id="guide-upload-students-btn"
                  onClick={() => {
                    onSelectTab('students');
                    setImportModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-blue-900 text-white hover:bg-blue-800 rounded-lg text-xs font-semibold shadow-2xs transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Student List</span>
                </button>
              </div>
            </div>
          )}

          {/* Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-semibold uppercase text-slate-500">Total Students</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{students.length}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Master database</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-semibold uppercase text-slate-500">College Events</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">{events.length}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Draft & Submitted</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-semibold uppercase text-slate-500">Attendance Records</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {events.reduce((acc, curr) => acc + (curr.student_count || 0), 0)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Logged attendance</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-semibold uppercase text-slate-500">Pending Requests</div>
              <div className="text-2xl font-bold text-amber-500 mt-1">
                {requests.filter((r) => r.status === 'pending').length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Needs Admin review</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-semibold uppercase text-slate-500">Faculty Master</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">{faculty.length}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Independent roster</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-semibold uppercase text-slate-500">Subjects Master</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">{subjects.length}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Curriculum courses</div>
            </div>
          </div>

          {/* Quick Split: Recent Events & Pending Requests */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Events */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Recent College Events</h2>
                <button
                  onClick={() => onSelectTab('events')}
                  className="text-xs text-blue-600 font-semibold hover:text-blue-800"
                >
                  View all →
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {events.slice(0, 4).map((evt) => (
                  <div key={evt.id} className="p-3.5 hover:bg-slate-50 transition flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">{evt.title}</div>
                      <div className="text-slate-500 mt-0.5">
                        {evt.date} • {evt.venue} • {evt.student_count || 0} attendees
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                        evt.status === 'submitted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {evt.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Requests Queue */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Attendance Update Requests Queue</h2>
                <button
                  onClick={() => onSelectTab('requests')}
                  className="text-xs text-blue-600 font-semibold hover:text-blue-800"
                >
                  View queue →
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {requests.slice(0, 4).map((req) => (
                  <div key={req.id} className="p-3.5 hover:bg-slate-50 transition flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {req.student_name} <span className="font-mono text-slate-500">({req.student_prn})</span>
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        Sem {req.semester}-{req.section} • {req.items?.length || 1} missing lecture items
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
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
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* TAB 2: STUDENT MANAGEMENT & EXCEL IMPORT */}
      {/* -------------------------------------------------- */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900">Student Master Database</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage registered students, validate PRNs, and bulk import student records via Excel.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                id="download-student-template-btn"
                onClick={downloadStudentExcelTemplate}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition cursor-pointer"
                title="Download template with sample PRNs"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Template</span>
              </button>

              <button
                id="open-excel-import-modal-btn"
                onClick={() => {
                  setImportResult(null);
                  setImportModalOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Students (Excel)</span>
              </button>

              <button
                id="open-add-student-modal-btn"
                onClick={() => {
                  setEditingStudent(null);
                  setStudentForm({
                    prn: '',
                    name: '',
                    semester: 5,
                    section: 'A',
                    username: '',
                    status: 'active',
                  });
                  setStudentModalOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Student</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by PRN or Name..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <select
                value={studentSemFilter}
                onChange={(e) => setStudentSemFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="ALL">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={studentSecFilter}
                onChange={(e) => setStudentSecFilter(e.target.value)}
                className="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="ALL">All Sections</option>
                {['A', 'B', 'C', 'D'].map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Student Table */}
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="min-w-full text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3 text-left">PRN (Unique)</th>
                  <th className="py-2.5 px-3 text-left">Student Name</th>
                  <th className="py-2.5 px-3 text-center">Semester</th>
                  <th className="py-2.5 px-3 text-center">Section</th>
                  <th className="py-2.5 px-3 text-left">Username</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No matching students found.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{s.prn}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{s.name}</td>
                      <td className="py-2.5 px-3 text-center">Sem {s.semester}</td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-700">{s.section}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{s.username}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            s.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingStudent(s);
                            setStudentForm({
                              prn: s.prn,
                              name: s.name,
                              semester: s.semester,
                              section: s.section,
                              username: s.username,
                              status: s.status,
                            });
                            setStudentModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Edit student"
                        >
                          <Edit2 className="w-3.5 h-3.5 inline" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                          title="Delete student"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="text-[11px] text-slate-500 text-right">
            Showing {filteredStudents.length} of {students.length} students
          </div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* TAB 3: FACULTY MASTER (INDEPENDENT OF SUBJECTS!) */}
      {/* -------------------------------------------------- */}
      {activeTab === 'faculty' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900">Faculty Master List ({faculty.length})</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Maintained independently without fixed subject mappings per SIT Nagpur curriculum guidelines.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                id="download-faculty-template-btn"
                onClick={downloadFacultyExcelTemplate}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition cursor-pointer"
                title="Download template for faculty bulk import"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Template</span>
              </button>

              <button
                id="open-faculty-import-modal-btn"
                onClick={() => {
                  setFacultyImportResult(null);
                  setFacultyImportModalOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Faculty (Excel)</span>
              </button>

              <button
                id="open-add-faculty-modal-btn"
                onClick={() => {
                  setEditingFaculty(null);
                  setFacultyForm({ name: '', department: 'Computer Science & Engineering', status: 'active' });
                  setFacultyModalOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Faculty Member</span>
              </button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="min-w-full text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12">#</th>
                  <th className="py-2.5 px-3 text-left">Faculty Name</th>
                  <th className="py-2.5 px-3 text-left">Department</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {faculty.map((f, idx) => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{f.name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{f.department}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          f.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingFaculty(f);
                          setFacultyForm({ name: f.name, department: f.department, status: f.status });
                          setFacultyModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-1"
                      >
                        <Edit2 className="w-3.5 h-3.5 inline" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Delete faculty ${f.name}?`)) {
                            await deleteFaculty(f.id, f.name, currentUser);
                            await loadAllData();
                          }
                        }}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* TAB 4: SUBJECT MASTER (INDEPENDENT OF FACULTY!) */}
      {/* -------------------------------------------------- */}
      {activeTab === 'subjects' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900">Subjects Master List ({subjects.length})</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Curriculum courses available for student attendance correction claims.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingSubject(null);
                setSubjectForm({ name: '', code: '', status: 'active' });
                setSubjectModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Subject</span>
            </button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="min-w-full text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3 text-left">Course Code</th>
                  <th className="py-2.5 px-3 text-left">Subject Name</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {subjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{sub.code}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{sub.name}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          sub.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingSubject(sub);
                          setSubjectForm({ name: sub.name, code: sub.code, status: sub.status });
                          setSubjectModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-1"
                      >
                        <Edit2 className="w-3.5 h-3.5 inline" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Delete subject ${sub.name}?`)) {
                            await deleteSubject(sub.id, sub.name, currentUser);
                            await loadAllData();
                          }
                        }}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* TAB 5: EVENT MANAGEMENT */}
      {/* -------------------------------------------------- */}
      {activeTab === 'events' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-200 pb-4">
            <h1 className="text-lg font-bold text-slate-900">All College Events ({events.length})</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review submitted attendance sheets, inspect student records, and generate official signed PDFs.
            </p>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="min-w-full text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3 text-left">Event Title</th>
                  <th className="py-2.5 px-3 text-left">Date & Time</th>
                  <th className="py-2.5 px-3 text-left">Venue</th>
                  <th className="py-2.5 px-3 text-left">Organiser</th>
                  <th className="py-2.5 px-3 text-center">Attendees</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{evt.title}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {evt.date} ({evt.start_time} - {evt.end_time})
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{evt.venue}</td>
                    <td className="py-2.5 px-3 text-slate-700">{evt.organiser_name}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">
                      {evt.student_count || 0}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          evt.status === 'submitted'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {evt.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEventAttendees(evt)}
                        className="text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={async () => {
                          const atts = await getAttendanceForEvent(evt.id);
                          generateEventAttendancePDF(evt, atts);
                        }}
                        title="Download PDF Attendance Sheet"
                        className="text-emerald-600 hover:text-emerald-800 p-1"
                      >
                        <Download className="w-3.5 h-3.5 inline" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Delete event "${evt.title}" and all attendance entries?`)) {
                            await deleteEvent(evt.id, currentUser);
                            await loadAllData();
                          }
                        }}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* TAB 6: ATTENDANCE REQUEST QUEUE */}
      {/* -------------------------------------------------- */}
      {activeTab === 'requests' && (() => {
        const totalCount = requests.length;
        const pendingCount = requests.filter((r) => r.status === 'pending').length;
        const approvedCount = requests.filter((r) => r.status === 'approved').length;
        const partialCount = requests.filter((r) => r.status === 'partially_approved').length;
        const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

        const filteredQueue = requests.filter((r) => {
          const matchesFilter = requestFilter === 'ALL' || r.status === requestFilter;
          if (!matchesFilter) return false;
          if (!requestSearch.trim()) return true;
          const q = requestSearch.trim().toLowerCase();
          const matchesStudent =
            r.student_name.toLowerCase().includes(q) || r.student_prn.toLowerCase().includes(q);
          const matchesItems = r.items?.some(
            (it) =>
              it.subject_name.toLowerCase().includes(q) ||
              it.faculty_name.toLowerCase().includes(q) ||
              it.event_title.toLowerCase().includes(q) ||
              it.date.includes(q)
          );
          return matchesStudent || matchesItems;
        });

        return (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h1 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <FileCheck className="w-5 h-5 text-blue-600" />
                  <span>Attendance Update Request Queue</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review, approve, or partially approve student claims for missed lecture attendance with independent per-subject & faculty evaluation.
                </p>
              </div>

              {/* Action trigger to reporting */}
              <button
                onClick={() => {
                  setReportCriteria((prev) => ({ ...prev, request_status: 'pending', page: 1 }));
                  onSelectTab('reports');
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold border border-blue-200 transition"
              >
                <span>View & Export in Reporting Engine →</span>
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <button
                onClick={() => setRequestFilter('ALL')}
                className={`p-3 rounded-lg border text-left transition ${
                  requestFilter === 'ALL' ? 'border-blue-500 bg-blue-50/50 shadow-xs' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
                }`}
              >
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Total Requests</div>
                <div className="text-xl font-bold text-slate-900 mt-0.5">{totalCount}</div>
              </button>

              <button
                onClick={() => setRequestFilter('pending')}
                className={`p-3 rounded-lg border text-left transition ${
                  requestFilter === 'pending' ? 'border-amber-500 bg-amber-50 shadow-xs ring-1 ring-amber-400' : 'border-slate-200 bg-amber-50/40 hover:bg-amber-50'
                }`}
              >
                <div className="text-[11px] font-semibold text-amber-700 uppercase flex items-center justify-between">
                  <span>Pending</span>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                </div>
                <div className="text-xl font-bold text-amber-900 mt-0.5">{pendingCount}</div>
              </button>

              <button
                onClick={() => setRequestFilter('approved')}
                className={`p-3 rounded-lg border text-left transition ${
                  requestFilter === 'approved' ? 'border-emerald-500 bg-emerald-50 shadow-xs ring-1 ring-emerald-400' : 'border-slate-200 bg-emerald-50/40 hover:bg-emerald-50'
                }`}
              >
                <div className="text-[11px] font-semibold text-emerald-700 uppercase">Approved</div>
                <div className="text-xl font-bold text-emerald-900 mt-0.5">{approvedCount}</div>
              </button>

              <button
                onClick={() => setRequestFilter('partially_approved')}
                className={`p-3 rounded-lg border text-left transition ${
                  requestFilter === 'partially_approved' ? 'border-blue-500 bg-blue-50 shadow-xs ring-1 ring-blue-400' : 'border-slate-200 bg-blue-50/40 hover:bg-blue-50'
                }`}
              >
                <div className="text-[11px] font-semibold text-blue-700 uppercase">Partial</div>
                <div className="text-xl font-bold text-blue-900 mt-0.5">{partialCount}</div>
              </button>

              <button
                onClick={() => setRequestFilter('rejected')}
                className={`p-3 rounded-lg border text-left transition ${
                  requestFilter === 'rejected' ? 'border-rose-500 bg-rose-50 shadow-xs ring-1 ring-rose-400' : 'border-slate-200 bg-rose-50/40 hover:bg-rose-50'
                }`}
              >
                <div className="text-[11px] font-semibold text-rose-700 uppercase">Rejected</div>
                <div className="text-xl font-bold text-rose-900 mt-0.5">{rejectedCount}</div>
              </button>
            </div>

            {/* Filter pills & search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by student name, PRN, subject, faculty..."
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg text-xs self-start sm:self-auto overflow-x-auto">
                {(['ALL', 'pending', 'approved', 'partially_approved', 'rejected'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setRequestFilter(st)}
                    className={`px-3 py-1 rounded font-semibold capitalize transition whitespace-nowrap ${
                      requestFilter === st ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="min-w-full text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Date Submitted</th>
                    <th className="py-2.5 px-3 text-left">Student</th>
                    <th className="py-2.5 px-3 text-left">PRN</th>
                    <th className="py-2.5 px-3 text-center">Class</th>
                    <th className="py-2.5 px-3 text-left">Requested Lectures & Subjects</th>
                    <th className="py-2.5 px-3 text-center">Current Att. %</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No attendance update requests found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredQueue.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{req.student_name}</div>
                          {req.admin_comment && (
                            <div className="text-[11px] text-slate-500 italic truncate max-w-xs" title={req.admin_comment}>
                              Comment: {req.admin_comment}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{req.student_prn}</td>
                        <td className="py-2.5 px-3 text-center font-medium whitespace-nowrap">
                          Sem {req.semester}-{req.section}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {req.items?.map((it, idx) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                                  it.status === 'approved'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : it.status === 'rejected'
                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                                title={`${it.subject_name} • ${it.faculty_name} (${it.date} ${it.start_time}-${it.end_time})`}
                              >
                                <span>{it.subject_name || 'Lecture'}</span>
                                {it.status === 'approved' && <Check className="w-3 h-3 ml-1 text-emerald-600" />}
                                {it.status === 'rejected' && <X className="w-3 h-3 ml-1 text-rose-600" />}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {req.current_attendance_percentage !== null && req.current_attendance_percentage !== undefined ? (
                            <span
                              className={`font-mono font-bold text-xs ${
                                req.current_attendance_percentage >= 75 ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {req.current_attendance_percentage}%
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              Not Entered
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              req.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : req.status === 'partially_approved'
                                ? 'bg-blue-100 text-blue-800'
                                : req.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {req.status === 'partially_approved' ? 'Partial' : req.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-1.5">
                          <button
                            onClick={() => handleOpenReviewModal(req)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>Custom Review</span>
                          </button>
                          <button
                            onClick={() => handleQuickReview(req, 'approved')}
                            title="Quick 1-Click Approve All Items"
                            className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                          >
                            <CheckCircle2 className="w-4 h-4 inline" />
                          </button>
                          <button
                            onClick={() => handleQuickReview(req, 'rejected')}
                            title="Quick 1-Click Reject"
                            className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition"
                          >
                            <XCircle className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* -------------------------------------------------- */}
      {/* TAB 7: POWERFUL REPORTING & EXPORTS (SECTIONS 26-34) */}
      {/* -------------------------------------------------- */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Filters Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h1 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-blue-600" />
                  <span>SQL-First Multi-Filter Attendance Reporting Engine</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Combine multiple parameterized filters. View and export students with pending or approved attendance update requests.
                </p>
              </div>

              {/* Export Trigger */}
              <div className="flex items-center space-x-2">
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as ExportFormatType)}
                  className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="attendance_requests_wise">Format 8: Student Requests (Pending / Approved) Excel</option>
                  <option value="faculty_wise">Format 5: Faculty-wise Excel</option>
                  <option value="student_wise">Format 1: Student-wise Excel</option>
                  <option value="event_wise">Format 2: Event-wise Excel</option>
                  <option value="semester_wise">Format 3: Semester-wise Excel</option>
                  <option value="section_wise">Format 4: Section-wise Excel</option>
                  <option value="event_attendance_sheet">Format 6: Event Sheet Excel</option>
                  <option value="student_history">Format 7: History Excel</option>
                </select>

                <button
                  id="export-excel-report-btn"
                  onClick={handleExportExcel}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>
              </div>
            </div>

            {/* Quick Request Status Filters */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 rounded-lg text-xs">
              <span className="text-[11px] font-semibold text-slate-500 px-2 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3" /> Filter by Request:
              </span>
              <button
                onClick={() => setReportCriteria({ ...reportCriteria, request_status: 'ALL', page: 1 })}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  !reportCriteria.request_status || reportCriteria.request_status === 'ALL'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Records
              </button>
              <button
                onClick={() => setReportCriteria({ ...reportCriteria, request_status: 'pending', page: 1 })}
                className={`px-3 py-1 rounded-md font-semibold flex items-center space-x-1.5 transition ${
                  reportCriteria.request_status === 'pending'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>⏳ Pending Student Requests</span>
              </button>
              <button
                onClick={() => setReportCriteria({ ...reportCriteria, request_status: 'approved', page: 1 })}
                className={`px-3 py-1 rounded-md font-semibold flex items-center space-x-1.5 transition ${
                  reportCriteria.request_status === 'approved'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                }`}
              >
                <Check className="w-3 h-3" />
                <span>✅ Approved Requests</span>
              </button>
              <button
                onClick={() => setReportCriteria({ ...reportCriteria, request_status: 'ANY_REQUEST', page: 1 })}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  reportCriteria.request_status === 'ANY_REQUEST'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📋 Any Requested Attendance
              </button>
              <button
                onClick={() => setReportCriteria({ ...reportCriteria, request_status: 'rejected', page: 1 })}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  reportCriteria.request_status === 'rejected'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                }`}
              >
                ❌ Rejected Claims
              </button>
            </div>

            {/* Filter Input Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Request Status Dropdown */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Attendance Request Status
                </label>
                <select
                  value={reportCriteria.request_status || 'ALL'}
                  onChange={(e) =>
                    setReportCriteria({
                      ...reportCriteria,
                      request_status: e.target.value as any,
                      page: 1,
                    })
                  }
                  className="w-full p-2 border border-blue-300 rounded-lg bg-blue-50/40 font-semibold text-blue-900"
                >
                  <option value="ALL">All Records (Events & Requests)</option>
                  <option value="pending">⏳ Pending Student Requests Only</option>
                  <option value="approved">✅ Approved Requests Only</option>
                  <option value="partially_approved">⚡ Partially Approved Only</option>
                  <option value="rejected">❌ Rejected Requests Only</option>
                  <option value="ANY_REQUEST">📋 Any Student Claim (Pending/Approved)</option>
                  <option value="NONE">⚪ Standard Attendance (No Requests)</option>
                </select>
              </div>

              {/* Semester */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Semester</label>
                <select
                  value={reportCriteria.semester}
                  onChange={(e) =>
                    setReportCriteria({
                      ...reportCriteria,
                      semester: e.target.value === 'ALL' ? 'ALL' : Number(e.target.value),
                      page: 1,
                    })
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="ALL">All Semesters</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Section</label>
                <select
                  value={reportCriteria.section}
                  onChange={(e) => setReportCriteria({ ...reportCriteria, section: e.target.value, page: 1 })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="ALL">All Sections</option>
                  {['A', 'B', 'C', 'D'].map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>

              {/* Faculty Filter */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Faculty Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Snehalata Wankhade"
                  value={reportCriteria.faculty_name}
                  onChange={(e) => setReportCriteria({ ...reportCriteria, faculty_name: e.target.value, page: 1 })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              {/* Subject Filter */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Database Management"
                  value={reportCriteria.subject_name}
                  onChange={(e) => setReportCriteria({ ...reportCriteria, subject_name: e.target.value, page: 1 })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              {/* Event Title */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Event / Activity Title</label>
                <input
                  type="text"
                  placeholder="e.g. Engineers' Day"
                  value={reportCriteria.event_title}
                  onChange={(e) => setReportCriteria({ ...reportCriteria, event_title: e.target.value, page: 1 })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              {/* Date From */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date From</label>
                <input
                  type="date"
                  value={reportCriteria.date_from}
                  onChange={(e) => setReportCriteria({ ...reportCriteria, date_from: e.target.value, page: 1 })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date To</label>
                <input
                  type="date"
                  value={reportCriteria.date_to}
                  onChange={(e) => setReportCriteria({ ...reportCriteria, date_to: e.target.value, page: 1 })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              {/* PRN Filter */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">PRN</label>
                <input
                  type="text"
                  placeholder="Search PRN..."
                  value={reportCriteria.prn}
                  onChange={(e) => setReportCriteria({ ...reportCriteria, prn: e.target.value, page: 1 })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              {/* Student Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Student Name</label>
                <input
                  type="text"
                  placeholder="e.g. Aditya"
                  value={reportCriteria.student_name}
                  onChange={(e) => setReportCriteria({ ...reportCriteria, student_name: e.target.value, page: 1 })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              {/* Attendance % Condition */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Current Attendance %</label>
                <select
                  value={reportCriteria.attendance_operator}
                  onChange={(e) =>
                    setReportCriteria({
                      ...reportCriteria,
                      attendance_operator: e.target.value as any,
                      page: 1,
                    })
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="ALL">All Records</option>
                  <option value="gte_75">Eligible (&ge; 75%)</option>
                  <option value="lt_75">Defaulter (&lt; 75%)</option>
                  <option value="between">Between 60% and 80%</option>
                  <option value="not_entered">Not Entered / Unspecified</option>
                  <option value="entered">Entered / Recorded Only</option>
                </select>
              </div>

              {/* Has Attendance Request boolean */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Has Request Filed?</label>
                <select
                  value={String(reportCriteria.has_attendance_request ?? 'ALL')}
                  onChange={(e) =>
                    setReportCriteria({
                      ...reportCriteria,
                      has_attendance_request: e.target.value === 'ALL' ? 'ALL' : e.target.value === 'true',
                      page: 1,
                    })
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="ALL">All Records</option>
                  <option value="true">Yes (Has Request)</option>
                  <option value="false">No (Standard Only)</option>
                </select>
              </div>
            </div>

            {/* Clear Filters Button */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Matched <strong>{totalReportRecords}</strong> records meeting all active conditions.
              </span>
              <button
                onClick={() =>
                  setReportCriteria({
                    semester: 'ALL',
                    section: 'ALL',
                    faculty_name: '',
                    subject_name: '',
                    event_title: '',
                    date_from: '',
                    date_to: '',
                    prn: '',
                    student_name: '',
                    request_status: 'ALL',
                    has_attendance_request: 'ALL',
                    attendance_operator: 'ALL',
                    sortBy: 'date',
                    sortOrder: 'desc',
                    page: 1,
                    pageSize: 25,
                  })
                }
                className="text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                Reset All Filters
              </button>
            </div>
          </div>

          {/* Report Results Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="min-w-full text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-600 font-semibold select-none">
                  <tr>
                    <th
                      onClick={() =>
                        setReportCriteria({
                          ...reportCriteria,
                          sortBy: 'prn',
                          sortOrder: reportCriteria.sortOrder === 'asc' ? 'desc' : 'asc',
                        })
                      }
                      className="py-2.5 px-3 text-left cursor-pointer hover:bg-slate-100"
                    >
                      <div className="flex items-center space-x-1">
                        <span>PRN</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() =>
                        setReportCriteria({
                          ...reportCriteria,
                          sortBy: 'student_name',
                          sortOrder: reportCriteria.sortOrder === 'asc' ? 'desc' : 'asc',
                        })
                      }
                      className="py-2.5 px-3 text-left cursor-pointer hover:bg-slate-100"
                    >
                      <div className="flex items-center space-x-1">
                        <span>Student Name</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-center">Class</th>
                    <th className="py-2.5 px-3 text-left">Event / Activity</th>
                    <th
                      onClick={() =>
                        setReportCriteria({
                          ...reportCriteria,
                          sortBy: 'date',
                          sortOrder: reportCriteria.sortOrder === 'asc' ? 'desc' : 'asc',
                        })
                      }
                      className="py-2.5 px-3 text-left cursor-pointer hover:bg-slate-100"
                    >
                      <div className="flex items-center space-x-1">
                        <span>Date & Time</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-left">Subject & Faculty</th>
                    <th className="py-2.5 px-3 text-center">Request Status</th>
                    <th
                      onClick={() =>
                        setReportCriteria({
                          ...reportCriteria,
                          sortBy: 'current_attendance_percentage',
                          sortOrder: reportCriteria.sortOrder === 'asc' ? 'desc' : 'asc',
                        })
                      }
                      className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-100"
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <span>Current Att. %</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {reportLoading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Querying database records...
                      </td>
                    </tr>
                  ) : reportRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No records match the active filter criteria. Adjust your filters or switch view.
                      </td>
                    </tr>
                  ) : (
                    reportRows.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{r.prn}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-800">{r.student_name}</div>
                          {r.request_reason && (
                            <div className="text-[11px] text-slate-500 italic max-w-xs truncate" title={r.request_reason}>
                              Reason: "{r.request_reason}"
                            </div>
                          )}
                          {r.admin_comment && (
                            <div className="text-[10px] text-blue-700 font-medium truncate max-w-xs" title={r.admin_comment}>
                              Admin note: {r.admin_comment}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          Sem {r.semester}-{r.section}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 font-medium">
                          <div>{r.event_title}</div>
                          {r.venue && <div className="text-[10px] text-slate-400">{r.venue}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {r.date} ({r.time})
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          <div className="font-medium text-slate-900">{r.subject_name || '—'}</div>
                          <div className="text-[11px] text-slate-500">{r.faculty_name || '—'}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center space-x-1 ${
                              r.request_status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.request_status === 'partially_approved'
                                ? 'bg-blue-100 text-blue-800'
                                : r.request_status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : r.request_status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {r.request_status === 'approved' && <Check className="w-3 h-3 text-emerald-600" />}
                            {r.request_status === 'pending' && <Clock className="w-3 h-3 text-amber-600" />}
                            {r.request_status === 'rejected' && <X className="w-3 h-3 text-rose-600" />}
                            <span>
                              {r.request_status && r.request_status !== 'none'
                                ? r.request_status.replace('_', ' ')
                                : 'Standard'}
                            </span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {r.current_attendance_percentage !== null && r.current_attendance_percentage !== undefined ? (
                            <span
                              className={`font-mono font-bold ${
                                r.current_attendance_percentage >= 75 ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {r.current_attendance_percentage}%
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              Not Entered
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
              <div>
                Showing {(reportCriteria.page - 1) * reportCriteria.pageSize + 1} -{' '}
                {Math.min(reportCriteria.page * reportCriteria.pageSize, totalReportRecords)} of{' '}
                {totalReportRecords} records
              </div>

              <div className="flex items-center space-x-2">
                <button
                  disabled={reportCriteria.page <= 1}
                  onClick={() => setReportCriteria({ ...reportCriteria, page: reportCriteria.page - 1 })}
                  className="px-3 py-1 border border-slate-200 rounded disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="font-semibold text-slate-800">Page {reportCriteria.page}</span>
                <button
                  disabled={reportCriteria.page * reportCriteria.pageSize >= totalReportRecords}
                  onClick={() => setReportCriteria({ ...reportCriteria, page: reportCriteria.page + 1 })}
                  className="px-3 py-1 border border-slate-200 rounded disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* TAB 8: AUDIT LOGS */}
      {/* -------------------------------------------------- */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-200 pb-4">
            <h1 className="text-lg font-bold text-slate-900">Security & Administrative Audit Logs</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable track record of user actions, percentage edits, approvals, and imports.
            </p>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="min-w-full text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3 text-left">Timestamp</th>
                  <th className="py-2.5 px-3 text-left">User</th>
                  <th className="py-2.5 px-3 text-left">Role</th>
                  <th className="py-2.5 px-3 text-left">Action</th>
                  <th className="py-2.5 px-3 text-left">Entity</th>
                  <th className="py-2.5 px-3 text-left">Details / Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-800">{log.user_name}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                        {log.user_role}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-900 font-medium">{log.action}</td>
                    <td className="py-2 px-3 font-mono text-slate-500">{log.entity}</td>
                    <td className="py-2 px-3 text-slate-600 max-w-xs truncate">
                      {log.new_value || log.old_value || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* TAB 9: SETTINGS & DATABASE SEEDER */}
      {/* -------------------------------------------------- */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6 max-w-3xl">
          <div className="border-b border-slate-200 pb-4">
            <h1 className="text-lg font-bold text-slate-900">ERP System & Database Settings</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage database state, authentication rules, and verify collegiate seed data.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Database Engine:</span>
              <strong className="text-slate-900 font-mono">Google Cloud Firestore (Enterprise)</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Active Database Collections:</span>
              <strong className="text-slate-900 font-mono">
                students, faculty, subjects, events, event_attendance, attendance_requests, audit_logs
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Security Rule Status:</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase text-[10px]">
                Active & Enforced
              </span>
            </div>
          </div>

          {/* Database Live Stats & Purge Control */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Live Database Record Statistics
                </h3>
                <p className="text-xs text-slate-500">Real-time counts from Firestore collections</p>
              </div>
              <button
                type="button"
                id="refresh-db-stats-btn"
                onClick={loadAllData}
                className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh Counts</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">Students</div>
                <div className="text-xl font-bold text-slate-900 mt-0.5">{students.length}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">Faculty</div>
                <div className="text-xl font-bold text-slate-900 mt-0.5">{faculty.length}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">Subjects</div>
                <div className="text-xl font-bold text-slate-900 mt-0.5">{subjects.length}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">Events</div>
                <div className="text-xl font-bold text-slate-900 mt-0.5">{events.length}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">Requests</div>
                <div className="text-xl font-bold text-slate-900 mt-0.5">{requests.length}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">Audit Logs</div>
                <div className="text-xl font-bold text-slate-900 mt-0.5">{auditLogs.length}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={downloadStudentExcelTemplate}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download Student Template (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={downloadFacultyExcelTemplate}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download Faculty Template (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Database Reset & Purge Card */}
          <div className="p-5 bg-rose-50/50 rounded-xl border border-rose-200/80 space-y-3">
            <div className="flex items-center space-x-2 text-rose-900">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wide">
                Clear Database & Reset System
              </h3>
            </div>
            <p className="text-xs text-rose-800 leading-relaxed">
              Purges all collections (students, faculty, subjects, events, event attendance, attendance requests, and audit logs) from Firestore. The core authentication records will be restored with user credentials:
              <br />
              <span className="font-mono font-semibold">admin.academic</span> / <span className="font-mono font-semibold">Password123!</span> &amp; <span className="font-mono font-semibold">org.vp</span> / <span className="font-mono font-semibold">Password123!</span>.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                id="clear-db-btn"
                type="button"
                onClick={() => setClearDbModalOpen(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Database & Purge All Entries</span>
              </button>

              <button
                id="reseed-db-btn"
                type="button"
                onClick={async () => {
                  if (confirm('Re-seed initial demo records (faculty, subjects, student roster)?')) {
                    const done = await seedInitialDatabaseIfNeeded();
                    await loadAllData();
                    alert(done ? 'Demo data seeded!' : 'Database already contains data.');
                  }
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition cursor-pointer"
              >
                Optional: Seed Sample Demo Records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* MODAL: EXCEL STUDENT IMPORT PREVIEW */}
      {/* -------------------------------------------------- */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Student Excel Import</h3>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-1">
              <span className="font-semibold block">Required Columns in Spreadsheet:</span>
              <p className="font-mono">PRN, Name, Semester (1-8), Section (A/B/C)</p>
              <p className="text-[11px] text-blue-700">
                All records will be checked for duplicate PRNs against the existing database before import.
              </p>
            </div>

            {/* File input */}
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-500 transition">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <label className="cursor-pointer">
                <span className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                  Click to select Excel file (.xlsx / .csv)
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-slate-400 mt-1">Upload student batch list for semester enrollment.</p>
            </div>

            {/* Validation Breakdown */}
            {importResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
                    <strong className="text-lg block font-bold">{importResult.validRecords.length}</strong>
                    <span>Valid Records</span>
                  </div>
                  <div className="p-3 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
                    <strong className="text-lg block font-bold">{importResult.duplicatePRNs.length}</strong>
                    <span>Duplicate PRNs</span>
                  </div>
                  <div className="p-3 bg-rose-50 text-rose-800 rounded-lg border border-rose-200">
                    <strong className="text-lg block font-bold">{importResult.invalidRecords.length}</strong>
                    <span>Invalid Records</span>
                  </div>
                </div>

                {/* Preview Table of Valid Records */}
                {importResult.validRecords.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 mb-2">
                      Preview Valid Records ({importResult.validRecords.length})
                    </h4>
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg text-xs">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50 text-slate-600 font-semibold">
                          <tr>
                            <th className="py-2 px-3 text-left">PRN</th>
                            <th className="py-2 px-3 text-left">Name</th>
                            <th className="py-2 px-3 text-center">Sem</th>
                            <th className="py-2 px-3 text-center">Sec</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {importResult.validRecords.slice(0, 15).map((r, i) => (
                            <tr key={i}>
                              <td className="py-1.5 px-3 font-mono font-bold text-slate-800">{r.prn}</td>
                              <td className="py-1.5 px-3 text-slate-900">{r.name}</td>
                              <td className="py-1.5 px-3 text-center">{r.semester}</td>
                              <td className="py-1.5 px-3 text-center font-semibold">{r.section}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-import-btn"
                disabled={!importResult || importResult.validRecords.length === 0}
                onClick={handleConfirmExcelImport}
                className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow transition disabled:opacity-40"
              >
                Confirm Import ({importResult?.validRecords.length || 0} Records)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* MODAL: EXCEL FACULTY IMPORT PREVIEW */}
      {/* -------------------------------------------------- */}
      {facultyImportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Faculty Excel Master Upload</h3>
                  <p className="text-[11px] text-slate-500">Bulk register SIT faculty members from spreadsheet</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFacultyImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ×
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">Required Column Headers:</span>
                <button
                  type="button"
                  onClick={downloadFacultyExcelTemplate}
                  className="text-blue-900 font-semibold hover:underline flex items-center space-x-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Download Sample Template</span>
                </button>
              </div>
              <p className="font-mono text-slate-800">"Faculty Name" (or "Name"), "Department" (optional)</p>
              <p className="text-[11px] text-slate-500">
                Faculty members are maintained independently without fixed subject mappings per curriculum guidelines.
              </p>
            </div>

            {/* File input */}
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-500 bg-slate-50/50 transition">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <label className="cursor-pointer block">
                <span className="text-xs font-semibold text-blue-900 hover:text-blue-800">
                  Click to select Faculty Excel spreadsheet (.xlsx, .xls, .csv)
                </span>
                <input
                  ref={facultyFileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFacultyFileUpload}
                  className="hidden"
                />
              </label>
              {facultyImportingFile && (
                <p className="text-xs text-blue-800 font-semibold mt-2 animate-pulse">Reading and validating spreadsheet...</p>
              )}
            </div>

            {/* Preview Results */}
            {facultyImportResult && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Total Rows</div>
                    <div className="text-lg font-bold text-slate-900">{facultyImportResult.totalRead}</div>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="text-[10px] uppercase font-bold text-emerald-700">Valid to Import</div>
                    <div className="text-lg font-bold text-emerald-800">{facultyImportResult.validRecords.length}</div>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                    <div className="text-[10px] uppercase font-bold text-rose-700">Duplicates / Invalid</div>
                    <div className="text-lg font-bold text-rose-800">
                      {facultyImportResult.duplicateNames.length + facultyImportResult.invalidRecords.length}
                    </div>
                  </div>
                </div>

                {facultyImportResult.duplicateNames.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1">
                    <div className="font-semibold text-amber-900">
                      Skipped Existing / Duplicate Names ({facultyImportResult.duplicateNames.length}):
                    </div>
                    <div className="max-h-24 overflow-y-auto space-y-0.5 text-amber-800 font-mono text-[11px]">
                      {facultyImportResult.duplicateNames.map((d, i) => (
                        <div key={i}>
                          {d.name} — {d.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {facultyImportResult.validRecords.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 mb-1.5">
                      Preview Valid Faculty ({facultyImportResult.validRecords.length})
                    </h4>
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg text-xs">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50 text-slate-600 font-semibold">
                          <tr>
                            <th className="py-2 px-3 text-left">#</th>
                            <th className="py-2 px-3 text-left">Faculty Name</th>
                            <th className="py-2 px-3 text-left">Department</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {facultyImportResult.validRecords.slice(0, 15).map((r, i) => (
                            <tr key={i}>
                              <td className="py-1.5 px-3 text-slate-400 font-mono">{i + 1}</td>
                              <td className="py-1.5 px-3 font-semibold text-slate-900">{r.name}</td>
                              <td className="py-1.5 px-3 text-slate-600">{r.department}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setFacultyImportModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-faculty-import-btn"
                disabled={!facultyImportResult || facultyImportResult.validRecords.length === 0 || loading}
                onClick={handleConfirmFacultyImport}
                className="px-5 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg shadow-xs transition disabled:opacity-40 cursor-pointer"
              >
                Confirm Import ({facultyImportResult?.validRecords.length || 0} Faculty Members)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* MODAL: CLEAR DATABASE & PURGE CONFIRMATION */}
      {/* -------------------------------------------------- */}
      {clearDbModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Clear Database</h3>
                <p className="text-xs text-rose-600 font-medium">Irreversible Administrative Action</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This action will completely wipe all student rosters, faculty masters, subjects, events, event attendance lists, and attendance change requests from Firestore.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <span className="font-semibold text-slate-800 block">Login accounts will be reset to:</span>
              <div className="font-mono text-[11px] text-slate-700">
                1. <strong>admin.academic</strong> / Password123!
                <br />
                2. <strong>org.vp</strong> / Password123!
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                disabled={clearingDb}
                onClick={() => setClearDbModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-purge-database-btn"
                disabled={clearingDb}
                onClick={handleClearAllDatabase}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {clearingDb ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Clearing Database...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Purge Database</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* MODAL: ADD / EDIT STUDENT */}
      {/* -------------------------------------------------- */}
      {studentModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingStudent ? 'Edit Student Master Record' : 'Add New Student'}
            </h3>

            <form onSubmit={handleSaveStudent} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">PRN (Unique) *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingStudent}
                  placeholder="Enter Student PRN"
                  value={studentForm.prn}
                  onChange={(e) => setStudentForm({ ...studentForm, prn: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aditya Kumar"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Semester *</label>
                  <select
                    value={studentForm.semester}
                    onChange={(e) => setStudentForm({ ...studentForm, semester: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <option key={sem} value={sem}>
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Section *</label>
                  <select
                    value={studentForm.section}
                    onChange={(e) => setStudentForm({ ...studentForm, section: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {['A', 'B', 'C', 'D'].map((sec) => (
                      <option key={sec} value={sec}>
                        Section {sec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={studentForm.status}
                  onChange={(e) => setStudentForm({ ...studentForm, status: e.target.value as any })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStudentModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* MODAL: ADD / EDIT FACULTY */}
      {/* -------------------------------------------------- */}
      {facultyModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingFaculty ? 'Edit Faculty Member' : 'Add Faculty Member'}
            </h3>

            <form onSubmit={handleSaveFaculty} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Faculty Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Snehalata Wankhade"
                  value={facultyForm.name}
                  onChange={(e) => setFacultyForm({ ...facultyForm, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Computer Science & Engineering"
                  value={facultyForm.department}
                  onChange={(e) => setFacultyForm({ ...facultyForm, department: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={facultyForm.status}
                  onChange={(e) => setFacultyForm({ ...facultyForm, status: e.target.value as any })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setFacultyModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow"
                >
                  Save Faculty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* MODAL: ADD / EDIT SUBJECT */}
      {/* -------------------------------------------------- */}
      {subjectModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingSubject ? 'Edit Subject' : 'Add New Subject'}
            </h3>

            <form onSubmit={handleSaveSubject} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS301"
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Database Management Systems"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={subjectForm.status}
                  onChange={(e) => setSubjectForm({ ...subjectForm, status: e.target.value as any })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSubjectModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* MODAL: CUSTOM REVIEW & APPROVAL OF STUDENT REQUEST */}
      {/* -------------------------------------------------- */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Custom Attendance Request Review & Approval
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      reviewOverallStatus === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : reviewOverallStatus === 'partially_approved'
                        ? 'bg-blue-100 text-blue-800'
                        : reviewOverallStatus === 'rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {reviewOverallStatus.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Student: <strong className="text-slate-800">{selectedRequest.student_name}</strong> • PRN:{' '}
                  <span className="font-mono font-bold text-slate-800">{selectedRequest.student_prn}</span> • Sem{' '}
                  {selectedRequest.semester}-{selectedRequest.section}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setReviewItems([]);
                  setReviewAttendancePct('');
                }}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
              >
                ×
              </button>
            </div>

            {/* Student Current Attendance Percentage Section */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-800 block">
                  Student Current Attendance Percentage:
                </label>
                <p className="text-[11px] text-slate-500">
                  {selectedRequest.current_attendance_percentage !== null && selectedRequest.current_attendance_percentage !== undefined
                    ? `Student entered: ${selectedRequest.current_attendance_percentage}%`
                    : 'Student did not enter percentage ("Not Entered")'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-500 font-medium">Verified / Set %:</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="e.g. 78.5"
                  value={reviewAttendancePct}
                  onChange={(e) => setReviewAttendancePct(e.target.value)}
                  className="w-24 px-2 py-1 text-xs border border-slate-300 rounded font-mono bg-white focus:ring-1 focus:ring-blue-500"
                />
                <span className="font-bold text-slate-600">%</span>
                {reviewAttendancePct !== '' && (
                  <button
                    type="button"
                    onClick={() => setReviewAttendancePct('')}
                    className="text-[10px] text-slate-400 hover:text-rose-600 underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Batch Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <span className="font-semibold text-slate-600">
                Item-level Evaluation ({reviewItems.length} requested lecture{reviewItems.length > 1 ? 's' : ''}):
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleApproveAllItems}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium shadow-2xs transition"
                >
                  ✓ Approve All
                </button>
                <button
                  type="button"
                  onClick={handleRejectAllItems}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-medium shadow-2xs transition"
                >
                  ✕ Reject All
                </button>
                <button
                  type="button"
                  onClick={handleResetAllToPending}
                  className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-medium transition"
                >
                  ↺ Reset
                </button>
              </div>
            </div>

            {/* Request Items List */}
            <div className="space-y-3">
              {reviewItems.map((it, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-lg border text-xs space-y-2.5 transition ${
                    it.status === 'approved'
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : it.status === 'rejected'
                      ? 'bg-rose-50/40 border-rose-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-blue-900 bg-blue-100/70 px-2 py-0.5 rounded text-[11px]">
                        Lecture #{idx + 1}
                      </span>
                      <span className="font-semibold text-slate-800 text-xs">{it.subject_name || 'Subject'}</span>
                    </div>

                    <div className="flex items-center space-x-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleItemStatusChange(idx, 'approved')}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition flex items-center space-x-1 ${
                          it.status === 'approved'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-white border border-slate-300 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        <span>Approve</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleItemStatusChange(idx, 'rejected')}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition flex items-center space-x-1 ${
                          it.status === 'rejected'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'bg-white border border-slate-300 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                        }`}
                      >
                        <X className="w-3 h-3" />
                        <span>Reject</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleItemStatusChange(idx, 'pending')}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                          it.status === 'pending'
                            ? 'bg-amber-500 text-white'
                            : 'bg-white border border-slate-200 text-slate-500 hover:bg-amber-50'
                        }`}
                      >
                        Pending
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Faculty:</span>
                      <strong className="text-slate-800">{it.faculty_name || 'Assigned Faculty'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Date & Time:</span>
                      <span>
                        {it.date} ({it.start_time} - {it.end_time})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Event / Activity:</span>
                      <span className="text-slate-800">{it.event_title || 'College Event'}</span>
                    </div>
                  </div>

                  {it.reason && (
                    <div className="p-2 bg-white/70 rounded border border-slate-200 text-slate-700">
                      <span className="font-semibold text-slate-500">Student Reason:</span> "{it.reason}"
                    </div>
                  )}

                  <div>
                    <input
                      type="text"
                      placeholder="Optional admin note for this lecture (e.g. Verified with faculty, Lab duty granted)"
                      value={it.admin_note || ''}
                      onChange={(e) => handleItemNoteChange(idx, e.target.value)}
                      className="w-full text-xs p-1.5 border border-slate-200 rounded-md bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Overall Status & Justification */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Overall Request Outcome Decision
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['approved', 'partially_approved', 'rejected', 'pending'] as const).map((outcome) => (
                    <button
                      key={outcome}
                      type="button"
                      onClick={() => setReviewOverallStatus(outcome)}
                      className={`p-2 rounded-lg border text-center font-bold text-xs capitalize transition ${
                        reviewOverallStatus === outcome
                          ? outcome === 'approved'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : outcome === 'partially_approved'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : outcome === 'rejected'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-amber-500 text-white border-amber-500 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {outcome.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-800">
                    Administrator Review Justification / Official Note
                  </label>
                  <span className="text-[10px] text-slate-400">Recorded in Immutable Audit Log</span>
                </div>
                <textarea
                  rows={2}
                  placeholder="e.g. Verified with event coordinator. Attendance granted under academic activity concession."
                  value={adminCommentInput}
                  onChange={(e) => setAdminCommentInput(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
                />

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold">Quick Presets:</span>
                  {[
                    'Verified with Event Coordinator & Faculty',
                    'College representation duty leave granted',
                    'Timetable clash attendance approved',
                    'Medical proof verified by cell',
                    'Insufficient proof provided / Rejected',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAdminCommentInput(preset)}
                      className="px-2 py-0.5 bg-white hover:bg-slate-200 border border-slate-200 rounded text-[10px] text-slate-600 transition"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setSelectedRequest(null);
                  setReviewItems([]);
                }}
                className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSaveCustomReview}
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                {loading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                <span>Finalize & Save Review</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* MODAL: INSPECT EVENT ATTENDEES & EDIT PERCENTAGES */}
      {/* -------------------------------------------------- */}
      {selectedEventForView && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedEventForView.title}</h3>
                <p className="text-xs text-slate-500">
                  {selectedEventForView.date} • {selectedEventForView.venue} • {eventAttendees.length} Attendees
                </p>
              </div>
              <button
                onClick={() => setSelectedEventForView(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ×
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="min-w-full text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2 px-3 text-left">PRN</th>
                    <th className="py-2 px-3 text-left">Name</th>
                    <th className="py-2 px-3 text-center">Sem</th>
                    <th className="py-2 px-3 text-center">Sec</th>
                    <th className="py-2 px-3 text-right">Current Attendance %</th>
                    <th className="py-2 px-3 text-center">Admin Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {eventAttendees.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{att.prn}</td>
                      <td className="py-2 px-3 font-medium text-slate-800">{att.student_name}</td>
                      <td className="py-2 px-3 text-center">{att.semester}</td>
                      <td className="py-2 px-3 text-center font-semibold">{att.section}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {editingAttendanceId === att.id ? (
                          <div className="inline-flex items-center space-x-1">
                            <input
                              type="number"
                              step="0.1"
                              value={editAttendancePct}
                              onChange={(e) => setEditAttendancePct(e.target.value)}
                              className="w-16 p-1 border rounded text-right font-mono"
                            />
                            <span>%</span>
                          </div>
                        ) : (
                          `${att.current_attendance_percentage}%`
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {editingAttendanceId === att.id ? (
                          <div className="space-x-1">
                            <button
                              onClick={() => handleUpdatePercentage(att.id)}
                              className="px-2 py-0.5 bg-emerald-600 text-white rounded font-semibold text-[10px]"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingAttendanceId(null)}
                              className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingAttendanceId(att.id);
                              setEditAttendancePct(String(att.current_attendance_percentage));
                            }}
                            className="text-blue-600 hover:text-blue-800 font-semibold"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedEventForView(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => generateEventAttendancePDF(selectedEventForView, eventAttendees)}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow inline-flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF Attendance Sheet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
