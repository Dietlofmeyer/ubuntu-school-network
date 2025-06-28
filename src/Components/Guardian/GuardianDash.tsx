import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../AuthContext";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { getPendingSubjectSelections } from "../../utils/academic";
import GuardianOverview from "./GuardianOverview.tsx";
import GuardianChildren from "./GuardianChildren.tsx";
import GuardianSubjectApprovals from "./GuardianSubjectApprovals.tsx";
import GuardianAcademicProgress from "./GuardianAcademicProgress.tsx";
import GuardianNotifications from "./GuardianNotifications.tsx";
import GuardianSettings from "./GuardianSettings.tsx";
import "./GuardianDash.css";

interface GuardianStats {
  totalChildren: number;
  pendingApprovals: number;
  newNotifications: number;
  averageGrade: number;
}

interface Student {
  id: string;
  name: string;
  grade: string;
  schoolId: string;
  email?: string;
  subjects?: string[];
  recentMarks?: any[];
  demerits?: number;
}

const GuardianDash: React.FC = () => {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GuardianStats>({
    totalChildren: 0,
    pendingApprovals: 0,
    newNotifications: 0,
    averageGrade: 0,
  });
  const [children, setChildren] = useState<Student[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      loadGuardianData();
    }
  }, [user]);

  const loadGuardianData = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);

      // Get linked children
      const childrenData = await getLinkedChildren();
      setChildren(childrenData);

      // Get pending subject approvals with error handling
      let pendingSelections: any[] = [];
      try {
        pendingSelections = await getPendingSubjectSelections(user.uid);
      } catch (error) {
        // Continue without pending selections for now
      }

      // Get notifications
      let newNotificationsCount = 0;
      try {
        const notificationsQuery = query(
          collection(db, "notifications"),
          where("recipientUid", "==", user.uid),
          where("read", "==", false)
        );
        const notificationsSnapshot = await getDocs(notificationsQuery);
        newNotificationsCount = notificationsSnapshot.size;
      } catch (error) {
        // Continue without notification count for now
      }

      // Calculate average grade
      const averageGrade = calculateAverageGrade(childrenData);

      setStats({
        totalChildren: childrenData.length,
        pendingApprovals: pendingSelections.length,
        newNotifications: newNotificationsCount,
        averageGrade,
      });
    } catch (error) {
      // Set default stats on error
      setStats({
        totalChildren: 0,
        pendingApprovals: 0,
        newNotifications: 0,
        averageGrade: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const getLinkedChildren = async (): Promise<Student[]> => {
    if (!user?.uid) return [];

    try {
      // Method 1: Check if guardian document has students array
      const guardianDocRef = doc(db, "users", user.uid);
      const guardianDoc = await getDoc(guardianDocRef);

      let studentIds: string[] = [];

      if (guardianDoc.exists()) {
        const guardianData = guardianDoc.data();
        if (guardianData.students && Array.isArray(guardianData.students)) {
          studentIds = guardianData.students;
        }
      }

      // Method 2: If no students in guardian doc, search for students linked to this guardian
      if (studentIds.length === 0) {
        const studentsQuery = query(
          collection(db, "users"),
          where("role", "==", "student"),
          where("guardians", "array-contains", user.uid)
        );

        const studentsSnapshot = await getDocs(studentsQuery);
        studentIds = studentsSnapshot.docs.map((doc) => doc.id);
      }

      // Method 3: Alternative - check guardianUid field
      if (studentIds.length === 0) {
        const studentsQuery = query(
          collection(db, "users"),
          where("role", "==", "student"),
          where("guardianUid", "==", user.uid)
        );

        const studentsSnapshot = await getDocs(studentsQuery);
        studentIds = studentsSnapshot.docs.map((doc) => doc.id);
      }

      // Fetch full student data
      const childrenPromises = studentIds.map(async (studentId) => {
        const studentDoc = await getDoc(doc(db, "users", studentId));
        if (studentDoc.exists()) {
          const studentData = studentDoc.data();
          return {
            id: studentId,
            name: studentData.name || "Unknown Student",
            grade: studentData.grade || "Unknown Grade",
            schoolId: studentData.schoolId || "",
            email: studentData.email || "",
            subjects: studentData.subjects || [],
            demerits: studentData.demerits?.length || 0,
          } as Student;
        }
        return null;
      });

      const childrenResults = await Promise.all(childrenPromises);
      return childrenResults.filter((child) => child !== null);
    } catch (error) {
      return [];
    }
  };

  const calculateAverageGrade = (childrenData: Student[]): number => {
    if (childrenData.length === 0) return 0;

    // Calculate average from recent marks
    const allMarks = childrenData.flatMap((child) => child.recentMarks || []);
    if (allMarks.length === 0) return 85; // Default placeholder

    const total = allMarks.reduce(
      (sum, mark) => sum + (mark.percentage || 0),
      0
    );
    return Math.round((total / allMarks.length) * 10) / 10;
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      // Error handling for logout
    }
  };

  // Function to refresh notification count
  const refreshNotificationCount = async () => {
    if (!user?.uid) return;

    try {
      const notificationsQuery = query(
        collection(db, "notifications"),
        where("recipientUid", "==", user.uid),
        where("read", "==", false)
      );
      const notificationsSnapshot = await getDocs(notificationsQuery);
      const newNotificationsCount = notificationsSnapshot.size;

      setStats((prev) => ({
        ...prev,
        newNotifications: newNotificationsCount,
      }));
    } catch (error) {
      // Error handling for notification count refresh
    }
  };

  // Refresh notification count when switching tabs (especially from notifications)
  useEffect(() => {
    if (user?.uid) {
      // Small delay to allow notifications to be marked as read
      const timeoutId = setTimeout(() => {
        refreshNotificationCount();
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [activeTab, user?.uid]);

  const tabConfig = [
    {
      id: "overview",
      label: t("overview") || "Overview",
      icon: "📊",
      component: GuardianOverview,
    },
    {
      id: "children",
      label: t("children") || "Children",
      icon: "👨‍👩‍👧‍👦",
      component: GuardianChildren,
    },
    {
      id: "approvals",
      label: t("subject_approvals") || "Approvals",
      icon: "✅",
      component: GuardianSubjectApprovals,
      badge: stats.pendingApprovals > 0 ? stats.pendingApprovals : undefined,
    },
    {
      id: "progress",
      label: t("academic_progress") || "Progress",
      icon: "📈",
      component: GuardianAcademicProgress,
    },
    {
      id: "notifications",
      label: t("notifications") || "Notifications",
      icon: "🔔",
      component: GuardianNotifications,
      badge: stats.newNotifications > 0 ? stats.newNotifications : undefined,
    },
    {
      id: "settings",
      label: t("settings") || "Settings",
      icon: "⚙️",
      component: GuardianSettings,
    },
  ];

  const renderActiveComponent = () => {
    const activeTabConfig = tabConfig.find((tab) => tab.id === activeTab);
    const Component = activeTabConfig?.component || GuardianOverview;

    // Pass special props to specific components
    if (activeTab === "notifications") {
      return (
        <Component
          children={children}
          stats={stats}
          onRefresh={loadGuardianData}
          onNavigate={setActiveTab}
          onNotificationUpdate={refreshNotificationCount}
        />
      );
    }

    if (activeTab === "subject-approvals") {
      return (
        <Component
          children={children}
          stats={stats}
          onRefresh={loadGuardianData}
          onNotificationUpdate={refreshNotificationCount}
        />
      );
    }

    // Default component rendering
    return (
      <Component
        children={children}
        stats={stats}
        onRefresh={loadGuardianData}
      />
    );
  };

  if (loading) {
    return (
      <div className="guardian-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="guardian-dashboard">
      {/* Mobile Header */}
      <div className="guardian-header-mobile">
        <button
          className="guardian-sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          ☰
        </button>
        <h1 className="guardian-title-mobile">
          {t("guardian_dashboard") || "Guardian Dashboard"}
        </h1>
        <div className="guardian-profile-mobile">
          <span className="guardian-profile-icon">👨‍💼</span>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`guardian-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="guardian-sidebar-header">
          <div className="guardian-profile">
            <div className="guardian-profile-icon">👨‍💼</div>
            <div className="guardian-profile-info">
              <h3>{profile?.name || "Guardian"}</h3>
              <p>
                {stats.totalChildren} {t("children") || "children"}
              </p>
            </div>
          </div>
        </div>

        <nav className="guardian-nav">
          {tabConfig.map((tab) => (
            <button
              key={tab.id}
              className={`guardian-nav-item ${
                activeTab === tab.id ? "active" : ""
              }`}
              onClick={() => {
                setActiveTab(tab.id);
                setSidebarOpen(false);
              }}
            >
              <span className="guardian-nav-icon">{tab.icon}</span>
              <span className="guardian-nav-label">{tab.label}</span>
              {tab.badge && (
                <span className="guardian-nav-badge">{tab.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="guardian-sidebar-footer">
          <button onClick={handleLogout} className="guardian-logout-btn">
            <span className="logout-icon">🚪</span>
            {t("logout") || "Logout"}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="guardian-main">
        <div className="guardian-content">{renderActiveComponent()}</div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="guardian-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default GuardianDash;
