import { useEffect, useState } from "react";
import { useAuth } from "../../AuthContext";
import { db, auth } from "../../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { subjectIcons } from "../../data/constants";
import "./studentDash.css";
import ReportCardsTable from "./ReportCardsTable";
import Sidebar from "./Sidebar";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../ThemeContext";

// New Component Imports
import DashboardHeader from "./DashboardHeader";
import NotificationBanner from "./NotificationBanner";
import QuickStatsGrid from "./QuickStatsGrid";
import AcademicSection from "./AcademicSection";
import QuickActionsPanel from "./QuickActionsPanel";
import AchievementsSection from "./AchievementsSection";
import StudentModals from "./StudentModals";
import type {
  Mark,
  Activity,
  Award,
  DemeritRecord,
  Profile,
  ReportCard,
} from "./types";

// Export ReportCard type for other components
export type { ReportCard };

function getSubjectIcon(subject: string) {
  for (const key in subjectIcons) {
    if (
      subject.toLowerCase() === key.toLowerCase() ||
      subject.toLowerCase().includes(key.toLowerCase())
    ) {
      return subjectIcons[key];
    }
  }
  return subjectIcons.Default;
}

function StudentDash() {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const { theme, setTheme, themeOptions } = useTheme();
  const [marks, setMarks] = useState<Mark[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [homeroomClass, setHomeroomClass] = useState<string>("");
  const [homeroomTeacher, setHomeroomTeacher] = useState<string>("");
  const [demerits, setDemerits] = useState<DemeritRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDemeritHistory, setShowDemeritHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // --- Report Cards ---
  const [reports, setReports] = useState<ReportCard[]>([]);
  const [viewReport, setViewReport] = useState<ReportCard | null>(null);

  // --- Extracurriculars ---
  const [allExtracurriculars, setAllExtracurriculars] = useState<Activity[]>(
    []
  );
  const [signedUpIds, setSignedUpIds] = useState<string[]>([]);
  const [extracurricularModalOpen, setExtracurricularModalOpen] =
    useState(false);

  // --- Academic Management Features ---
  const [showSubjectSelection, setShowSubjectSelection] = useState(false);
  const [needsSubjectSelection, setNeedsSubjectSelection] = useState(false);

  // --- Language state ---
  const [language, setLanguage] = useState<string>(i18n.language);

  // --- Mobile sidebar state ---
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!user) return;
    const fetchStudentData = async () => {
      setLoading(true);
      try {
        const ref = doc(db, "students", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setMarks(data.marks || []);
          setActivities(data.activities || []);
          setAwards(data.awards || []);
        } else {
          setMarks([]);
          setActivities([]);
          setAwards([]);
        }
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        let homeroom = "";
        if (userSnap.exists()) {
          setSubjects(userSnap.data().subjects || []);
          homeroom = userSnap.data().homeroomClass || "";
          setHomeroomClass(homeroom);
          setDemerits(userSnap.data().demerits || []);
          if (userSnap.data().marks) {
            setMarks(userSnap.data().marks);
          }
          setReports(userSnap.data().reports || []);
          setSignedUpIds(userSnap.data().extracurriculars || []);

          // Check if student needs subject selection
          const selectedSubjects = userSnap.data().selectedSubjects || [];
          const approvedSubjects = userSnap.data().approvedSubjects || [];
          if (selectedSubjects.length === 0 && approvedSubjects.length === 0) {
            setNeedsSubjectSelection(true);
          }

          // Set language from user profile if available
          if (
            userSnap.data().language &&
            userSnap.data().language !== i18n.language
          ) {
            i18n.changeLanguage(userSnap.data().language);
            setLanguage(userSnap.data().language);
          }
        } else {
          setSubjects([]);
          setHomeroomClass("");
          setDemerits([]);
          setReports([]);
          setSignedUpIds([]);
        }
        if (homeroom) {
          const homeroomRef = doc(db, "homerooms", homeroom);
          const homeroomSnap = await getDoc(homeroomRef);
          let teacherId = "";
          if (homeroomSnap.exists()) {
            teacherId = homeroomSnap.data().teacherId;
          }
          if (teacherId) {
            const teacherRef = doc(db, "users", teacherId);
            const teacherSnap = await getDoc(teacherRef);
            if (teacherSnap.exists()) {
              setHomeroomTeacher(teacherSnap.data().name || "");
            } else {
              setHomeroomTeacher("");
            }
          } else {
            setHomeroomTeacher("");
          }
        } else {
          setHomeroomTeacher("");
        }
      } catch (error) {
        console.error("Error fetching student data:", error);
      }
      setLoading(false);
    };
    fetchStudentData();
  }, [user]);

  // Fetch all extracurriculars from DB
  useEffect(() => {
    const fetchExtracurriculars = async () => {
      const snap = await getDocs(collection(db, "extracurriculars"));
      const list: Activity[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.available !== false) {
          let createdAt: string = "";
          if (data.createdAt?.toDate) {
            createdAt = data.createdAt.toDate().toLocaleString();
          } else if (typeof data.createdAt === "string") {
            createdAt = data.createdAt;
          } else {
            createdAt = "";
          }
          list.push({
            id: docSnap.id,
            name: data.name,
            description: data.description ?? "",
            teacher: data.teacher ?? "",
            createdAt,
          });
        }
      });
      setAllExtracurriculars(list);
    };
    fetchExtracurriculars();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    window.location.reload();
  };

  const totalDemeritPoints = demerits.reduce((sum, d) => sum + d.points, 0);

  // Group marks by subject
  const marksBySubject: { [subject: string]: Mark[] } = {};
  marks.forEach((mark) => {
    if (!marksBySubject[mark.subject]) marksBySubject[mark.subject] = [];
    marksBySubject[mark.subject].push(mark);
  });

  // Calculate average grade per subject
  const averageBySubject: { [subject: string]: number | null } = {};
  Object.keys(marksBySubject).forEach((subject) => {
    const subjectMarks = marksBySubject[subject];
    const validMarks = subjectMarks.filter((m) => m.total > 0);
    if (validMarks.length === 0) {
      averageBySubject[subject] = null;
    } else {
      const totalScore = validMarks.reduce((sum, m) => sum + m.score, 0);
      const totalOutOf = validMarks.reduce((sum, m) => sum + m.total, 0);
      averageBySubject[subject] =
        totalOutOf > 0 ? (totalScore / totalOutOf) * 100 : null;
    }
  });

  // Get today's date
  const today = new Date();
  const dateString = today.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Get latest marks (sorted by date descending)
  const latestMarks = [...marks]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  // Demerit history sorted newest first (used internally)
  // const sortedDemerits = [...demerits].sort(
  //   (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  // );

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString() +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  }

  const handleSignUp = async (activityId: string) => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      extracurriculars: arrayUnion(activityId),
    });
    setSignedUpIds((prev) => [...prev, activityId]);
  };

  const handleWithdraw = async (activityId: string) => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      extracurriculars: arrayRemove(activityId),
    });
    setSignedUpIds((prev) => prev.filter((id) => id !== activityId));
  };

  // Handle language change and save to Firestore
  const handleLanguageChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
    if (user) {
      await updateDoc(doc(db, "users", user.uid), { language: newLang });
    }
  };

  const signedUpActivities = allExtracurriculars.filter((a) =>
    signedUpIds.includes(a.id)
  );

  return loading ? (
    <div className="sdash-loading">{t("loading_dashboard")}</div>
  ) : (
    <div className="sdash-root">
      {/* All Modals */}
      <StudentModals
        showDemeritHistory={showDemeritHistory}
        demerits={demerits}
        onCloseDemeritHistory={() => setShowDemeritHistory(false)}
        showSettings={showSettings}
        language={language}
        theme={theme}
        themeOptions={themeOptions}
        onCloseSettings={() => setShowSettings(false)}
        onLanguageChange={handleLanguageChange}
        onThemeChange={setTheme}
        viewReport={viewReport}
        studentName={profile?.name || ""}
        onCloseReportCard={() => setViewReport(null)}
        extracurricularModalOpen={extracurricularModalOpen}
        allExtracurriculars={allExtracurriculars}
        signedUpIds={signedUpIds}
        onSignUp={handleSignUp}
        onWithdraw={handleWithdraw}
        onCloseExtracurricular={() => setExtracurricularModalOpen(false)}
        showSubjectSelection={showSubjectSelection}
        onCompleteSubjectSelection={async () => {
          setShowSubjectSelection(false);
          setNeedsSubjectSelection(false);
          // Re-fetch user profile to get updated subject data instead of full page reload
          try {
            // The profile should be updated automatically when the component re-renders
          } catch (error) {
            // Error handling
          }
        }}
        onCloseSubjectSelection={() => setShowSubjectSelection(false)}
      />

      <div className="sdash-mainwrap">
        {/* Hamburger Menu Button for Mobile */}
        <button
          className="sdash-sidebar-hamburger"
          onClick={() => setIsMobileSidebarOpen(true)}
          aria-label={t("open_menu")}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <div
            className="sdash-sidebar-overlay"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Desktop Sidebar */}
        <div className="sdash-sidebar sdash-sidebar-desktop">
          <Sidebar
            profile={profile}
            homeroomTeacher={homeroomTeacher}
            totalDemeritPoints={totalDemeritPoints}
            onShowDemeritHistory={() => setShowDemeritHistory(true)}
            awards={awards}
            activities={signedUpActivities}
            onSignOut={handleSignOut}
            onOpenSettings={() => setShowSettings(true)}
          />
        </div>

        {/* Mobile Sidebar */}
        {isMobileSidebarOpen && (
          <div className="sdash-sidebar sdash-sidebar-mobile">
            <button
              className="sdash-sidebar-close"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-label={t("close_menu")}
            >
              ×
            </button>
            <Sidebar
              profile={profile}
              homeroomTeacher={homeroomTeacher}
              totalDemeritPoints={totalDemeritPoints}
              onShowDemeritHistory={() => {
                setShowDemeritHistory(true);
                setIsMobileSidebarOpen(false);
              }}
              awards={awards}
              activities={signedUpActivities}
              onSignOut={handleSignOut}
              onOpenSettings={() => {
                setShowSettings(true);
                setIsMobileSidebarOpen(false);
              }}
            />
          </div>
        )}

        <div className="sdash-main">
          {/* Spacer for hamburger menu on mobile */}
          <div className="sdash-hamburger-spacer"></div>

          {/* Dashboard Header */}
          <DashboardHeader dateString={dateString} />

          {/* Notification Banner - Academic Feature */}
          <NotificationBanner
            needsSubjectSelection={needsSubjectSelection}
            onSelectSubjects={() => setShowSubjectSelection(true)}
          />

          {/* Quick Stats Overview */}
          <QuickStatsGrid
            subjects={subjects}
            latestMarks={latestMarks}
            signedUpActivities={signedUpActivities}
            totalDemeritPoints={totalDemeritPoints}
          />

          {/* Main Content Grid */}
          <div className="sdash-content-grid">
            {/* Academic Section */}
            <AcademicSection
              latestMarks={latestMarks}
              subjects={subjects}
              getSubjectIcon={getSubjectIcon}
              averageBySubject={averageBySubject}
            />

            <div className="sdash-sidebar-content">
              {/* Quick Actions */}
              <QuickActionsPanel
                onSelectSubjects={() => setShowSubjectSelection(true)}
                onOpenExtracurriculars={() => setExtracurricularModalOpen(true)}
                onShowDemeritHistory={() => setShowDemeritHistory(true)}
                onOpenSettings={() => setShowSettings(true)}
              />

              {/* Achievements */}
              <AchievementsSection
                awards={awards}
                signedUpActivities={signedUpActivities}
              />
            </div>
          </div>

          {/* Report Cards Section */}
          <ReportCardsTable
            reports={reports}
            formatDate={formatDate}
            onView={setViewReport}
          />
        </div>
      </div>
    </div>
  );
}

export default StudentDash;
