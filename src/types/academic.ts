// Academic Management Types

export interface SubjectSelection {
  id: string;
  studentUid: string;
  guardianUid: string;
  schoolId: string;
  subjects: string[];
  status: "pending" | "approved" | "rejected";
  requestDate: any; // Firestore timestamp
  createdAt?: any; // Firestore timestamp (alias for requestDate)
  approvalDate?: any; // Firestore timestamp
  rejectionReason?: string;
  rejectionDate?: any; // Firestore timestamp
  academicYear: string;
  studentName?: string; // Optional student name for display
  grade?: string; // Optional grade for display
  reason?: string; // Optional reason for selection changes
}

export interface TeacherAssignment {
  id: string;
  teacherUid: string;
  studentUid: string;
  subject: string;
  schoolId: string;
  academicYear: string;
  assignedDate: any; // Firestore timestamp
  status: "active" | "inactive" | "transferred";
}

export interface HomeroomAssignment {
  id: string;
  teacherUid: string;
  studentUids: string[];
  schoolId: string;
  academicYear: string;
  grade: string;
  className: string;
  assignedDate: any; // Firestore timestamp
  status: "active" | "inactive";
}

export interface AcademicYear {
  id: string;
  schoolId: string;
  year: string; // e.g., "2025"
  startDate: any; // Firestore timestamp
  endDate: any; // Firestore timestamp
  subjectSelectionDeadline: any; // Firestore timestamp
  status: "upcoming" | "active" | "completed";
  settings: {
    maxStudentsPerSubjectTeacher: number;
    minStudentsPerSubject: number;
    allowMidYearChanges: boolean;
  };
}

export interface SubjectAvailability {
  id: string;
  schoolId: string;
  subject: string;
  teacherUids: string[];
  grades: string[];
  maxStudents: number;
  currentStudents: number;
  status: "available" | "full" | "disabled";
  academicYear: string;
}

export interface SubjectPrerequisite {
  subject: string;
  prerequisites: string[];
  grade: string;
}

// Notification types for academic management
export type AcademicNotificationType =
  | "subject_selection_required"
  | "subject_approval_pending"
  | "subject_approved"
  | "subject_rejected"
  | "teacher_assigned"
  | "homeroom_assigned"
  | "subject_selection_deadline"
  | "teacher_capacity_reached";

export interface AcademicNotification {
  id: string;
  type: AcademicNotificationType;
  recipientUid: string;
  recipientRole: string;
  title: string;
  message: string;
  data: any; // Additional context data
  read: boolean;
  createdAt: any; // Firestore timestamp
  schoolId: string;
}
