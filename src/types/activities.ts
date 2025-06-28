// Enhanced Extracurricular Activities System Types
import { Timestamp } from "firebase/firestore";

// Activity categories
export const ActivityCategory = {
  SPORTS: "sports",
  ACADEMIC: "academic",
  ARTS: "arts",
  MUSIC: "music",
  DRAMA: "drama",
  DEBATE: "debate",
  SCIENCE: "science",
  TECHNOLOGY: "technology",
  COMMUNITY_SERVICE: "community_service",
  LEADERSHIP: "leadership",
  CULTURAL: "cultural",
  CLUBS: "clubs",
  OTHER: "other",
} as const;

export type ActivityCategory =
  (typeof ActivityCategory)[keyof typeof ActivityCategory];

// Activity status
export const ActivityStatus = {
  DRAFT: "draft", // Created but not published
  ACTIVE: "active", // Published and accepting registrations
  FULL: "full", // At capacity, not accepting new registrations
  CLOSED: "closed", // Registration closed, activity ongoing
  COMPLETED: "completed", // Activity finished
  CANCELLED: "cancelled", // Activity cancelled
} as const;

export type ActivityStatus =
  (typeof ActivityStatus)[keyof typeof ActivityStatus];

// Participation status
export const ParticipationStatus = {
  PENDING: "pending", // Waiting for teacher approval
  APPROVED: "approved", // Approved to participate
  REJECTED: "rejected", // Application rejected
  WITHDRAWN: "withdrawn", // Student withdrew
  COMPLETED: "completed", // Successfully completed activity
} as const;

export type ParticipationStatus =
  (typeof ParticipationStatus)[keyof typeof ParticipationStatus];

// Activity difficulty/commitment level
export const ActivityLevel = {
  BEGINNER: "beginner",
  INTERMEDIATE: "intermediate",
  ADVANCED: "advanced",
  COMPETITIVE: "competitive",
} as const;

export type ActivityLevel = (typeof ActivityLevel)[keyof typeof ActivityLevel];

// Meeting frequency
export const MeetingFrequency = {
  DAILY: "daily",
  WEEKLY: "weekly",
  BIWEEKLY: "biweekly",
  MONTHLY: "monthly",
  SEASONAL: "seasonal",
  IRREGULAR: "irregular",
} as const;

export type MeetingFrequency =
  (typeof MeetingFrequency)[keyof typeof MeetingFrequency];

// Base activity interface
export interface Activity {
  id: string;
  title: string;
  description: string;
  category: ActivityCategory;
  level: ActivityLevel;
  status: ActivityStatus;

  // Teacher/organizer info
  teacherId: string;
  teacherName: string;
  coTeachers?: string[]; // Additional teachers/supervisors

  // Capacity and requirements
  maxParticipants: number;
  currentParticipants: number;
  minAge?: number;
  maxAge?: number;
  gradeRestrictions?: string[]; // Specific grades allowed
  prerequisites?: string; // Any requirements

  // Scheduling
  startDate: Timestamp | string;
  endDate: Timestamp | string;
  meetingDays: string[]; // Days of the week
  meetingTime: string;
  duration: number; // Duration in minutes
  frequency: MeetingFrequency;
  location: string;

  // Settings
  requiresApproval: boolean;
  allowWaitlist: boolean;
  isPublic: boolean; // Visible to all students

  // Additional info
  materials?: string; // Required materials/equipment
  cost?: number; // Any fees
  achievements?: string[]; // Potential achievements/awards
  images?: string[]; // Activity photos

  // Metadata
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
  schoolId: string;
}

// Student participation record
export interface ActivityParticipation {
  id: string;
  activityId: string;
  studentId: string;
  studentName: string;
  studentGrade: string;

  // Application info
  applicationDate: Timestamp | string;
  status: ParticipationStatus;
  applicationMessage?: string; // Why they want to join

  // Approval/rejection
  reviewedBy?: string;
  reviewedAt?: Timestamp | string;
  reviewNote?: string;

  // Participation tracking
  attendanceRecord?: AttendanceRecord[];
  participationScore?: number; // 0-100
  achievements?: string[];
  feedback?: string; // Final feedback from teacher

  // Completion
  completedAt?: Timestamp | string;
  certificateIssued?: boolean;
}

// Attendance tracking
export interface AttendanceRecord {
  date: string;
  present: boolean;
  excused?: boolean;
  note?: string;
}

// Activity announcement/update
export interface ActivityAnnouncement {
  id: string;
  activityId: string;
  title: string;
  message: string;
  type: "info" | "reminder" | "change" | "cancellation";
  createdBy: string;
  createdAt: Timestamp | string;
  urgent: boolean;
}

// Activity session/meeting
export interface ActivitySession {
  id: string;
  activityId: string;
  title: string;
  description?: string;
  date: Timestamp | string;
  startTime: string;
  endTime: string;
  location: string;
  topics?: string[];
  materials?: string[];
  homework?: string;
  cancelled?: boolean;
  cancellationReason?: string;
}

// Activity performance metrics
export interface ActivityMetrics {
  activityId: string;
  totalSessions: number;
  averageAttendance: number;
  completionRate: number;
  satisfactionScore: number;
  participantFeedback: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

// Student activity profile
export interface StudentActivityProfile {
  studentId: string;
  currentActivities: ActivityParticipation[];
  completedActivities: ActivityParticipation[];
  totalActivitiesJoined: number;
  totalHoursParticipated: number;
  achievementsEarned: string[];
  preferredCategories: ActivityCategory[];
  lastUpdated: Timestamp | string;
}

// Teacher activity management interface
export interface TeacherActivityPermissions {
  canCreateActivities: boolean;
  maxActivitiesAllowed: number;
  allowedCategories: ActivityCategory[];
  requiresAdminApproval: boolean;
}

// Activity search/filter criteria
export interface ActivitySearchCriteria {
  category?: ActivityCategory;
  level?: ActivityLevel;
  status?: ActivityStatus;
  teacherId?: string;
  availableOnly?: boolean;
  searchTerm?: string;
  startDateRange?: {
    from: Date;
    to: Date;
  };
}

// Activity statistics for reporting
export interface ActivityStatistics {
  totalActivities: number;
  activeActivities: number;
  totalParticipants: number;
  byCategory: Record<ActivityCategory, number>;
  byStatus: Record<ActivityStatus, number>;
  popularActivities: Array<{
    activityId: string;
    title: string;
    participantCount: number;
    waitlistCount: number;
  }>;
  teacherStats: Array<{
    teacherId: string;
    teacherName: string;
    activitiesCount: number;
    totalParticipants: number;
  }>;
}
