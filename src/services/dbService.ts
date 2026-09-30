import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import {
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
  CurrentUser,
  UserRole,
} from '../types/index.ts';

// ----------------------------------------------------
// AUDIT LOGGING
// ----------------------------------------------------
export async function logAudit(
  user: { name: string; id: string; role: string },
  action: string,
  entity: string,
  entityId: string,
  oldValue?: string,
  newValue?: string
) {
  try {
    const colRef = collection(db, 'audit_logs');
    const logItem = {
      user_id: user.id || 'system',
      user_name: user.name || 'System',
      user_role: user.role || 'ADMIN',
      action,
      entity,
      entity_id: entityId,
      old_value: oldValue || '',
      new_value: newValue || '',
      timestamp: new Date().toISOString(),
    };
    await addDoc(colRef, logItem);
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  try {
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(150));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'audit_logs');
    return [];
  }
}

// ----------------------------------------------------
// STUDENTS MASTER DATA
// ----------------------------------------------------
export async function getStudents(): Promise<Student[]> {
  try {
    const snap = await getDocs(collection(db, 'students'));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student));
    return list.sort((a, b) => a.prn.localeCompare(b.prn));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'students');
    return [];
  }
}

export async function searchStudents(searchTerm: string): Promise<Student[]> {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return [];
  const all = await getStudents();
  return all.filter((s) => {
    const prnMatch = s.prn.toLowerCase().includes(term);
    const nameMatch = s.name.toLowerCase().includes(term);
    const semSecMatch = `${s.semester}${s.section}`.toLowerCase().includes(term);
    return prnMatch || nameMatch || semSecMatch;
  });
}

export async function createStudent(student: Omit<Student, 'id' | 'created_at'>, user: CurrentUser): Promise<Student> {
  try {
    // PRN uniqueness check
    const existing = await getStudents();
    if (existing.some((s) => s.prn.trim() === student.prn.trim())) {
      throw new Error(`Student with PRN "${student.prn}" already exists. PRN must be UNIQUE.`);
    }

    const colRef = collection(db, 'students');
    const newDoc = {
      ...student,
      username: student.username || student.name.toLowerCase().replace(/\s+/g, '.'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: student.status || 'active',
    };
    const ref = await addDoc(colRef, newDoc);
    await logAudit(user, 'Created student master record', 'students', ref.id, '', `PRN: ${student.prn}, ${student.name}`);
    return { id: ref.id, ...newDoc };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'students');
    throw error;
  }
}

export async function updateStudent(id: string, updates: Partial<Student>, user: CurrentUser): Promise<void> {
  try {
    const ref = doc(db, 'students', id);
    const oldSnap = await getDoc(ref);
    const oldData = oldSnap.exists() ? oldSnap.data() : {};

    const updated = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    await updateDoc(ref, updated);
    await logAudit(user, 'Updated student record', 'students', id, JSON.stringify(oldData), JSON.stringify(updated));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `students/${id}`);
  }
}

export async function deleteStudent(id: string, prn: string, user: CurrentUser): Promise<void> {
  try {
    await deleteDoc(doc(db, 'students', id));
    await logAudit(user, 'Deleted student record', 'students', id, `PRN: ${prn}`, 'DELETED');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `students/${id}`);
  }
}

// ----------------------------------------------------
// FACULTY MASTER DATA (INDEPENDENT OF SUBJECTS!)
// ----------------------------------------------------
export async function getFacultyList(): Promise<Faculty[]> {
  try {
    const snap = await getDocs(collection(db, 'faculty'));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Faculty));
    return list.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'faculty');
    return [];
  }
}

export async function createFaculty(faculty: Omit<Faculty, 'id' | 'created_at'>, user: CurrentUser): Promise<Faculty> {
  try {
    const colRef = collection(db, 'faculty');
    const newDoc = {
      ...faculty,
      status: faculty.status || 'active',
      created_at: new Date().toISOString(),
    };
    const ref = await addDoc(colRef, newDoc);
    await logAudit(user, 'Created faculty master record', 'faculty', ref.id, '', `${faculty.name} (${faculty.department})`);
    return { id: ref.id, ...newDoc };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'faculty');
    throw error;
  }
}

