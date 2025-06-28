// Error Reporting Types

export interface ErrorReport {
  id: string;
  timestamp: Date;
  type: "automatic" | "manual";
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "in-progress" | "resolved" | "rejected";

  // Error Details
  title: string;
  description: string;
  errorMessage?: string;
  stackTrace?: string;
  consoleErrors?: string[];

  // User Context (Anonymous if POPIA applies)
  userRole?: string;
  userAgent: string;
  url: string;
  viewport: {
    width: number;
    height: number;
  };

  // Optional Contact (User can choose to provide)
  contactEmail?: string;
  allowContact?: boolean;

  // System Info
  buildVersion?: string;
  schoolId?: string; // Hashed for anonymity
  sessionId: string; // Temporary session identifier

  // Admin Fields
  assignedTo?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  adminNotes?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface BugReportFormData {
  title: string;
  description: string;
  steps: string[];
  expectedBehavior: string;
  actualBehavior: string;
  severity: ErrorReport["severity"];
  contactEmail?: string;
  allowContact: boolean;
}

export interface ErrorReportingSettings {
  enabled: boolean;
  allowAnonymousReports: boolean;
  requireContactForStudents: boolean;
  rateLimitPerUser: number; // Reports per hour
  autoCapture: boolean;
  minimumRoleForReporting: string[];
}
