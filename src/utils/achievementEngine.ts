import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import type {
  Achievement,
  AwardTemplate,
  AchievementCriteria,
} from "../types/awards";
import { AchievementTrigger } from "../types/awards";
import { getFunctions, httpsCallable } from "firebase/functions";

// Log achievement unlock for audit purposes
const logAchievementUnlock = httpsCallable(
  getFunctions(),
  "logAchievementUnlock"
);

export interface StudentProgress {
  studentId: string;
  totalMarks: number;
  averageGrade: number;
  subjectGrades: Record<string, number>;
  attendanceRate: number;
  daysPresent: number;
  totalDays: number;
  awardsReceived: number;
  behaviorScore: number;
  activitiesParticipated: number;
  leadershipRoles: number;
  communityServiceHours: number;
  improvementScore: number;
  streakDays: number;
}

export class AchievementEngine {
  /**
   * Check and unlock achievements for a student based on their progress
   */
  static async checkAndUnlockAchievements(studentId: string): Promise<void> {
    try {
      // Get student progress data
      const progress = await this.getStudentProgress(studentId);

      // Get all achievement templates
      const achievementTemplates = await this.getAchievementTemplates();

      // Get already unlocked achievements for this student
      const unlockedAchievements = await this.getUnlockedAchievements(
        studentId
      );
      const unlockedIds = unlockedAchievements.map((a) => a.templateId);

      // Check each template to see if criteria are met
      for (const template of achievementTemplates) {
        if (unlockedIds.includes(template.id)) continue; // Already unlocked

        if (await this.checkCriteriaMet(template.criteria, progress)) {
          await this.unlockAchievement(studentId, template);
        }
      }
    } catch (error) {
      console.error("Error checking achievements:", error);
    }
  }

  /**
   * Get comprehensive student progress data
   */
  private static async getStudentProgress(
    studentId: string
  ): Promise<StudentProgress> {
    try {
      // Get marks
      const marksQuery = query(
        collection(db, "marks"),
        where("studentId", "==", studentId)
      );
      const marksSnapshot = await getDocs(marksQuery);
      const marks = marksSnapshot.docs.map((doc) => doc.data());

      // Get awards
      const awardsQuery = query(
        collection(db, "assignedAwards"),
        where("studentId", "==", studentId),
        where("status", "==", "approved")
      );
      const awardsSnapshot = await getDocs(awardsQuery);
      const awards = awardsSnapshot.docs.map((doc) => doc.data());

      // Get attendance (if available)
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("studentId", "==", studentId)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const attendanceRecords = attendanceSnapshot.docs.map((doc) =>
        doc.data()
      );

      // Calculate progress metrics
      const totalMarks = marks.length;
      const averageGrade =
        marks.length > 0
          ? marks.reduce(
              (sum, mark) => sum + (mark.score / mark.total) * 100,
              0
            ) / marks.length
          : 0;

      const subjectGrades: Record<string, number[]> = {};
      marks.forEach((mark) => {
        if (!subjectGrades[mark.subject]) {
          subjectGrades[mark.subject] = [];
        }
        subjectGrades[mark.subject].push((mark.score / mark.total) * 100);
      });

      // Calculate subject averages
      const finalSubjectGrades: Record<string, number> = {};
      Object.keys(subjectGrades).forEach((subject) => {
        const grades = subjectGrades[subject];
        finalSubjectGrades[subject] =
          grades.reduce((sum: number, grade: number) => sum + grade, 0) /
          grades.length;
      });

      const daysPresent = attendanceRecords.filter(
        (record) => record.present
      ).length;
      const totalDays = attendanceRecords.length;
      const attendanceRate =
        totalDays > 0 ? (daysPresent / totalDays) * 100 : 100;

      return {
        studentId,
        totalMarks,
        averageGrade,
        subjectGrades: finalSubjectGrades,
        attendanceRate,
        daysPresent,
        totalDays,
        awardsReceived: awards.length,
        behaviorScore: 100, // Default, could be calculated from demerits
        activitiesParticipated: 0, // Would need activities data
        leadershipRoles: 0, // Would need leadership data
        communityServiceHours: 0, // Would need service data
        improvementScore: 0, // Would need historical comparison
        streakDays: 0, // Would need daily tracking
      };
    } catch (error) {
      console.error("Error getting student progress:", error);
      throw error;
    }
  }