export async function updateFaculty(id: string, updates: Partial<Faculty>, user: CurrentUser): Promise<void> {
  try {
    const ref = doc(db, 'faculty', id);
    await updateDoc(ref, updates);
    await logAudit(user, 'Updated faculty record', 'faculty', id, '', JSON.stringify(updates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `faculty/${id}`);
  }
}

export async function deleteFaculty(id: string, name: string, user: CurrentUser): Promise<void> {
  try {
    await deleteDoc(doc(db, 'faculty', id));
    await logAudit(user, 'Deleted faculty record', 'faculty', id, name, 'DELETED');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `faculty/${id}`);
  }
}

// ----------------------------------------------------
// SUBJECTS MASTER DATA (INDEPENDENT OF FACULTY!)
// ----------------------------------------------------
export async function getSubjectsList(): Promise<Subject[]> {
  try {
    const snap = await getDocs(collection(db, 'subjects'));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Subject));
    return list.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'subjects');
    return [];
  }
}

export async function createSubject(subject: Omit<Subject, 'id' | 'created_at'>, user: CurrentUser): Promise<Subject> {
  try {
    const colRef = collection(db, 'subjects');
    const newDoc = {
      ...subject,
      status: subject.status || 'active',
      created_at: new Date().toISOString(),
    };
    const ref = await addDoc(colRef, newDoc);
    await logAudit(user, 'Created subject master record', 'subjects', ref.id, '', `${subject.code}: ${subject.name}`);
    return { id: ref.id, ...newDoc };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'subjects');
    throw error;
  }
}

export async function updateSubject(id: string, updates: Partial<Subject>, user: CurrentUser): Promise<void> {
  try {
    const ref = doc(db, 'subjects', id);
    await updateDoc(ref, updates);
    await logAudit(user, 'Updated subject record', 'subjects', id, '', JSON.stringify(updates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `subjects/${id}`);
  }
}

export async function deleteSubject(id: string, name: string, user: CurrentUser): Promise<void> {
  try {
    await deleteDoc(doc(db, 'subjects', id));
    await logAudit(user, 'Deleted subject record', 'subjects', id, name, 'DELETED');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `subjects/${id}`);
  }
}

// ----------------------------------------------------
// EVENTS & EVENT ATTENDANCE
// ----------------------------------------------------
export async function getEvents(): Promise<EventRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'events'));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventRecord));
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'events');
    return [];
  }
}

export async function getEventById(id: string): Promise<EventRecord | null> {
  try {
    const snap = await getDoc(doc(db, 'events', id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as EventRecord;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `events/${id}`);
    return null;
  }
}

export async function createEvent(
  eventData: Omit<EventRecord, 'id' | 'created_at' | 'student_count'>,
  user: CurrentUser
): Promise<EventRecord> {
  try {
    const colRef = collection(db, 'events');
    const newDoc = {
      ...eventData,
      student_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const ref = await addDoc(colRef, newDoc);
    await logAudit(user, 'Created new event', 'events', ref.id, '', `${eventData.title} on ${eventData.date}`);
    return { id: ref.id, ...newDoc };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'events');
    throw error;
  }
}

export async function updateEvent(id: string, updates: Partial<EventRecord>, user: CurrentUser): Promise<void> {
  try {
    const ref = doc(db, 'events', id);
    await updateDoc(ref, {
      ...updates,
      updated_at: new Date().toISOString(),
    });
    await logAudit(user, 'Updated event details', 'events', id, '', JSON.stringify(updates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `events/${id}`);
  }
}

export async function deleteEvent(id: string, user: CurrentUser): Promise<void> {
  try {
    // Also delete attendance records for this event
    const attSnap = await getDocs(query(collection(db, 'event_attendance'), where('event_id', '==', id)));
    const batch = writeBatch(db);
    attSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'events', id));
    await batch.commit();

    await logAudit(user, 'Deleted event and all associated attendance', 'events', id, '', 'DELETED');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `events/${id}`);
  }
}

export async function getAttendanceForEvent(eventId: string): Promise<EventAttendance[]> {
  try {
    const q = query(collection(db, 'event_attendance'), where('event_id', '==', eventId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventAttendance));
    return list.sort((a, b) => a.prn.localeCompare(b.prn));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `event_attendance?event_id=${eventId}`);
    return [];
  }
}

