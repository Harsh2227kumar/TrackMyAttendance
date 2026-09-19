import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EventRecord, EventAttendance, ReportRow } from '../types/index.ts';

export type ExportFormatType =
  | 'student_wise'
  | 'event_wise'
  | 'semester_wise'
  | 'section_wise'
  | 'faculty_wise'
  | 'event_attendance_sheet'
  | 'student_history';

export function exportReportsToExcel(rows: ReportRow[], format: ExportFormatType, filenamePrefix: string = 'attendance_report') {
  let exportData: Record<string, any>[] = [];

  switch (format) {
    case 'faculty_wise':
      exportData = rows.map((r) => ({
        Faculty: r.faculty_name || 'N/A',
        PRN: r.prn,
        Name: r.student_name,
        Semester: r.semester,
        Section: r.section,
        Subject: r.subject_name || 'N/A',
        Event: r.event_title,
        Date: r.date,
        Time: r.time,
        'Current Attendance %': `${r.current_attendance_percentage}%`,
      }));
      break;

    case 'event_wise':
      exportData = rows.map((r) => ({
        Event: r.event_title,
        Date: r.date,
        Time: r.time,
        Venue: r.venue || 'Main Campus',
        PRN: r.prn,
        Name: r.student_name,
        Semester: r.semester,
        Section: r.section,
        'Current Attendance %': `${r.current_attendance_percentage}%`,
      }));
      break;

    case 'semester_wise':
      exportData = rows.map((r) => ({
        Semester: r.semester,
        PRN: r.prn,
        Name: r.student_name,
        Section: r.section,
        Event: r.event_title,
        Date: r.date,
        Time: r.time,
        'Current Attendance %': `${r.current_attendance_percentage}%`,
      }));
      break;

    case 'section_wise':
      exportData = rows.map((r) => ({
        Section: r.section,
        PRN: r.prn,
        Name: r.student_name,
        Semester: r.semester,
        Event: r.event_title,
        Date: r.date,
        Time: r.time,
        'Current Attendance %': `${r.current_attendance_percentage}%`,
      }));
      break;

    case 'event_attendance_sheet':
      exportData = rows.map((r, i) => ({
        'Sr. No': i + 1,
        PRN: r.prn,
        Semester: r.semester,
        Section: r.section,
        Name: r.student_name,
        'Current Attendance %': `${r.current_attendance_percentage}%`,
        Signature: '',
      }));
      break;

    case 'student_history':
    case 'student_wise':
    default:
      exportData = rows.map((r) => ({
        PRN: r.prn,
        Name: r.student_name,
        Semester: r.semester,
        Section: r.section,
        Event: r.event_title,
        Date: r.date,
        Time: r.time,
        'Current Attendance %': `${r.current_attendance_percentage}%`,
      }));
      break;
  }

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

  const fileName = `${filenamePrefix}_${format}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

// ----------------------------------------------------
// OFFICIAL PRINTABLE EVENT ATTENDANCE PDF
// ----------------------------------------------------
export function generateEventAttendancePDF(event: EventRecord, attendees: EventAttendance[]) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Institution Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SYMBIOSIS INSTITUTE OF TECHNOLOGY', 105, 18, { align: 'center' });
  doc.setFontSize(13);
  doc.text('NAGPUR CAMPUS', 105, 25, { align: 'center' });

  doc.setLineWidth(0.6);
  doc.line(15, 29, 195, 29);

  // Subheader
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL EVENT ATTENDANCE SHEET', 105, 36, { align: 'center' });

  // Event Metadata Box
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 41, 180, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.text('Event Title:', 20, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(event.title, 46, 48);

  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 20, 56);
  doc.setFont('helvetica', 'normal');
  doc.text(event.date, 34, 56);

  doc.setFont('helvetica', 'bold');
  doc.text('Time:', 75, 56);
  doc.setFont('helvetica', 'normal');
  doc.text(`${event.start_time} - ${event.end_time}`, 88, 56);

  doc.setFont('helvetica', 'bold');
  doc.text('Venue:', 138, 56);
  doc.setFont('helvetica', 'normal');
  doc.text(event.venue, 154, 56);

  doc.setFont('helvetica', 'bold');
  doc.text('Organiser:', 20, 63);
  doc.setFont('helvetica', 'normal');
  doc.text(event.organiser_name || 'Event Coordinator', 44, 63);

  doc.setFont('helvetica', 'bold');
  doc.text('Total Attendees:', 138, 63);
  doc.setFont('helvetica', 'normal');
  doc.text(`${attendees.length} Students`, 172, 63);

  // Attendees Table
  const tableData = attendees.map((att, index) => [
    index + 1,
    att.prn,
    att.semester,
    att.section,
    att.student_name,
    `${att.current_attendance_percentage}%`,
    '', // Signature column
  ]);

  autoTable(doc, {
    startY: 72,
    head: [['Sr. No', 'PRN', 'Sem', 'Sec', 'Student Name', 'Current Att. %', 'Signature']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [23, 37, 84], // Dark navy
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 32, fontStyle: 'bold' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 55 },
      5: { cellWidth: 26, halign: 'right' },
      6: { cellWidth: 24 },
    },
    margin: { left: 15, right: 15 },
    didDrawPage: (data) => {
      // Footer page numbering
      const str = `Page ${doc.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(str, 195, 287, { align: 'right' });
    },
  });

  // Signature Block at Bottom
  const finalY = (doc as any).lastAutoTable.finalY + 22;
  const pageHeight = doc.internal.pageSize.height;

  // Add new page if signatures wouldn't fit
  if (finalY > pageHeight - 35) {
    doc.addPage();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Organiser Signature: _______________________', 20, 40);
    doc.text('Faculty Coordinator Signature: _______________________', 110, 40);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Organiser Signature: _______________________', 20, finalY);
    doc.text('Faculty Coordinator Signature: _______________________', 110, finalY);
  }

  doc.save(`SIT_Attendance_${event.title.replace(/\s+/g, '_')}_${event.date}.pdf`);
}

