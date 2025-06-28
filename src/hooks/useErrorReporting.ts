import { useState } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import type {
  ErrorReport,
  BugReportFormData,
  ErrorReportingSettings,
} from "../types/errorReporting";

// Rate limiting storage
const RATE_LIMIT_KEY = "errorReports_";
const DEFAULT_RATE_LIMIT = 5; // 5 reports per hour

export const useErrorReporting = () => {
  const { profile } = useAuth();
  const [settings] = useState<ErrorReportingSettings>({
    enabled: true,
    allowAnonymousReports: true,
    requireContactForStudents: true,
    rateLimitPerUser: DEFAULT_RATE_LIMIT,
    autoCapture: true,
    minimumRoleForReporting: [
      "student",
      "guardian",
      "teacher",
      "staff",
      "admin",
    ],
  });

  // Generate anonymous session ID
  const getSessionId = (): string => {
    let sessionId = sessionStorage.getItem("errorReportSessionId");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("errorReportSessionId", sessionId);
    }
    return sessionId;
  };

  // Check rate limiting
  const checkRateLimit = (): boolean => {
    const sessionId = getSessionId();
    const key = RATE_LIMIT_KEY + sessionId;
    const reports = JSON.parse(localStorage.getItem(key) || "[]");
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    // Clean old reports
    const recentReports = reports.filter(
      (timestamp: number) => timestamp > oneHourAgo
    );
    localStorage.setItem(key, JSON.stringify(recentReports));

    return recentReports.length < settings.rateLimitPerUser;
  };

  // Add report to rate limit tracking
  const addToRateLimit = () => {
    const sessionId = getSessionId();
    const key = RATE_LIMIT_KEY + sessionId;
    const reports = JSON.parse(localStorage.getItem(key) || "[]");
    reports.push(Date.now());
    localStorage.setItem(key, JSON.stringify(reports));
  };

  // Generate hash for school ID (POPIA compliance)
  const hashSchoolId = (schoolId: string): string => {
    // Simple hash function for anonymization
    let hash = 0;
    for (let i = 0; i < schoolId.length; i++) {
      const char = schoolId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  };

  // Capture console errors
  const captureConsoleErrors = (): string[] => {
    const errors: string[] = [];
    const originalError = console.error;
    const originalWarn = console.warn;

    // Override console.error temporarily
    console.error = (...args) => {
      errors.push(`ERROR: ${args.join(" ")}`);
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      errors.push(`WARN: ${args.join(" ")}`);
      originalWarn.apply(console, args);
    };

    // Restore original functions after a short delay
    setTimeout(() => {
      console.error = originalError;
      console.warn = originalWarn;
    }, 100);

    return errors;
  };

  // Submit error report
  const submitErrorReport = async (
    reportData: Partial<ErrorReport>
  ): Promise<string> => {
    if (!settings.enabled) {
      throw new Error("Error reporting is disabled");
    }

    if (!checkRateLimit()) {
      throw new Error(
        "Rate limit exceeded. Please wait before submitting another report."
      );
    }

    // Check if user role is allowed to report
    if (
      profile?.role &&
      !settings.minimumRoleForReporting.includes(profile.role)
    ) {
      throw new Error("You do not have permission to submit error reports.");
    }

    const errorReport: Omit<ErrorReport, "id"> = {
      timestamp: new Date(),
      type: reportData.type || "manual",
      severity: reportData.severity || "medium",
      status: "open",
      title: reportData.title || "Untitled Error Report",
      description: reportData.description || "",
      errorMessage: reportData.errorMessage,
      stackTrace: reportData.stackTrace,
      consoleErrors: reportData.consoleErrors || captureConsoleErrors(),

      // Anonymous user context
      userRole: profile?.role,
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },

      contactEmail: reportData.contactEmail,
      allowContact: reportData.allowContact || false,

      buildVersion: import.meta.env.VITE_APP_VERSION || "dev-build",
      schoolId: profile?.schoolId ? hashSchoolId(profile.schoolId) : undefined,
      sessionId: getSessionId(),

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      // Filter out undefined values for Firestore
      const firestoreData = Object.fromEntries(
        Object.entries({
          ...errorReport,
          timestamp: Timestamp.fromDate(errorReport.timestamp),
          createdAt: Timestamp.fromDate(errorReport.createdAt),
          updatedAt: Timestamp.fromDate(errorReport.updatedAt),
        }).filter(([_, value]) => value !== undefined)
      );

      const docRef = await addDoc(
        collection(db, "errorReports"),
        firestoreData
      );

      addToRateLimit();
      return docRef.id;
    } catch (error) {
      console.error("Failed to submit error report:", error);
      throw new Error("Failed to submit error report. Please try again.");
    }
  };

  // Submit bug report
  const submitBugReport = async (
    bugData: BugReportFormData,
    consoleErrors?: string[],
    stackTrace?: string
  ): Promise<string> => {
    const errorReport: Partial<ErrorReport> = {
      type: "manual",
      severity: bugData.severity,
      title: bugData.title,
      description: `${
        bugData.description
      }\n\nSteps to reproduce:\n${bugData.steps
        .map((step, i) => `${i + 1}. ${step}`)
        .join("\n")}\n\nExpected: ${bugData.expectedBehavior}\nActual: ${
        bugData.actualBehavior
      }`,
      contactEmail: bugData.contactEmail,
      allowContact: bugData.allowContact,
      consoleErrors: consoleErrors || captureConsoleErrors(),
      stackTrace,
    };

    return submitErrorReport(errorReport);
  };

  // Automatic error boundary reporting
  const reportError = async (error: Error): Promise<string> => {
    const errorReport: Partial<ErrorReport> = {
      type: "automatic",
      severity: "high",
      title: `Unhandled Error: ${error.name}`,
      description: error.message,
      errorMessage: error.message,
      stackTrace: error.stack,
      consoleErrors: captureConsoleErrors(),
    };

    return submitErrorReport(errorReport);
  };

  // Get user's recent reports (for duplicate prevention)
  const getUserRecentReports = async (): Promise<ErrorReport[]> => {
    const sessionId = getSessionId();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
      const q = query(
        collection(db, "errorReports"),
        where("sessionId", "==", sessionId),
        where("createdAt", ">=", Timestamp.fromDate(oneDayAgo)),
        orderBy("createdAt", "desc"),
        limit(10)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ErrorReport[];
    } catch (error) {
      console.error("Failed to fetch user reports:", error);
      return [];
    }
  };

  // Check if user can report (for UI)
  const canReport = (): boolean => {
    return (
      checkRateLimit() &&
      (!profile?.role ||
        settings.minimumRoleForReporting.includes(profile.role))
    );
  };

  // Get all reports (admin only)
  const getAllReports = async (): Promise<ErrorReport[]> => {
    if (!profile || !["admin", "staff"].includes(profile.role)) {
      throw new Error("Access denied");
    }

    try {
      const q = query(
        collection(db, "errorReports"),
        orderBy("createdAt", "desc"),
        limit(100)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          resolvedAt: data.resolvedAt?.toDate() || undefined,
        };
      }) as ErrorReport[];
    } catch (error) {
      console.error("Failed to fetch all reports:", error);
      throw new Error("Failed to fetch reports");
    }
  };

  // Update report status (admin only)
  const updateReportStatus = async (
    reportId: string,
    status: ErrorReport["status"],
    resolvedBy?: string
  ): Promise<void> => {
    if (!profile || !["admin", "staff"].includes(profile.role)) {
      throw new Error("Access denied");
    }

    try {
      const reportRef = doc(db, "errorReports", reportId);
      const updateData: any = {
        status,
        updatedAt: Timestamp.fromDate(new Date()),
      };

      if (status === "resolved" && resolvedBy) {
        updateData.resolvedBy = resolvedBy;
        updateData.resolvedAt = Timestamp.fromDate(new Date());
      }

      await updateDoc(reportRef, updateData);
    } catch (error) {
      console.error("Failed to update report status:", error);
      throw new Error("Failed to update report status");
    }
  };

  return {
    settings,
    submitErrorReport,
    submitBugReport,
    reportError,
    getUserRecentReports,
    getAllReports,
    updateReportStatus,
    checkRateLimit,
    canReport,
    getSessionId,
  };
};