export async function saveEventAttendanceDraft(
  eventId: string,
  attendees: Array<{
    student_id: string;
    prn: string;
    student_name: string;
    semester: number;
    section: string;
    current_attendance_percentage: number;
  }>,
  user: CurrentUser
): Promise<void> {
  try {
    // Remove existing records for this event
    const existing = await getAttendanceForEvent(eventId);
    const batch = writeBatch(db);
    existing.forEach((rec) => {
      batch.delete(doc(db, 'event_attendance', rec.id));
    });

    // Write new draft records
    const attendanceCol = collection(db, 'event_attendance');
    attendees.forEach((att) => {
      const newRef = doc(attendanceCol);
      batch.set(newRef, {
        event_id: eventId,
        student_id: att.student_id,
        prn: att.prn,
        student_name: att.student_name,
        semester: att.semester,
        section: att.section,
        current_attendance_percentage: Number(att.current_attendance_percentage),
        created_at: new Date().toISOString(),
      });
    });

    // Update event student count
    batch.update(doc(db, 'events', eventId), {
      student_count: attendees.length,
      updated_at: new Date().toISOString(),
    });

    await batch.commit();
    await logAudit(user, 'Saved event attendance draft', 'events', eventId, '', `Total students: ${attendees.length}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `events/${eventId}/draft`);
    throw error;
  }
}

export async function submitEventAttendance(
  eventId: string,
  attendees: Array<{
    student_id: string;
    prn: string;
    student_name: string;
    semester: number;
    section: string;
    current_attendance_percentage: number;
  }>,
  user: CurrentUser
): Promise<void> {
  try {
    // Check duplicates in attendees list
    const seen = new Set<string>();
    for (const att of attendees) {
      if (seen.has(att.student_id)) {
        throw new Error(`Duplicate student found: PRN ${att.prn} is added more than once to this event.`);
      }
      seen.add(att.student_id);
    }

    // Remove existing records for this event
    const existing = await getAttendanceForEvent(eventId);
    const batch = writeBatch(db);
    existing.forEach((rec) => {
      batch.delete(doc(db, 'event_attendance', rec.id));
    });

    // Add attendees
    const attendanceCol = collection(db, 'event_attendance');
    attendees.forEach((att) => {
      const newRef = doc(attendanceCol);
      batch.set(newRef, {
        event_id: eventId,
        student_id: att.student_id,
        prn: att.prn,
        student_name: att.student_name,
        semester: att.semester,
        section: att.section,
        current_attendance_percentage: Number(att.current_attendance_percentage),
        created_at: new Date().toISOString(),
      });
    });

    // Mark event as submitted
    batch.update(doc(db, 'events', eventId), {
      status: 'submitted',
      student_count: attendees.length,
      updated_at: new Date().toISOString(),
    });

    await batch.commit();
    await logAudit(
      user,
      'SUBMITTED event attendance',
      'events',
      eventId,
      'draft',
      `SUBMITTED with ${attendees.length} verified attendance records`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `events/${eventId}/submit`);
    throw error;
  }
}

export async function updateSingleAttendancePercentage(
  attendanceId: string,
  newPercentage: number,
  user: CurrentUser
): Promise<void> {
  try {
    const ref = doc(db, 'event_attendance', attendanceId);
    const oldSnap = await getDoc(ref);
    const oldData = oldSnap.exists() ? (oldSnap.data() as EventAttendance) : null;
    const oldVal = oldData ? `${oldData.current_attendance_percentage}%` : '';

    await updateDoc(ref, {
      current_attendance_percentage: Number(newPercentage),
    });

    await logAudit(
      user,
      'Updated student attendance percentage',
      'event_attendance',
      attendanceId,
      oldVal,
      `${newPercentage}% (PRN: ${oldData?.prn})`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `event_attendance/${attendanceId}`);
  }
}

// ----------------------------------------------------
// ATTENDANCE UPDATE REQUESTS (STUDENT & ADMIN)
// ----------------------------------------------------
export async function getAttendanceRequests(studentIdFilter?: string): Promise<AttendanceRequest[]> {
  try {
    let q;
    if (studentIdFilter && studentIdFilter !== 'student-universal') {
      q = query(collection(db, 'attendance_requests'), where('student_id', '==', studentIdFilter));
    } else {
      q = query(collection(db, 'attendance_requests'), orderBy('created_at', 'desc'));
    }
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceRequest));
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'attendance_requests');
    return [];
  }
}

export async function createAttendanceRequest(
  data: Omit<AttendanceRequest, 'id' | 'created_at' | 'status'>,
  user: CurrentUser
): Promise<AttendanceRequest> {
  try {
    const colRef = collection(db, 'attendance_requests');
    const newDoc: Omit<AttendanceRequest, 'id'> = {
      ...data,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const ref = await addDoc(colRef, newDoc);
    await logAudit(
      user,
      'Submitted attendance update request',
      'attendance_requests',
      ref.id,
      '',
      `${data.items.length} missing attendance item(s)`
    );
    return { id: ref.id, ...newDoc };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'attendance_requests');
    throw error;
  }
}

export async function reviewAttendanceRequest(
  requestId: string,
  status: 'pending' | 'approved' | 'rejected' | 'partially_approved',
  adminComment: string,
  user: CurrentUser,
  items?: AttendanceRequestItem[],
  currentAttendancePercentage?: number | null
): Promise<void> {
  try {
    const ref = doc(db, 'attendance_requests', requestId);
    const oldSnap = await getDoc(ref);
    const oldStatus = oldSnap.exists() ? oldSnap.data()?.status : 'unknown';

    const updatePayload: any = {
      status,
      admin_comment: adminComment || '',
      updated_at: new Date().toISOString(),
    };
    if (items && Array.isArray(items)) {
      updatePayload.items = items;
    }
    if (currentAttendancePercentage !== undefined) {
      updatePayload.current_attendance_percentage = currentAttendancePercentage;
    }

    await updateDoc(ref, updatePayload);

    const itemsSummary = items
      ? items.map((i) => `${i.subject_name || 'Item'}: ${i.status || status}`).join(', ')
      : 'All Items';

    await logAudit(
      user,
      `${status.toUpperCase()} attendance request`,
      'attendance_requests',
      requestId,
      oldStatus,
      `Status: ${status}, Items: [${itemsSummary}], Comment: ${adminComment || 'None'}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `attendance_requests/${requestId}`);
  }
}