// ----------------------------------------------------
// EXCEL IMPORT VALIDATION PARSER
// ----------------------------------------------------
export interface ExcelImportValidationResult {
  validRecords: Array<{
    prn: string;
    name: string;
    semester: number;
    section: string;
    username: string;
    status: 'active';
  }>;
  duplicatePRNs: Array<{ prn: string; name: string; reason: string }>;
  invalidRecords: Array<{ rowNumber: number; raw: any; reason: string }>;
  totalRead: number;
}

export async function parseAndValidateStudentExcel(
  file: File,
  existingPRNs: Set<string>
): Promise<ExcelImportValidationResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const validRecords: ExcelImportValidationResult['validRecords'] = [];
  const duplicatePRNs: ExcelImportValidationResult['duplicatePRNs'] = [];
  const invalidRecords: ExcelImportValidationResult['invalidRecords'] = [];
  const seenInBatch = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // +1 for header row, 1-indexed

    // Case-insensitive column matching
    const prnKey = Object.keys(row).find((k) => k.trim().toLowerCase() === 'prn');
    const nameKey = Object.keys(row).find((k) => k.trim().toLowerCase() === 'name');
    const semKey = Object.keys(row).find((k) => k.trim().toLowerCase().includes('sem'));
    const secKey = Object.keys(row).find((k) => k.trim().toLowerCase().includes('sec'));

    const rawPRN = prnKey ? String(row[prnKey]).trim() : '';
    const rawName = nameKey ? String(row[nameKey]).trim() : '';
    const rawSem = semKey ? Number(row[semKey]) : NaN;
    const rawSec = secKey ? String(row[secKey]).trim().toUpperCase() : '';

    if (!rawPRN) {
      invalidRecords.push({ rowNumber, raw: row, reason: 'Missing PRN column value' });
      return;
    }

    if (!rawName) {
      invalidRecords.push({ rowNumber, raw: row, reason: 'Missing Student Name' });
      return;
    }

    if (isNaN(rawSem) || rawSem < 1 || rawSem > 8) {
      invalidRecords.push({
        rowNumber,
        raw: row,
        reason: `Invalid Semester (${semKey ? row[semKey] : 'Empty'}) - Must be 1 to 8`,
      });
      return;
    }

    if (!rawSec) {
      invalidRecords.push({ rowNumber, raw: row, reason: 'Missing Section (e.g., A, B, C)' });
      return;
    }

    // Check duplicate in existing database
    if (existingPRNs.has(rawPRN)) {
      duplicatePRNs.push({ prn: rawPRN, name: rawName, reason: 'PRN already exists in database' });
      return;
    }

    // Check duplicate within the same uploaded file
    if (seenInBatch.has(rawPRN)) {
      duplicatePRNs.push({ prn: rawPRN, name: rawName, reason: 'Duplicate PRN within uploaded spreadsheet' });
      return;
    }

    seenInBatch.add(rawPRN);
    validRecords.push({
      prn: rawPRN,
      name: rawName,
      semester: rawSem,
      section: rawSec,
      username: rawName.toLowerCase().replace(/\s+/g, '.'),
      status: 'active',
    });
  });

  return {
    validRecords,
    duplicatePRNs,
    invalidRecords,
    totalRead: rows.length,
  };
}