  /**
   * Get all achievement templates
   */
  private static async getAchievementTemplates(): Promise<
    (AwardTemplate & { criteria: AchievementCriteria })[]
  > {
    try {
      const q = query(
        collection(db, "awardTemplates"),
        where("isAchievement", "==", true)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as (AwardTemplate & { criteria: AchievementCriteria })[];
    } catch (error) {
      console.error("Error fetching achievement templates:", error);
      return [];
    }
  }

  /**
   * Get unlocked achievements for a student
   */
  private static async getUnlockedAchievements(
    studentId: string
  ): Promise<Achievement[]> {
    try {
      const q = query(
        collection(db, "achievements"),
        where("studentId", "==", studentId),
        where("unlocked", "==", true)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Achievement[];
    } catch (error) {
      console.error("Error fetching unlocked achievements:", error);
      return [];
    }
  }

  /**
   * Check if achievement criteria are met
   */
  private static async checkCriteriaMet(
    criteria: AchievementCriteria,
    progress: StudentProgress
  ): Promise<boolean> {
    try {
      // Grade-based criteria
      if (
        criteria.minGradeAverage &&
        progress.averageGrade < criteria.minGradeAverage
      ) {
        return false;
      }

      if (criteria.minSubjectGrade) {
        for (const [subject, minGrade] of Object.entries(
          criteria.minSubjectGrade
        )) {
          if (
            !progress.subjectGrades[subject] ||
            progress.subjectGrades[subject] < minGrade
          ) {
            return false;
          }
        }
      }

      // Attendance criteria
      if (
        criteria.minAttendanceRate &&
        progress.attendanceRate < criteria.minAttendanceRate
      ) {
        return false;
      }

      if (
        criteria.minDaysPresent &&
        progress.daysPresent < criteria.minDaysPresent
      ) {
        return false;
      }

      // Awards criteria
      if (
        criteria.minAwardsReceived &&
        progress.awardsReceived < criteria.minAwardsReceived
      ) {
        return false;
      }

      // Behavior criteria
      if (
        criteria.minBehaviorScore &&
        progress.behaviorScore < criteria.minBehaviorScore
      ) {
        return false;
      }

      // Activity criteria
      if (
        criteria.minActivitiesParticipated &&
        progress.activitiesParticipated < criteria.minActivitiesParticipated
      ) {
        return false;
      }

      // Leadership criteria
      if (
        criteria.minLeadershipRoles &&
        progress.leadershipRoles < criteria.minLeadershipRoles
      ) {
        return false;
      }

      // Community service criteria
      if (
        criteria.minCommunityServiceHours &&
        progress.communityServiceHours < criteria.minCommunityServiceHours
      ) {
        return false;
      }

      // Improvement criteria
      if (
        criteria.minImprovementScore &&
        progress.improvementScore < criteria.minImprovementScore
      ) {
        return false;
      }

      // Streak criteria
      if (
        criteria.minStreakDays &&
        progress.streakDays < criteria.minStreakDays
      ) {
        return false;
      }

      // Custom criteria (could be extended)
      if (criteria.customCriteria) {
        // This would need to be implemented based on specific requirements
        // For now, assume it's met
      }

      return true;
    } catch (error) {
      console.error("Error checking criteria:", error);
      return false;
    }
  }

  /**
   * Unlock an achievement for a student
   */
  private static async unlockAchievement(
    studentId: string,
    template: AwardTemplate & { criteria: AchievementCriteria }
  ): Promise<void> {
    try {
      const achievement: Omit<Achievement, "id"> = {
        studentId,
        templateId: template.id,
        title: template.title,
        description: template.description,
        icon: template.icon,
        category: template.category,
        points: template.points || 0,
        unlocked: true,
        unlockedAt: Timestamp.now(),
        progress: 100,
        maxProgress: 100,
      };

      const docRef = await addDoc(collection(db, "achievements"), achievement);

      // Log the achievement unlock for audit purposes
      try {
        await logAchievementUnlock({
          achievementId: docRef.id,
          studentId,
          templateId: template.id,
          title: template.title,
          points: template.points,
          unlockedAt: achievement.unlockedAt,
          unlockedBy: "system", // Auto-unlocked by system
          auditInfo: {
            action: "achievement_unlocked",
            userId: studentId,
            userRole: "student",
            timestamp: Timestamp.now(),
            details: {
              achievementTitle: template.title,
              category: template.category,
              points: template.points,
              autoUnlocked: true,
            },
          },
        });
      } catch (auditError) {
        console.error("Error logging achievement unlock:", auditError);
        // Don't fail the unlock if audit logging fails
      }

      console.log(
        `Achievement unlocked: ${template.title} for student ${studentId}`
      );
    } catch (error) {
      console.error("Error unlocking achievement:", error);
      throw error;
    }
  }

  /**
   * Trigger achievement check for specific events
   */
  static async onTriggerEvent(
    trigger: AchievementTrigger,
    studentId: string
  ): Promise<void> {
    try {
      // Check achievements that are triggered by this specific event
      const achievementTemplates = await this.getAchievementTemplates();
      const triggeredTemplates = achievementTemplates.filter(
        (template) =>
          template.criteria.triggers &&
          template.criteria.triggers.includes(trigger)
      );

      if (triggeredTemplates.length > 0) {
        await this.checkAndUnlockAchievements(studentId);
      }
    } catch (error) {
      console.error("Error processing trigger event:", error);
    }
  }
}

// Convenience functions for common triggers
export const triggerAchievementCheck = {
  onMarkAdded: (studentId: string) =>
    AchievementEngine.onTriggerEvent(AchievementTrigger.MARK_ADDED, studentId),

  onAwardReceived: (studentId: string) =>
    AchievementEngine.onTriggerEvent(
      AchievementTrigger.AWARD_RECEIVED,
      studentId
    ),

  onAttendanceMarked: (studentId: string) =>
    AchievementEngine.onTriggerEvent(
      AchievementTrigger.ATTENDANCE_MARKED,
      studentId
    ),

  onActivityJoined: (studentId: string) =>
    AchievementEngine.onTriggerEvent(
      AchievementTrigger.ACTIVITY_JOINED,
      studentId
    ),

  onBehaviorImproved: (studentId: string) =>
    AchievementEngine.onTriggerEvent(
      AchievementTrigger.BEHAVIOR_IMPROVED,
      studentId
    ),

  weekly: (studentId: string) =>
    AchievementEngine.onTriggerEvent(
      AchievementTrigger.WEEKLY_CHECK,
      studentId
    ),

  monthly: (studentId: string) =>
    AchievementEngine.onTriggerEvent(
      AchievementTrigger.MONTHLY_CHECK,
      studentId
    ),
};