// ----------------------------------------------------
// SQL-LIKE MULTI-FILTER REPORT QUERYING
// ----------------------------------------------------
export async function queryAttendanceReports(criteria: ReportFilterCriteria): Promise<{
  rows: ReportRow[];
  totalRecords: number;
  allMatchingRows?: ReportRow[];
}> {
  try {
    // 1. Fetch attendance records
    const attSnap = await getDocs(collection(db, 'event_attendance'));
    const allAttendance = attSnap.docs.map((d) => ({ id: d.id, ...d.data() } as EventAttendance));

    // 2. Fetch events lookup
    const eventsSnap = await getDocs(collection(db, 'events'));
    const eventMap = new Map<string, EventRecord>();
    eventsSnap.docs.forEach((d) => eventMap.set(d.id, { id: d.id, ...d.data() } as EventRecord));

    // 3. Fetch students to get baseline attendance percentages from recorded event attendances
    const studentPctMap = new Map<string, number>();
    for (const att of allAttendance) {
      if (att.prn && att.current_attendance_percentage !== undefined && att.current_attendance_percentage !== null) {
        studentPctMap.set(att.prn, Number(att.current_attendance_percentage));
      }
    }

    // 4. Fetch all attendance requests
    const reqSnap = await getDocs(collection(db, 'attendance_requests'));
    const allRequests: AttendanceRequest[] = reqSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceRequest));

    // Build consolidated ReportRow objects
    const rawRows: ReportRow[] = [];
    const processedKeys = new Set<string>();

    // Process event attendance records
    for (const att of allAttendance) {
      const event = eventMap.get(att.event_id);
      const eventDate = event?.date || att.created_at.split('T')[0];
      const eventTitle = event?.title || 'College Event';

      // Look for a matching attendance request from this student
      const matchedReq = allRequests.find((r) => r.student_prn === att.prn);
      let matchedItem: AttendanceRequestItem | undefined;
      if (matchedReq?.items && Array.isArray(matchedReq.items)) {
        matchedItem = matchedReq.items.find(
          (it) => it.event_title === eventTitle || it.date === eventDate
        );
      }

      const requestStatus = matchedItem?.status || matchedReq?.status || 'none';
      const key = `${att.prn}_${eventDate}_${eventTitle}_${matchedItem?.subject_name || ''}`;
      processedKeys.add(key);

      const parsedPct =
        att.current_attendance_percentage !== undefined && att.current_attendance_percentage !== null
          ? Number(att.current_attendance_percentage)
          : null;

      rawRows.push({
        id: att.id,
        prn: att.prn,
        student_name: att.student_name,
        semester: att.semester,
        section: att.section,
        event_title: eventTitle,
        date: eventDate,
        time: event ? `${event.start_time} - ${event.end_time}` : 'Full Day',
        current_attendance_percentage: parsedPct,
        faculty_name: matchedItem?.faculty_name || '',
        subject_name: matchedItem?.subject_name || '',
        organiser_name: event?.organiser_name || '',
        venue: event?.venue || '',
        request_status: requestStatus as any,
        request_id: matchedReq?.id,
        request_reason: matchedItem?.reason,
        admin_comment: matchedReq?.admin_comment || matchedItem?.admin_note,
        requested_item_count: matchedReq?.items?.length || 0,
        source_type: 'event_attendance',
      });
    }

    // Process attendance requests directly (especially for pending or approved student claims)
    for (const req of allRequests) {
      // Determine student percentage:
      // Priority 1: explicitly entered on request (req.current_attendance_percentage)
      // Priority 2: recorded attendance in event_attendance
      // Priority 3: null (Not Entered) - NO hardcoded fake percentages!
      const recordedPct = studentPctMap.get(req.student_prn);
      const basePct =
        req.current_attendance_percentage !== undefined && req.current_attendance_percentage !== null
          ? Number(req.current_attendance_percentage)
          : recordedPct !== undefined
          ? recordedPct
          : null;

      if (req.items && Array.isArray(req.items) && req.items.length > 0) {
        req.items.forEach((item, idx) => {
          const key = `${req.student_prn}_${item.date}_${item.event_title}_${item.subject_name}`;
          // If already added via event_attendance, skip duplicate
          if (processedKeys.has(key)) return;
          processedKeys.add(key);

          rawRows.push({
            id: `req-${req.id}-${item.id || idx}`,
            prn: req.student_prn,
            student_name: req.student_name,
            semester: req.semester,
            section: req.section,
            event_title: item.event_title || 'Attendance Update Request',
            date: item.date,
            time: `${item.start_time} - ${item.end_time}`,
            current_attendance_percentage: basePct,
            faculty_name: item.faculty_name || '',
            subject_name: item.subject_name || '',
            organiser_name: 'Academic Cell',
            venue: 'Lecture Hall / Lab',
            request_status: (item.status || req.status || 'pending') as any,
            request_id: req.id,
            request_reason: item.reason || '',
            admin_comment: req.admin_comment || item.admin_note || '',
            requested_item_count: req.items?.length || 1,
            source_type: 'attendance_request',
          });
        });
      } else {
        // Request without items
        const key = `${req.student_prn}_${req.created_at.split('T')[0]}_request`;
        if (!processedKeys.has(key)) {
          processedKeys.add(key);
          rawRows.push({
            id: `req-${req.id}`,
            prn: req.student_prn,
            student_name: req.student_name,
            semester: req.semester,
            section: req.section,
            event_title: 'Attendance Correction Claim',
            date: req.created_at.split('T')[0],
            time: 'N/A',
            current_attendance_percentage: basePct,
            faculty_name: '',
            subject_name: '',
            organiser_name: 'Academic Cell',
            venue: 'N/A',
            request_status: (req.status || 'pending') as any,
            request_id: req.id,
            request_reason: '',
            admin_comment: req.admin_comment || '',
            requested_item_count: 0,
            source_type: 'attendance_request',
          });
        }
      }
    }

    // Apply parameterized filters
    let filtered = rawRows.filter((r) => {
      // Semester filter
      if (criteria.semester !== 'ALL' && r.semester !== Number(criteria.semester)) {
        return false;
      }
      // Section filter
      if (criteria.section !== 'ALL' && r.section.toUpperCase() !== String(criteria.section).toUpperCase()) {
        return false;
      }
      // PRN filter (prefix or substring)
      if (criteria.prn.trim() && !r.prn.toLowerCase().includes(criteria.prn.trim().toLowerCase())) {
        return false;
      }
      // Student Name filter
      if (criteria.student_name.trim() && !r.student_name.toLowerCase().includes(criteria.student_name.trim().toLowerCase())) {
        return false;
      }
      // Event Title filter
      if (criteria.event_title.trim() && !r.event_title.toLowerCase().includes(criteria.event_title.trim().toLowerCase())) {
        return false;
      }
      // Faculty filter
      if (criteria.faculty_name.trim() && !r.faculty_name?.toLowerCase().includes(criteria.faculty_name.trim().toLowerCase())) {
        return false;
      }
      // Subject filter
      if (criteria.subject_name.trim() && !r.subject_name?.toLowerCase().includes(criteria.subject_name.trim().toLowerCase())) {
        return false;
      }

      // Request Status Filter (pending / approved / rejected / etc.)
      if (criteria.request_status && criteria.request_status !== 'ALL') {
        const s = criteria.request_status;
        if (s === 'ANY_REQUEST') {
          if (!r.request_status || r.request_status === 'none') return false;
        } else if (s === 'NONE') {
          if (r.request_status && r.request_status !== 'none') return false;
        } else {
          if (r.request_status !== s) return false;
        }
      }

      // Has attendance request boolean filter
      if (criteria.has_attendance_request !== undefined && criteria.has_attendance_request !== 'ALL') {
        const hasReq = Boolean(r.request_status && r.request_status !== 'none');
        if (criteria.has_attendance_request === true && !hasReq) return false;
        if (criteria.has_attendance_request === false && hasReq) return false;
      }

      // Date range filters
      if (criteria.date_from && r.date < criteria.date_from) {
        return false;
      }
      if (criteria.date_to && r.date > criteria.date_to) {
        return false;
      }

      // Attendance percentage conditions
      const pct = r.current_attendance_percentage;
      if (criteria.attendance_operator === 'not_entered') {
        if (pct !== null && pct !== undefined) return false;
      } else if (criteria.attendance_operator === 'entered') {
        if (pct === null || pct === undefined) return false;
      } else if (pct === null || pct === undefined) {
        // If an explicit percentage threshold filter is selected (>=75, <75, between), exclude records with no recorded percentage
        if (criteria.attendance_operator !== 'ALL') {
          return false;
        }
      } else {
        if (criteria.attendance_operator === 'gte_75' && pct < 75) {
          return false;
        }
        if (criteria.attendance_operator === 'lt_75' && pct >= 75) {
          return false;
        }
        if (criteria.attendance_operator === 'between') {
          const min = criteria.custom_min ?? 60;
          const max = criteria.custom_max ?? 80;
          if (pct < min || pct > max) return false;
        }
        if (criteria.attendance_operator === 'custom_min' && criteria.custom_min !== undefined) {
          if (pct < criteria.custom_min) return false;
        }
        if (criteria.attendance_operator === 'custom_max' && criteria.custom_max !== undefined) {
          if (pct > criteria.custom_max) return false;
        }
      }

      return true;
    });

    // Sorting
    const { sortBy, sortOrder } = criteria;
    filtered.sort((a, b) => {
      let valA: any = (a as any)[sortBy] ?? '';
      let valB: any = (b as any)[sortBy] ?? '';

      if (sortBy === 'current_attendance_percentage') {
        const numA = typeof a.current_attendance_percentage === 'number' ? a.current_attendance_percentage : -1;
        const numB = typeof b.current_attendance_percentage === 'number' ? b.current_attendance_percentage : -1;
        return sortOrder === 'asc' ? numA - numB : numB - numA;
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const totalRecords = filtered.length;
    // Server/DB-style Pagination
    const start = (criteria.page - 1) * criteria.pageSize;
    const paginated = filtered.slice(start, start + criteria.pageSize);

    return {
      rows: paginated,
      totalRecords,
      allMatchingRows: filtered,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'reports');
    return { rows: [], totalRecords: 0, allMatchingRows: [] };
  }
}

// ----------------------------------------------------
// LOGIN DATABASE & PERSISTENCE MANAGEMENT
// ----------------------------------------------------
export async function initializeLoginDatabaseIfNeeded(): Promise<void> {
  try {
    const adminRef = doc(db, 'users', 'admin-academic');
    const adminSnap = await getDoc(adminRef);
    if (!adminSnap.exists()) {
      await setDoc(adminRef, {
        username: 'admin.academic',
        password: 'Password123!',
        role: 'ADMIN',
        name: 'Academic Cell Administrator',
        created_at: new Date().toISOString(),
      });
    }

    const orgRef = doc(db, 'users', 'org-vp');
    const orgSnap = await getDoc(orgRef);
    if (!orgSnap.exists()) {
      await setDoc(orgRef, {
        username: 'org.vp',
        password: 'Password123!',
        role: 'ORGANISER',
        name: 'Prof. V. P. (Event Organiser)',
        created_at: new Date().toISOString(),
      });
    }

    const uniRef = doc(db, 'users', 'student-universal');
    const uniSnap = await getDoc(uniRef);
    if (!uniSnap.exists()) {
      await setDoc(uniRef, {
        username: 'student.universal',
        password: 'Password123!',
        role: 'STUDENT',
        name: 'Universal Student Portal',
        is_universal: true,
        created_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error initializing login database:', error);
  }
}

// Backward-compatible export: ensures clean login credentials only without dummy data
export async function seedInitialDatabaseIfNeeded(): Promise<boolean> {
  await initializeLoginDatabaseIfNeeded();
  return true;
}

// Complete database reset & clear function
export async function clearAllDatabaseData(user?: CurrentUser): Promise<{ success: boolean; message: string }> {
  try {
    const collectionsToClear = [
      'students',
      'faculty',
      'subjects',
      'events',
      'event_attendance',
      'attendance_requests',
      'audit_logs',
      'users',
    ];

    for (const colName of collectionsToClear) {
      try {
        const snap = await getDocs(collection(db, colName));
        for (const d of snap.docs) {
          await deleteDoc(doc(db, colName, d.id));
        }
      } catch (colErr) {
        console.warn(`Warning clearing collection ${colName}:`, colErr);
      }
    }

    // Re-initialize default admin & organiser credentials
    await initializeLoginDatabaseIfNeeded();

    if (user) {
      await logAudit(
        user,
        'Database Purged & Reset',
        'system',
        'database-reset',
        '',
        'All data cleared; Login credentials restored to admin.academic & org.vp'
      );
    }

    return { success: true, message: 'All database entries and login data successfully cleared.' };
  } catch (error) {
    console.error('Error in clearAllDatabaseData:', error);
    return { success: false, message: error instanceof Error ? error.message : String(error) };
  }
}

// ----------------------------------------------------
// BULK FACULTY IMPORT
// ----------------------------------------------------
export async function bulkCreateFaculty(
  facultyList: Array<{ name: string; department: string; status?: 'active' | 'inactive' }>,
  user: CurrentUser
): Promise<{ count: number }> {
  try {
    const batch = writeBatch(db);
    let count = 0;
    for (const f of facultyList) {
      const ref = doc(collection(db, 'faculty'));
      batch.set(ref, {
        name: f.name.trim(),
        department: f.department.trim() || 'Computer Science & Engineering',
        status: f.status || 'active',
        created_at: new Date().toISOString(),
      });
      count++;
    }
    await batch.commit();
    await logAudit(
      user,
      'Bulk uploaded faculty master list via Excel',
      'faculty',
      'bulk-import',
      '',
      `Imported ${count} faculty members`
    );
    return { count };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'faculty');
    throw error;
  }
}

// ----------------------------------------------------
// DYNAMIC AUTHENTICATION ENGINE
// ----------------------------------------------------
export async function authenticateUser(
  role: UserRole,
  usernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; user?: CurrentUser; error?: string }> {
  const cleanUsername = usernameInput.trim();
  const cleanPassword = passwordInput.trim();

  if (!cleanUsername) {
    return { success: false, error: 'Username or PRN cannot be empty.' };
  }
  if (!cleanPassword) {
    return { success: false, error: 'Password cannot be empty.' };
  }

  // 1. ADMIN AUTHENTICATION
  if (role === 'ADMIN') {
    if (cleanUsername === 'admin.academic' && cleanPassword === 'Password123!') {
      return {
        success: true,
        user: {
          id: 'admin-academic',
          username: 'admin.academic',
          name: 'Academic Cell Administrator',
          role: 'ADMIN',
        },
      };
    }
    // Check if in users collection
    try {
      const userRef = doc(db, 'users', 'admin-academic');
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const u = snap.data();
        if (u.username === cleanUsername && u.password === cleanPassword) {
          return {
            success: true,
            user: {
              id: 'admin-academic',
              username: u.username,
              name: u.name || 'Academic Cell Administrator',
              role: 'ADMIN',
            },
          };
        }
      }
    } catch (e) {
      console.warn('Error verifying admin user:', e);
    }
    return {
      success: false,
      error: 'Invalid admin credentials. Please use username "admin.academic" and password "Password123!".',
    };
  }

  // 2. ORGANISER AUTHENTICATION
  if (role === 'ORGANISER') {
    if (cleanUsername === 'org.vp' && cleanPassword === 'Password123!') {
      return {
        success: true,
        user: {
          id: 'org-vp',
          username: 'org.vp',
          name: 'Prof. V. P. (Event Organiser)',
          role: 'ORGANISER',
        },
      };
    }
    try {
      const userRef = doc(db, 'users', 'org-vp');
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const u = snap.data();
        if (u.username === cleanUsername && u.password === cleanPassword) {
          return {
            success: true,
            user: {
              id: 'org-vp',
              username: u.username,
              name: u.name || 'Prof. V. P. (Event Organiser)',
              role: 'ORGANISER',
            },
          };
        }
      }
    } catch (e) {
      console.warn('Error verifying organiser user:', e);
    }
    return {
      success: false,
      error: 'Invalid organiser credentials. Please use username "org.vp" and password "Password123!".',
    };
  }

  // 3. STUDENT AUTHENTICATION
  // Supports:
  // A. Universal Student Login: username "student.universal" / password "Password123!"
  // B. Specific Student PRN login: username {prn}, password {firstname}.{last3}
  try {
    const cleanLower = cleanUsername.toLowerCase();
    if (
      cleanLower === 'student.universal' ||
      cleanLower === 'universal.student' ||
      cleanLower === 'student'
    ) {
      if (cleanPassword === 'Password123!') {
        return {
          success: true,
          user: {
            id: 'student-universal',
            name: 'Universal Student Portal',
            username: 'student.universal',
            role: 'STUDENT',
            is_universal: true,
            prn: 'UNIVERSAL',
            semester: 0,
            section: 'ALL',
          },
        };
      }
      try {
        const uniDoc = await getDoc(doc(db, 'users', 'student-universal'));
        if (uniDoc.exists() && uniDoc.data()?.password === cleanPassword) {
          return {
            success: true,
            user: {
              id: 'student-universal',
              name: uniDoc.data()?.name || 'Universal Student Portal',
              username: 'student.universal',
              role: 'STUDENT',
              is_universal: true,
              prn: 'UNIVERSAL',
              semester: 0,
              section: 'ALL',
            },
          };
        }
      } catch (e) {
        // Continue
      }
      return {
        success: false,
        error: 'Invalid password for Universal Student Login. Default password is "Password123!".',
      };
    }

    const studentsSnap = await getDocs(collection(db, 'students'));
    if (studentsSnap.empty) {
      return {
        success: false,
        error:
          'No student records exist in the database yet. You can sign in using Universal Student Login (username: "student.universal" / password: "Password123!"), or Academic Admin can upload the student list.',
      };
    }

    const cleanPRN = cleanUsername.toLowerCase();
    const matchedDoc = studentsSnap.docs.find((d) => {
      const data = d.data();
      const prnMatch = String(data.prn || '').trim().toLowerCase() === cleanPRN;
      const usernameMatch = String(data.username || '').trim().toLowerCase() === cleanPRN;
      return prnMatch || usernameMatch;
    });

    if (!matchedDoc) {
      return {
        success: false,
        error: `Student with PRN "${cleanUsername}" was not found in the student master database. Please check your PRN or contact the Academic Cell.`,
      };
    }

    const studentData = matchedDoc.data() as Student;
    const rawName = String(studentData.name || '').trim();
    const firstName = rawName.split(/\s+/)[0].toLowerCase();
    const last3Digits = String(studentData.prn || '').trim().slice(-3);
    const expectedPassword = `${firstName}.${last3Digits}`;

    // Case-insensitive password check
    if (cleanPassword.toLowerCase() !== expectedPassword.toLowerCase()) {
      return {
        success: false,
        error: `Incorrect password for student "${rawName}". Student password format is {firstname}.{last 3 digits of PRN} (e.g., "${expectedPassword}").`,
      };
    }

    return {
      success: true,
      user: {
        id: matchedDoc.id,
        name: studentData.name,
        username: studentData.prn,
        role: 'STUDENT',
        prn: studentData.prn,
        semester: studentData.semester,
        section: studentData.section,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Authentication failed: ${err.message || String(err)}`,
    };
  }
}
