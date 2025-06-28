// Enhanced Awards and Achievements System Types
import { Timestamp } from "firebase/firestore";

// Achievement triggers for auto-unlock
export const AchievementTrigger = {
  MARK_ADDED: "mark_added",
  AWARD_RECEIVED: "award_received",
  ATTENDANCE_MARKED: "attendance_marked",
  ACTIVITY_JOINED: "activity_joined",
  BEHAVIOR_IMPROVED: "behavior_improved",
  WEEKLY_CHECK: "weekly_check",
  MONTHLY_CHECK: "monthly_check",
} as const;

export type AchievementTrigger =
  (typeof AchievementTrigger)[keyof typeof AchievementTrigger];

// Achievement criteria for auto-unlock
export interface AchievementCriteria {
  // Grade-based criteria
  minGradeAverage?: number;
  minSubjectGrade?: Record<string, number>;

  // Attendance criteria
  minAttendanceRate?: number;
  minDaysPresent?: number;

  // Awards criteria
  minAwardsReceived?: number;

  // Behavior criteria
  minBehaviorScore?: number;

  // Activity criteria
  minActivitiesParticipated?: number;

  // Leadership criteria
  minLeadershipRoles?: number;

  // Community service criteria
  minCommunityServiceHours?: number;

  // Improvement criteria
  minImprovementScore?: number;

  // Streak criteria
  minStreakDays?: number;

  // Triggers for checking this achievement
  triggers?: AchievementTrigger[];

  // Custom criteria (extensible)
  customCriteria?: Record<string, any>;
}

export interface AwardTemplate {
  id: string;
  title: string;
  description: string;
  category: AwardCategory;
  criteria?: string;
  icon?: string;
  color?: string;
  points?: number; // Point value for this award
  isActive: boolean;
  isAchievement?: boolean; // True for auto-unlock achievements
  achievementCriteria?: AchievementCriteria; // Only for achievements
  createdBy: string;
  createdAt: Timestamp | string;
  updatedAt?: Timestamp | string;
  updatedBy?: string;
  schoolId: string;
}

export interface AssignedAward {
  id: string;
  templateId: string;
  studentId: string;
  studentName?: string;
  assignedBy: string;
  assignedByName?: string;
  assignedAt: Timestamp | string;
  reason: string;
  evidence?: string; // Optional evidence/justification
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Timestamp | string;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: Timestamp | string;
  rejectionReason?: string;
  status: AwardStatus;
  // Template data cached for performance
  title: string;
  description: string;
  category: AwardCategory;
  icon?: string;
  color?: string;
  points?: number;
}

export interface Achievement {
  id: string;
  templateId: string;
  studentId: string;
  title: string;
  description: string;
  icon?: string;
  category: AwardCategory;
  points: number;
  unlocked: boolean;
  unlockedAt: Timestamp | string;
  progress: number; // Current progress (0-100)
  maxProgress: number; // Max progress (usually 100)
}

// Legacy types for backward compatibility
export interface UnlockedAchievement {
  id: string;
  achievementId: string;
  studentId: string;
  unlockedAt: string;
  progress?: number; // For progressive achievements
  // Achievement data cached
  title: string;
  description: string;
  type: AchievementType;
  icon?: string;
  color?: string;
  points: number;
}

export const AwardCategory = {
  ACADEMIC: "academic",
  SPORTS: "sports",
  LEADERSHIP: "leadership",
  COMMUNITY_SERVICE: "community_service",
  ATTENDANCE: "attendance",
  BEHAVIOR: "behavior",
  CREATIVITY: "creativity",
  TEAMWORK: "teamwork",
  IMPROVEMENT: "improvement",
  OTHER: "other",
} as const;

export type AwardCategory = (typeof AwardCategory)[keyof typeof AwardCategory];

export const AwardStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type AwardStatus = (typeof AwardStatus)[keyof typeof AwardStatus];

export const AchievementType = {
  MARKS_BASED: "marks_based", // Based on academic performance
  ATTENDANCE_BASED: "attendance_based", // Based on attendance
  AWARDS_BASED: "awards_based", // Based on number of awards
  BEHAVIOR_BASED: "behavior_based", // Based on demerit points
  PARTICIPATION_BASED: "participation_based", // Based on activities
  CUSTOM: "custom", // Custom criteria
} as const;

export type AchievementType =
  (typeof AchievementType)[keyof typeof AchievementType];

export interface StudentAwardsProfile {
  studentId: string;
  totalPoints: number;
  assignedAwards: AssignedAward[];
  unlockedAchievements: UnlockedAchievement[];
  lastUpdated: string;
}

// Statistics and reporting types
export interface AwardStatistics {
  totalAwarded: number;
  byCategory: Record<AwardCategory, number>;
  byMonth: Record<string, number>;
  topStudents: Array<{
    studentId: string;
    studentName: string;
    totalPoints: number;
    awardCount: number;
  }>;
}

export interface TeacherAwardPermissions {
  canAssignAwards: boolean;
  allowedCategories: AwardCategory[];
  requiresApproval: boolean;
  maxPointsPerAward: number;
}
