// User & Auth Types
export type UserRole = 'admin' | 'teacher' | 'accountant';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  assignedClasses?: string[];
}

// Student Types
export interface Student {
  id: string;
  studentId: string;
  nameEn: string;
  nameBn: string;
  photoUrl?: string;
  dob: string;
  gender: 'male' | 'female';
  bloodGroup?: string;
  religion: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  shift: 'morning' | 'day' | 'evening';
  roll: number;
  addressPresent: string;
  addressPermanent?: string;
  admissionDate: string;
  status: 'active' | 'inactive' | 'transferred';
  createdAt: string;
  guardian?: Guardian;
  feeStatus?: 'paid' | 'partial' | 'due';
  pendingAmount?: number;
}

export interface Guardian {
  fatherName: string;
  fatherMobile: string;
  fatherOccupation?: string;
  fatherNid?: string;
  motherName: string;
  motherMobile?: string;
  motherOccupation?: string;
  motherNid?: string;
  localGuardianName?: string;
  localGuardianMobile?: string;
  localGuardianRelation?: string;
  emergencyContactName: string;
  emergencyContactMobile: string;
}

// Academic Types
export interface Class {
  id: string;
  name: string;
  order: number;
}

export interface Section {
  id: string;
  name: string;
  classId: string;
}

// Fee Types
export interface FeeHead {
  id: string;
  name: string;
  type: 'one-time' | 'monthly' | 'yearly';
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  studentId: string;
  student?: Student;
  invoiceDate: string;
  dueDate: string;
  month: number;
  year: number;
  subtotal: number;
  discount: number;
  fine: number;
  total: number;
  status: 'paid' | 'partial' | 'unpaid';
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  feeHeadId: string;
  feeHeadName: string;
  amount: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: 'cash' | 'bkash' | 'nagad' | 'bank' | 'card';
  transactionId?: string;
  receivedBy: string;
}

// Attendance Types
export interface AttendanceRecord {
  id: string;
  studentId: string;
  student?: Student;
  date: string;
  status: 'present' | 'absent' | 'late' | 'leave';
  note?: string;
  markedBy: string;
}

// Exam Types
export interface Exam {
  id: string;
  name: string;
  type: 'class-test' | 'mid-term' | 'final' | 'annual';
  startDate: string;
  endDate: string;
  academicYear: string;
  classId: string;
}

export interface ExamSubject {
  id: string;
  examId: string;
  subjectName: string;
  fullMarks: number;
  passMarks: number;
  writtenMarks?: number;
  mcqMarks?: number;
  practicalMarks?: number;
}

export interface Mark {
  id: string;
  examId: string;
  subjectId: string;
  studentId: string;
  written?: number;
  mcq?: number;
  practical?: number;
  total: number;
  letterGrade: string;
  gradePoint: number;
}

// Dashboard Stats
export interface DashboardStats {
  totalStudents: number;
  newAdmissions: number;
  monthlyRevenue: number;
  feeDefaulters: number;
  attendancePercent: number;
  todayPresent: number;
  todayAbsent: number;
  pendingFees: number;
}

// SMS Types
export interface SmsCredit {
  balance: number;
  lastRecharged?: string;
  totalPurchased: number;
}

export interface SmsLog {
  id: string;
  date: string;
  recipient: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  cost: number;
  sentBy: string;
}

// School Settings
export interface SchoolSettings {
  id: string;
  name: string;
  nameBn: string;
  code: string;
  logoUrl?: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  academicYear: string;
  sessionYear: string;
  board: 'nctb' | 'madrasah' | 'cambridge';
}
