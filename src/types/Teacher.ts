export type TeacherNote = { text: string; date: string };

export type SubjectGradeAssignment = {
  subject: string;
  grades: string[];
};

export type Teacher = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subjects: string[];
  classes: string[];
  tags?: string[];
  experienceYears?: number;
  qualifications?: string[];
  notes?: TeacherNote[];
  awards?: string[];
  schedule?: { day: string; period: string; class: string }[];
  feedback?: { from: string; text: string; date: string }[];
  language?: string;
  // Grade assignment fields
  assignedGrades?: string[]; // For backward compatibility
  subjectGradeAssignments?: SubjectGradeAssignment[]; // New granular assignment
  homeroomClass?: string;
  schoolId?: string;
};