// ----------------------------------------------------
// FACULTY EXCEL IMPORT VALIDATION PARSER
// ----------------------------------------------------
export interface FacultyImportValidationResult {
  validRecords: Array<{
    name: string;
    department: string;
    status: 'active';
  }>;
  duplicateNames: Array<{ name: string; department: string; reason: string }>;
  invalidRecords: Array<{ rowNumber: number; raw: any; reason: string }>;
  totalRead: number;
}

export async function parseAndValidateFacultyExcel(
  file: File,
  existingNames: Set<string>
): Promise<FacultyImportValidationResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const validRecords: FacultyImportValidationResult['validRecords'] = [];
  const duplicateNames: FacultyImportValidationResult['duplicateNames'] = [];
  const invalidRecords: FacultyImportValidationResult['invalidRecords'] = [];
  const seenInBatch = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    const nameKey = Object.keys(row).find((k) => {
      const l = k.trim().toLowerCase();
      return l.includes('name') || l.includes('faculty') || l.includes('professor') || l.includes('teacher');
    });

    const deptKey = Object.keys(row).find((k) => {
      const l = k.trim().toLowerCase();
      return l.includes('dept') || l.includes('department') || l.includes('branch');
    });

    const rawName = nameKey ? String(row[nameKey]).trim() : '';
    const rawDept = deptKey ? String(row[deptKey]).trim() : 'Computer Science & Engineering';

    if (!rawName) {
      invalidRecords.push({ rowNumber, raw: row, reason: 'Missing Faculty Name column' });
      return;
    }

    const cleanLower = rawName.toLowerCase();

    if (existingNames.has(cleanLower)) {
      duplicateNames.push({ name: rawName, department: rawDept, reason: 'Faculty already exists in database' });
      return;
    }

    if (seenInBatch.has(cleanLower)) {
      duplicateNames.push({ name: rawName, department: rawDept, reason: 'Duplicate faculty name in this file' });
      return;
    }

    seenInBatch.add(cleanLower);
    validRecords.push({
      name: rawName,
      department: rawDept || 'Computer Science & Engineering',
      status: 'active',
    });
  });

  return {
    validRecords,
    duplicateNames,
    invalidRecords,
    totalRead: rows.length,
  };
}

// ----------------------------------------------------
// SAMPLE TEMPLATE DOWNLOADERS
// ----------------------------------------------------
export function downloadStudentExcelTemplate() {
  const sampleData = [
    { PRN: '24070521001', Name: 'Aditya Kumar', Semester: 5, Section: 'A' },
    { PRN: '24070521002', Name: 'Sneha Deshmukh', Semester: 5, Section: 'A' },
    { PRN: '24070521003', Name: 'Rohan Sharma', Semester: 5, Section: 'B' },
  ];
  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students_Master');
  XLSX.writeFile(wb, 'SIT_Student_Master_Template.xlsx');
}

export function downloadFacultyExcelTemplate() {
  const sampleData = [
    { 'Faculty Name': 'Dr. Snehalata Wankhade', Department: 'Computer Science & Engineering' },
    { 'Faculty Name': 'Dr. Ketan Kotecha', Department: 'Computer Science & Engineering' },
    { 'Faculty Name': 'Dr. Preeti Mulay', Department: 'Information Technology' },
  ];
  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Faculty_Master');
  XLSX.writeFile(wb, 'SIT_Faculty_Master_Template.xlsx');
}
