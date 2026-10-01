import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EventRecord, EventAttendance, ReportRow } from '../types/index.ts';
import { formatDateDMY } from './dateUtils.ts';

export { formatDateDMY };

export type ExportFormatType =
  | 'student_wise'
  | 'event_wise'
  | 'semester_wise'
  | 'section_wise'
  | 'faculty_wise'
  | 'attendance_requests_wise'
  | 'event_attendance_sheet'
  | 'student_history';

function formatAttendancePercentage(pct?: number | null): string {
  if (pct === null || pct === undefined || isNaN(Number(pct))) {
    return 'Not Entered';
  }
  return `${pct}%`;
}

export function exportReportsToExcel(rows: ReportRow[], format: ExportFormatType, filenamePrefix: string = 'attendance_report') {
  let exportData: Record<string, any>[] = [];

  switch (format) {
    case 'attendance_requests_wise':
      exportData = rows.map((r, i) => ({
        'Sr. No': i + 1,
        PRN: r.prn,
        'Student Name': r.student_name,
        Semester: r.semester,
        Section: r.section,
        'Request Status': (r.request_status || 'N/A').toUpperCase(),
        Date: formatDateDMY(r.date),
        Time: r.time,
        Subject: r.subject_name || 'N/A',
        Faculty: r.faculty_name || 'N/A',
        'Event / Activity': r.event_title,
        'Student Reason': r.request_reason || 'N/A',
        'Admin Comment': r.admin_comment || 'N/A',
        'Current Attendance %': formatAttendancePercentage(r.current_attendance_percentage),
      }));
      break;

    case 'faculty_wise':
      exportData = rows.map((r) => ({
        Faculty: r.faculty_name || 'N/A',
        PRN: r.prn,
        Name: r.student_name,
        Semester: r.semester,
        Section: r.section,
        Subject: r.subject_name || 'N/A',
        Event: r.event_title,
        Date: formatDateDMY(r.date),
        Time: r.time,
        'Request Status': r.request_status && r.request_status !== 'none' ? r.request_status.toUpperCase() : 'Standard',
        'Current Attendance %': formatAttendancePercentage(r.current_attendance_percentage),
      }));
      break;

    case 'event_wise':
      exportData = rows.map((r) => ({
        Event: r.event_title,
        Date: formatDateDMY(r.date),
        Time: r.time,
        Venue: r.venue || 'Main Campus',
        PRN: r.prn,
        Name: r.student_name,
        Semester: r.semester,
        Section: r.section,
        'Request Status': r.request_status && r.request_status !== 'none' ? r.request_status.toUpperCase() : 'Standard',
        'Current Attendance %': formatAttendancePercentage(r.current_attendance_percentage),
      }));
      break;

    case 'semester_wise':
      exportData = rows.map((r) => ({
        Semester: r.semester,
        PRN: r.prn,
        Name: r.student_name,
        Section: r.section,
        Event: r.event_title,
        Date: formatDateDMY(r.date),
        Time: r.time,
        'Request Status': r.request_status && r.request_status !== 'none' ? r.request_status.toUpperCase() : 'Standard',
        'Current Attendance %': formatAttendancePercentage(r.current_attendance_percentage),
      }));
      break;

    case 'section_wise':
      exportData = rows.map((r) => ({
        Section: r.section,
        PRN: r.prn,
        Name: r.student_name,
        Semester: r.semester,
        Event: r.event_title,
        Date: formatDateDMY(r.date),
        Time: r.time,
        'Request Status': r.request_status && r.request_status !== 'none' ? r.request_status.toUpperCase() : 'Standard',
        'Current Attendance %': formatAttendancePercentage(r.current_attendance_percentage),
      }));
      break;

    case 'event_attendance_sheet':
      exportData = rows.map((r, i) => ({
        'Sr. No': i + 1,
        PRN: r.prn,
        Semester: r.semester,
        Section: r.section,
        Name: r.student_name,
        'Request Status': r.request_status && r.request_status !== 'none' ? r.request_status.toUpperCase() : 'Standard',
        'Current Attendance %': formatAttendancePercentage(r.current_attendance_percentage),
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
        Date: formatDateDMY(r.date),
        Time: r.time,
        Subject: r.subject_name || 'N/A',
        Faculty: r.faculty_name || 'N/A',
        'Request Status': r.request_status && r.request_status !== 'none' ? r.request_status.toUpperCase() : 'Standard',
        'Current Attendance %': formatAttendancePercentage(r.current_attendance_percentage),
      }));
      break;
  }

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

  const fileName = `${filenamePrefix}_${format}_${formatDateDMY(new Date())}.xlsx`;
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
  doc.text(formatDateDMY(event.date), 34, 56);

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
    formatAttendancePercentage(att.current_attendance_percentage),
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

  doc.save(`SIT_Attendance_${event.title.replace(/\s+/g, '_')}_${formatDateDMY(event.date)}.pdf`);
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

export interface StudentImportRecord {
  prn: string;
  name: string;
  semester: number;
  section: string;
  username: string;
  status: 'active';
  sourceFile?: string;
  rowNumber?: number;
}

export interface MultiFileSummary {
  name: string;
  size: number;
  totalRows: number;
  validCount: number;
  existingCount: number;
  duplicateCount: number;
  invalidCount: number;
}

export interface MultiStudentImportValidationResult {
  filesSummary: MultiFileSummary[];
  validRecords: StudentImportRecord[];
  existingInDbRecords: Array<{
    prn: string;
    name: string;
    semester: number;
    section: string;
    sourceFile?: string;
    reason: string;
    record: StudentImportRecord;
  }>;
  duplicateWithinBatch: Array<{
    prn: string;
    name: string;
    sourceFile?: string;
    reason: string;
  }>;
  invalidRecords: Array<{
    rowNumber: number;
    sourceFile?: string;
    raw: any;
    reason: string;
  }>;
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
// MULTI-FILE BULK STUDENT EXCEL/CSV PARSER
// ----------------------------------------------------
export async function parseAndValidateMultipleStudentFiles(
  files: File[],
  existingPRNs: Set<string>
): Promise<MultiStudentImportValidationResult> {
  const filesSummary: MultiFileSummary[] = [];
  const validRecords: StudentImportRecord[] = [];
  const existingInDbRecords: MultiStudentImportValidationResult['existingInDbRecords'] = [];
  const duplicateWithinBatch: MultiStudentImportValidationResult['duplicateWithinBatch'] = [];
  const invalidRecords: MultiStudentImportValidationResult['invalidRecords'] = [];
  const seenInBatch = new Set<string>();

  // Normalize existing PRN lookup for case-insensitivity
  const lowerExistingPRNs = new Set(Array.from(existingPRNs).map((p) => p.trim().toLowerCase()));

  let grandTotalRead = 0;

  for (const file of files) {
    let fileValid = 0;
    let fileExisting = 0;
    let fileDuplicate = 0;
    let fileInvalid = 0;
    let fileRowsCount = 0;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      fileRowsCount = rows.length;
      grandTotalRead += rows.length;

      rows.forEach((row, index) => {
        const rowNumber = index + 2;

        const prnKey = Object.keys(row).find((k) => {
          const l = k.trim().toLowerCase();
          return l === 'prn' || l.includes('roll') || l.includes('student_id') || l.includes('reg');
        });
        const nameKey = Object.keys(row).find((k) => {
          const l = k.trim().toLowerCase();
          return l === 'name' || l.includes('student name') || l.includes('full name');
        });
        const semKey = Object.keys(row).find((k) => {
          const l = k.trim().toLowerCase();
          return l.includes('sem');
        });
        const secKey = Object.keys(row).find((k) => {
          const l = k.trim().toLowerCase();
          return l.includes('sec') || l.includes('division') || l.includes('class');
        });

        const rawPRN = prnKey ? String(row[prnKey]).trim() : '';
        const rawName = nameKey ? String(row[nameKey]).trim() : '';
        const rawSem = semKey ? Number(row[semKey]) : NaN;
        const rawSec = secKey ? String(row[secKey]).trim().toUpperCase() : '';

        if (!rawPRN) {
          fileInvalid++;
          invalidRecords.push({
            rowNumber,
            sourceFile: file.name,
            raw: row,
            reason: 'Missing PRN column value',
          });
          return;
        }

        if (!rawName) {
          fileInvalid++;
          invalidRecords.push({
            rowNumber,
            sourceFile: file.name,
            raw: row,
            reason: 'Missing Student Name',
          });
          return;
        }

        if (isNaN(rawSem) || rawSem < 1 || rawSem > 8) {
          fileInvalid++;
          invalidRecords.push({
            rowNumber,
            sourceFile: file.name,
            raw: row,
            reason: `Invalid Semester (${semKey ? row[semKey] : 'Empty'}) - Must be 1 to 8`,
          });
          return;
        }

        if (!rawSec) {
          fileInvalid++;
          invalidRecords.push({
            rowNumber,
            sourceFile: file.name,
            raw: row,
            reason: 'Missing Section (e.g., A, B, C)',
          });
          return;
        }

        const studentRec: StudentImportRecord = {
          prn: rawPRN,
          name: rawName,
          semester: rawSem,
          section: rawSec,
          username: rawName.toLowerCase().replace(/\s+/g, '.'),
          status: 'active',
          sourceFile: file.name,
          rowNumber,
        };

        const prnLower = rawPRN.toLowerCase();

        // 1. Check duplicate within current multi-file batch
        if (seenInBatch.has(prnLower)) {
          fileDuplicate++;
          duplicateWithinBatch.push({
            prn: rawPRN,
            name: rawName,
            sourceFile: file.name,
            reason: `Duplicate PRN in batch (already encountered in this or previous file)`,
          });
          return;
        }

        seenInBatch.add(prnLower);

        // 2. Check if student already exists in the Firestore database
        if (lowerExistingPRNs.has(prnLower)) {
          fileExisting++;
          existingInDbRecords.push({
            prn: rawPRN,
            name: rawName,
            semester: rawSem,
            section: rawSec,
            sourceFile: file.name,
            reason: 'PRN already exists in database',
            record: studentRec,
          });
          return;
        }

        // 3. Brand new valid record ready for import
        fileValid++;
        validRecords.push(studentRec);
      });
    } catch (err: any) {
      fileInvalid++;
      invalidRecords.push({
        rowNumber: 1,
        sourceFile: file.name,
        raw: null,
        reason: `Failed to parse file: ${err?.message || 'Unsupported format'}`,
      });
    }

    filesSummary.push({
      name: file.name,
      size: file.size,
      totalRows: fileRowsCount,
      validCount: fileValid,
      existingCount: fileExisting,
      duplicateCount: fileDuplicate,
      invalidCount: fileInvalid,
    });
  }

  return {
    filesSummary,
    validRecords,
    existingInDbRecords,
    duplicateWithinBatch,
    invalidRecords,
    totalRead: grandTotalRead,
  };
}

// ----------------------------------------------------
// BULK RAW TEXT / COPY-PASTE TABULAR DATA PARSER
// ----------------------------------------------------
export function parseAndValidateStudentRawText(
  rawText: string,
  existingPRNs: Set<string>,
  defaultSemester: number = 5,
  defaultSection: string = 'A'
): MultiStudentImportValidationResult {
  const validRecords: StudentImportRecord[] = [];
  const existingInDbRecords: MultiStudentImportValidationResult['existingInDbRecords'] = [];
  const duplicateWithinBatch: MultiStudentImportValidationResult['duplicateWithinBatch'] = [];
  const invalidRecords: MultiStudentImportValidationResult['invalidRecords'] = [];
  const seenInBatch = new Set<string>();

  const lowerExistingPRNs = new Set(Array.from(existingPRNs).map((p) => p.trim().toLowerCase()));

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  let colMap = { prnIdx: 0, nameIdx: 1, semIdx: 2, secIdx: 3, hasHeader: false };

  // Detect header in first line if present
  if (lines.length > 0) {
    const firstLineLower = lines[0].toLowerCase();
    if (
      firstLineLower.includes('prn') ||
      firstLineLower.includes('student') ||
      firstLineLower.includes('name') ||
      firstLineLower.includes('semester')
    ) {
      // Determine delimiter of header line
      let headerDelim = '\t';
      if (firstLineLower.includes('\t')) headerDelim = '\t';
      else if (firstLineLower.includes(',')) headerDelim = ',';
      else if (firstLineLower.includes(';')) headerDelim = ';';
      else if (firstLineLower.includes('|')) headerDelim = '|';

      const hCols = lines[0].split(headerDelim).map((c) => c.trim().toLowerCase());
      const pIdx = hCols.findIndex((c) => c === 'prn' || c.includes('roll') || c.includes('id'));
      const nIdx = hCols.findIndex((c) => c === 'name' || c.includes('student'));
      const sIdx = hCols.findIndex((c) => c.includes('sem'));
      const cIdx = hCols.findIndex((c) => c.includes('sec') || c.includes('div'));

      if (pIdx !== -1 && nIdx !== -1) {
        colMap = {
          prnIdx: pIdx,
          nameIdx: nIdx,
          semIdx: sIdx !== -1 ? sIdx : 2,
          secIdx: cIdx !== -1 ? cIdx : 3,
          hasHeader: true,
        };
      } else {
        colMap.hasHeader = true;
      }
    }
  }

  const dataLines = colMap.hasHeader ? lines.slice(1) : lines;

  dataLines.forEach((line, idx) => {
    const rowNumber = (colMap.hasHeader ? idx + 2 : idx + 1);

    // Delimiter detection
    let delim = '\t';
    if (line.includes('\t')) delim = '\t';
    else if (line.includes(',')) delim = ',';
    else if (line.includes(';')) delim = ';';
    else if (line.includes('|')) delim = '|';
    else delim = ' ';

    let rawTokens: string[] = [];
    if (delim === ' ') {
      // Multiple spaces collapsed
      rawTokens = line.split(/\s+/).map((t) => t.trim());
    } else {
      rawTokens = line.split(delim).map((t) => t.trim().replace(/^["']|["']$/g, ''));
    }

    if (rawTokens.length === 0 || (rawTokens.length === 1 && !rawTokens[0])) {
      return;
    }

    let rawPRN = '';
    let rawName = '';
    let rawSem = defaultSemester;
    let rawSec = defaultSection;

    if (rawTokens.length >= 4) {
      rawPRN = rawTokens[colMap.prnIdx] || rawTokens[0] || '';
      rawName = rawTokens[colMap.nameIdx] || rawTokens[1] || '';
      const semVal = Number(rawTokens[colMap.semIdx] || rawTokens[2]);
      rawSem = !isNaN(semVal) ? semVal : defaultSemester;
      rawSec = (rawTokens[colMap.secIdx] || rawTokens[3] || defaultSection).toUpperCase();
    } else if (rawTokens.length === 3) {
      rawPRN = rawTokens[0] || '';
      rawName = rawTokens[1] || '';
      const semVal = Number(rawTokens[2]);
      rawSem = !isNaN(semVal) ? semVal : defaultSemester;
      rawSec = defaultSection;
    } else if (rawTokens.length === 2) {
      rawPRN = rawTokens[0] || '';
      rawName = rawTokens[1] || '';
      rawSem = defaultSemester;
      rawSec = defaultSection;
    } else {
      invalidRecords.push({
        rowNumber,
        sourceFile: 'Direct Paste / Text',
        raw: line,
        reason: 'Insufficient columns (Expected at least PRN and Student Name)',
      });
      return;
    }

    if (!rawPRN || rawPRN.length < 3) {
      invalidRecords.push({
        rowNumber,
        sourceFile: 'Direct Paste / Text',
        raw: line,
        reason: 'Invalid or missing PRN',
      });
      return;
    }

    if (!rawName || rawName.length < 2) {
      invalidRecords.push({
        rowNumber,
        sourceFile: 'Direct Paste / Text',
        raw: line,
        reason: 'Invalid or missing Student Name',
      });
      return;
    }

    if (isNaN(rawSem) || rawSem < 1 || rawSem > 8) {
      invalidRecords.push({
        rowNumber,
        sourceFile: 'Direct Paste / Text',
        raw: line,
        reason: `Invalid Semester: ${rawSem} (Must be between 1 and 8)`,
      });
      return;
    }

    if (!rawSec) {
      rawSec = defaultSection;
    }

    const prnLower = rawPRN.toLowerCase();
    const studentRec: StudentImportRecord = {
      prn: rawPRN,
      name: rawName,
      semester: rawSem,
      section: rawSec,
      username: rawName.toLowerCase().replace(/\s+/g, '.'),
      status: 'active',
      sourceFile: 'Direct Paste / Text',
      rowNumber,
    };

    if (seenInBatch.has(prnLower)) {
      duplicateWithinBatch.push({
        prn: rawPRN,
        name: rawName,
        sourceFile: 'Direct Paste / Text',
        reason: 'Duplicate PRN within pasted text',
      });
      return;
    }

    seenInBatch.add(prnLower);

    if (lowerExistingPRNs.has(prnLower)) {
      existingInDbRecords.push({
        prn: rawPRN,
        name: rawName,
        semester: rawSem,
        section: rawSec,
        sourceFile: 'Direct Paste / Text',
        reason: 'PRN already exists in database',
        record: studentRec,
      });
      return;
    }

    validRecords.push(studentRec);
  });

  return {
    filesSummary: [
      {
        name: 'Direct Paste / Tabular Text',
        size: new Blob([rawText]).size,
        totalRows: lines.length,
        validCount: validRecords.length,
        existingCount: existingInDbRecords.length,
        duplicateCount: duplicateWithinBatch.length,
        invalidCount: invalidRecords.length,
      },
    ],
    validRecords,
    existingInDbRecords,
    duplicateWithinBatch,
    invalidRecords,
    totalRead: lines.length,
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
