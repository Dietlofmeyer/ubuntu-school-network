import { useEffect, useState } from "react";
import { useAuth } from "../../AuthContext";
import { db, auth } from "../../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  collection,
  getDocs,
  arrayUnion,
  query,
  where,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { signOut } from "firebase/auth";
import { getCurrentTerm } from "../../utils/term";
import ExtracurricularManager from "./subcomponents/components/ExtracurricularManager";
import StudentCard from "./subcomponents/components/StudentCard";
import SubjectBlock from "./subcomponents/components/SubjectBlock";
import FilterBar from "./subcomponents/components/FilterBar";
import Sidebar from "./subcomponents/components/Sidebar";
import SettingsModal from "./subcomponents/modals/SettingsModal";
import EnhancedAddMarkModal from "./subcomponents/modals/EnhancedAddMarkModal";
import EnhancedBulkMarkModal from "./subcomponents/modals/EnhancedBulkMarkModal";
import MarkAnalytics from "./subcomponents/components/MarkAnalytics";
import MarkTemplatesPage from "./subcomponents/pages/MarkTemplatesPage";
import DemeritModal from "./subcomponents/modals/DemeritModal";
import AcknowledgementModal from "./subcomponents/modals/AcknowledgementModal";
import ManageHomeroomModal from "./subcomponents/modals/ManageHomeroomModal";
import ReportCardModal from "../Student/ReportCardModal";
import { useTranslation } from "react-i18next";
import "./TeacherDash.css";
import { useTheme } from "../../ThemeContext"; // Add this import

type TeacherProfile = {
  name: string;
  email: string;
  phone?: string;
  experience?: string;
  qualifications?: string[];
  subjects?: string[];
  activities?: string[];
  address?: string;
  role?: string;
  homeroomClass?: string;
  language?: string;
};
type DemeritRecord = {
  points: number;
  reason: string;
  date: string;
  teacher: string;
};
type Mark = {
  subject: string;
  score: number;
  total: number;
  description: string;
  date: string;
  teacher: string;
};
export type ReportCard = {
  term: number;
  year: number;
  issuedAt: string;
  subjects: { subject: string; average: number | null; comment: string }[];
  demerits: number;
  teacher: string;
  grade?: string;
  homeroomClass?: string;
};
type StudentProfile = {
  name: string;
  email: string;
  grade?: string;
  subjects?: string[];
  uid: string;
  homeroomClass?: string;
  demerits?: DemeritRecord[];
  marks?: Mark[];
  reports?: ReportCard[];
};
type ParentAcknowledgement = {
  parentName: string;
  acknowledged: boolean;
};
type AckStats = {
  total: number;
  acknowledged: number;
};

function translateGrade(grade: string) {
  return grade;
}

function buildReportSubjects(student: StudentProfile) {
  if (!student.marks || student.marks.length === 0) return [];
  const bySubject: Record<
    string,
    { total: number; score: number; comments: string[] }
  > = {};
  student.marks.forEach((m) => {
    if (!bySubject[m.subject]) {
      bySubject[m.subject] = { total: 0, score: 0, comments: [] };
    }
    bySubject[m.subject].total += m.total;
    bySubject[m.subject].score += m.score;
    if (m.description) bySubject[m.subject].comments.push(m.description);
  });
  return Object.entries(bySubject).map(([subject, data]) => ({
    subject,
    average: data.total > 0 ? (data.score / data.total) * 100 : null,
    comment: data.comments.join("; "),
  }));
}

function TeacherDash() {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const { theme, setTheme, themeOptions } = useTheme(); // Use centralized theme context
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);

  // Homeroom students
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // All students (for subject view)
  const [allStudents, setAllStudents] = useState<StudentProfile[]>([]);
  const [allStudentsLoading, setAllStudentsLoading] = useState(false);

  // Add marks dialog state
  const [markStudent, setMarkStudent] = useState<StudentProfile | null>(null);
  const [markSubject, setMarkSubject] = useState<string>("");
  const [markScore, setMarkScore] = useState<number>(0);
  const [markTotal, setMarkTotal] = useState<number>(0);
  const [markDesc, setMarkDesc] = useState<string>("");
  const [markLoading, setMarkLoading] = useState(false);

  // Demerit dialog state
  const [demeritStudent, setDemeritStudent] = useState<StudentProfile | null>(
    null
  );
  const [demeritPoints, setDemeritPoints] = useState<number>(1);
  const [demeritReason, setDemeritReason] = useState<string>("");
  const [demeritLoading, setDemeritLoading] = useState(false);
  const [demeritMode, setDemeritMode] = useState<"add" | "remove">("add");

  // Report card modal state
  const [reportStudent, setReportStudent] = useState<StudentProfile | null>(
    null
  );
  const [reportCardToShow, setReportCardToShow] = useState<ReportCard | null>(
    null
  );

  // Settings modal state
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Enhanced mark assignment state
  const [showMarkAnalytics, setShowMarkAnalytics] = useState(false);
  const [markTemplates, setMarkTemplates] = useState<any[]>([]);
  const [recentMarks] = useState<Mark[]>([]);

  // Page navigation state
  const [currentPage, setCurrentPage] = useState<"dashboard" | "templates">(
    "dashboard"
  );

  // Language setting state
  const [language, setLanguage] = useState<string>(i18n.language);

  // Acknowledgement modal state
  const [ackModal, setAckModal] = useState<{
    open: boolean;
    student: StudentProfile | null;
    markOrDemerit: Mark | DemeritRecord | null;
    type: "mark" | "demerit" | null;
    acknowledgements: ParentAcknowledgement[];
    loading: boolean;
  }>({
    open: false,
    student: null,
    markOrDemerit: null,
    type: null,
    acknowledgements: [],
    loading: false,
  });

  // Student search/filter state
  const [studentSearch, setStudentSearch] = useState("");
  const [notificationSearch, setNotificationSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("");
  const [subjectFilter, setSubjectFilter] = useState<string>("");

  // Cache for parent acknowledgement stats
  const [ackStatsCache, setAckStatsCache] = useState<Record<string, AckStats>>(
    {}
  );

  // Submit report state
  const [submittingReportUid, setSubmittingReportUid] = useState<string | null>(
    null
  );

  // Homeroom edit state
  const [homeroomEdit, setHomeroomEdit] = useState<string>("");
  const [homeroomSaving, setHomeroomSaving] = useState(false);

  // Bulk marks state (updated)
  const [bulkMarkSubject, setBulkMarkSubject] = useState<string>("");
  const [bulkMarkOpen, setBulkMarkOpen] = useState(false);
  const [bulkMarkScores, setBulkMarkScores] = useState<
    { student: StudentProfile; score: number }[]
  >([]);
  const [bulkMarkDescription, setBulkMarkDescription] = useState<string>("");
  const [bulkMarkTotal, setBulkMarkTotal] = useState<number>(0);
  const [bulkMarkLoading, setBulkMarkLoading] = useState(false);

  // --- Manual Homeroom Management Modal State ---
  const [manageHomeroomOpen, setManageHomeroomOpen] = useState(false);
  const [homeroomCandidates, setHomeroomCandidates] = useState<
    StudentProfile[]
  >([]);
  const [selectedHomeroomStudents, setSelectedHomeroomStudents] = useState<
    string[]
  >([]);
  const [homeroomManageLoading, setHomeroomManageLoading] = useState(false);
  const [homeroomSearch, setHomeroomSearch] = useState("");

  // Save homeroom class handler
  const handleSaveHomeroom = async () => {
    if (!teacher || !user) return;
    setHomeroomSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        homeroomClass: homeroomEdit,
      });
      setTeacher((prev) =>
        prev ? { ...prev, homeroomClass: homeroomEdit } : prev
      );
    } catch (error) {
      console.error("Failed to save homeroom:", error);
    }
    setHomeroomSaving(false);
    setSettingsOpen(false);
  };

  useEffect(() => {
    if (!user) return;
    const fetchTeacherProfile = async () => {
      if (profile && profile.role === "teacher") {
        setTeacher(profile);
        setHomeroomEdit((profile as TeacherProfile).homeroomClass || "");
        if (profile.language && profile.language !== i18n.language) {
          i18n.changeLanguage(profile.language);
          setLanguage(profile.language);
        }
      } else {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as TeacherProfile;
          setTeacher(data);
          setHomeroomEdit(data.homeroomClass || "");
          if (data.language && data.language !== i18n.language) {
            i18n.changeLanguage(data.language);
            setLanguage(data.language);
          }
        } else {
          setTeacher(null);
        }
      }
    };
    fetchTeacherProfile();
    // eslint-disable-next-line
  }, [user, profile]);

  // Fetch homeroom students
  useEffect(() => {
    const fetchHomeroomStudents = async () => {
      setStudentsLoading(true);
      setStudents([]);
      if (!teacher?.homeroomClass) {
        setStudentsLoading(false);
        return;
      }
      // Manual assignment: fetch all students with this homeroomClass
      const usersSnap = await getDocs(collection(db, "users"));
      const students: StudentProfile[] = [];
      usersSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (
          data.role === "student" &&
          data.homeroomClass === teacher.homeroomClass
        ) {
          students.push({
            name: data.name,
            email: data.email,
            grade: data.grade,
            subjects: Array.isArray(data.subjects)
              ? data.subjects.filter(
                  (s: any) => typeof s === "string" && s.trim().length > 0
                )
              : [],
            uid: docSnap.id,
            homeroomClass: data.homeroomClass,
            demerits: data.demerits || [],
            marks: data.marks || [],
            reports: data.reports || [],
          });
        }
      });
      setStudents(students);
      setStudentsLoading(false);
    };
    if (teacher?.homeroomClass) {
      fetchHomeroomStudents();
    }
  }, [
    teacher,
    markLoading,
    demeritLoading,
    submittingReportUid,
    manageHomeroomOpen,
  ]);

  // Fetch all students for subject view
  useEffect(() => {
    const fetchAllStudents = async () => {
      setAllStudentsLoading(true);
      const usersSnap = await getDocs(collection(db, "users"));
      const students: StudentProfile[] = [];
      usersSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.role === "student") {
          students.push({
            name: data.name,
            email: data.email,
            grade: data.grade,
            subjects: Array.isArray(data.subjects)
              ? data.subjects.filter(
                  (s: any) => typeof s === "string" && s.trim().length > 0
                )
              : [],
            uid: docSnap.id,
            homeroomClass: data.homeroomClass,
            demerits: data.demerits || [],
            marks: data.marks || [],
            reports: data.reports || [],
          });
        }
      });
      setAllStudents(students);
      setAllStudentsLoading(false);
    };
    fetchAllStudents();
  }, [markLoading, demeritLoading, submittingReportUid]);

  // --- Manual Homeroom Management Modal Logic ---
  useEffect(() => {
    if (!manageHomeroomOpen) return;
    const fetchCandidates = async () => {
      setHomeroomManageLoading(true);
      const usersSnap = await getDocs(collection(db, "users"));
      const students: StudentProfile[] = [];
      usersSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.role === "student") {
          students.push({
            name: data.name,
            email: data.email,
            grade: data.grade,
            subjects: Array.isArray(data.subjects)
              ? data.subjects.filter(
                  (s: any) => typeof s === "string" && s.trim().length > 0
                )
              : [],
            uid: docSnap.id,
            homeroomClass: data.homeroomClass,
            demerits: data.demerits || [],
            marks: data.marks || [],
            reports: data.reports || [],
          });
        }
      });
      setHomeroomCandidates(students);
      setSelectedHomeroomStudents(
        students
          .filter((s) => s.homeroomClass === teacher?.homeroomClass)
          .map((s) => s.uid)
      );
      setHomeroomManageLoading(false);
    };
    fetchCandidates();
    // eslint-disable-next-line
  }, [manageHomeroomOpen, teacher?.homeroomClass]);

  // --- FIX: Ensure homeroom doc exists before updating ---
  const handleSaveHomeroomStudents = async () => {
    if (!teacher?.homeroomClass || !user) return;
    setHomeroomManageLoading(true);

    try {
      // Identify students being removed and added for logging
      const studentsToRemove = homeroomCandidates.filter(
        (s) =>
          s.homeroomClass === teacher.homeroomClass &&
          !selectedHomeroomStudents.includes(s.uid)
      );

      const studentsToAdd = homeroomCandidates.filter(
        (s) =>
          selectedHomeroomStudents.includes(s.uid) &&
          s.homeroomClass !== teacher.homeroomClass
      );

      // Remove students who are no longer selected
      const removePromises = studentsToRemove.map((s) =>
        updateDoc(doc(db, "users", s.uid), { homeroomClass: "" })
      );

      // Add students who are newly selected
      const addPromises = studentsToAdd.map((s) =>
        updateDoc(doc(db, "users", s.uid), {
          homeroomClass: teacher.homeroomClass,
        })
      );

      await Promise.all([...removePromises, ...addPromises]);

      // Log all homeroom changes for POPIA compliance
      try {
        const functions = getFunctions();
        const logUserEdit = httpsCallable(functions, "logUserEdit");

        // Log removals
        for (const student of studentsToRemove) {
          await logUserEdit({
            userId: student.uid,
            changes: {
              homeroomClass: {
                previous: teacher.homeroomClass,
                new: "",
              },
            },
            editorId: user.uid,
            reason: `Teacher removed student from homeroom class ${teacher.homeroomClass}`,
          });
        }

        // Log additions
        for (const student of studentsToAdd) {
          await logUserEdit({
            userId: student.uid,
            changes: {
              homeroomClass: {
                previous: student.homeroomClass || "",
                new: teacher.homeroomClass,
              },
            },
            editorId: user.uid,
            reason: `Teacher assigned student to homeroom class ${teacher.homeroomClass}`,
          });
        }
      } catch (logError) {
        console.warn("Failed to log homeroom assignment changes:", logError);
      }

      // --- Ensure the homeroom document exists or is updated ---
      const homeroomRef = doc(db, "homerooms", teacher.homeroomClass);
      const homeroomSnap = await getDoc(homeroomRef);
      if (!homeroomSnap.exists()) {
        await setDoc(homeroomRef, { studentIds: selectedHomeroomStudents });
      } else {
        await updateDoc(homeroomRef, { studentIds: selectedHomeroomStudents });
      }

      setManageHomeroomOpen(false);
    } catch (error) {
      console.error("Error updating homeroom assignments:", error);
    } finally {
      setHomeroomManageLoading(false);
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    await signOut(auth);
    window.location.reload();
  };

  // Open add marks dialog (subject section only)
  const handleOpenMark = (student: StudentProfile, subject: string) => {
    setMarkStudent(student);
    setMarkSubject(subject);
    setMarkScore(0);
    setMarkTotal(0);
    setMarkDesc("");
  };

  const handleCloseMark = () => {
    setMarkStudent(null);
    setMarkSubject("");
    setMarkScore(0);
    setMarkTotal(0);
    setMarkDesc("");
  };

  // Add mark to student and notify parents (store translation key & vars)
  const handleSubmitMark = async () => {
    if (
      !markStudent ||
      !markSubject ||
      markScore < 0 ||
      markTotal <= 0 ||
      !teacher ||
      !user
    )
      return;
    setMarkLoading(true);

    try {
      const newMark: Mark = {
        subject: markSubject,
        score: markScore,
        total: markTotal,
        description: markDesc,
        date: new Date().toISOString(),
        teacher: teacher?.name || "",
      };
      const studentRef = doc(db, "users", markStudent.uid);
      const studentSnap = await getDoc(studentRef);
      let prevMarks: Mark[] = [];
      if (studentSnap.exists()) {
        prevMarks = studentSnap.data().marks || [];
      }
      await updateDoc(studentRef, {
        marks: [...prevMarks, newMark],
      });

      // Log the mark assignment for POPIA compliance
      try {
        const functions = getFunctions();
        const logUserEdit = httpsCallable(functions, "logUserEdit");
        await logUserEdit({
          userId: markStudent.uid,
          changes: {
            marks: {
              new: `Added mark: ${markScore}/${markTotal} for ${markSubject} - ${markDesc}`,
            },
          },
          editorId: user.uid,
          reason: `Teacher ${teacher.name} assigned mark for ${markSubject}`,
        });
      } catch (logError) {
        console.warn("Failed to log mark assignment:", logError);
      }

      // --- Notify parents (store translationKey & translationVars) ---
      const parentsQuery = query(
        collection(db, "users"),
        where("role", "==", "parent"),
        where("children", "array-contains", markStudent.uid)
      );
      const parentsSnap = await getDocs(parentsQuery);
      const percentage = ((markScore / markTotal) * 100).toFixed(1);
      const notification = {
        id: `${markStudent.uid}_${Date.now()}`,
        title: "new_mark_assigned",
        translationKey: "mark_notification_message",
        translationVars: {
          student: markStudent.name,
          percentage,
          description: markDesc,
        },
        date: new Date().toISOString(),
        type: "mark",
        acknowledged: false,
        studentUid: markStudent.uid,
        mark: newMark,
      };
      for (const parentDoc of parentsSnap.docs) {
        const parentRef = doc(db, "users", parentDoc.id);
        await updateDoc(parentRef, {
          notifications: arrayUnion(notification),
        });
      }
    } catch (error) {
      console.error("Error submitting mark:", error);
    } finally {
      setMarkLoading(false);
      handleCloseMark();
    }
  };

  // Demerit dialog handlers
  const handleOpenDemerit = (
    student: StudentProfile,
    mode: "add" | "remove"
  ) => {
    setDemeritStudent(student);
    setDemeritPoints(1);
    setDemeritReason("");
    setDemeritMode(mode);
  };

  const handleCloseDemerit = () => {
    setDemeritStudent(null);
    setDemeritPoints(1);
    setDemeritReason("");
    setDemeritMode("add");
  };

  // Add demerit to student and notify parents (store translation key & vars, handle plural)
  const handleSubmitDemerit = async () => {
    if (
      !demeritStudent ||
      !demeritReason ||
      demeritPoints <= 0 ||
      !teacher ||
      !user
    )
      return;
    setDemeritLoading(true);

    try {
      const points =
        demeritMode === "add"
          ? Math.abs(demeritPoints)
          : -Math.abs(demeritPoints);
      const newRecord: DemeritRecord = {
        points,
        reason: demeritReason,
        date: new Date().toISOString(),
        teacher: teacher?.name ?? "",
      };
      const studentRef = doc(db, "users", demeritStudent.uid);
      const studentSnap = await getDoc(studentRef);
      let prevDemerits: DemeritRecord[] = [];
      if (studentSnap.exists()) {
        prevDemerits = studentSnap.data().demerits || [];
      }
      await updateDoc(studentRef, {
        demerits: [...prevDemerits, newRecord],
      });

      // Log the demerit assignment for POPIA compliance
      try {
        const functions = getFunctions();
        const logUserEdit = httpsCallable(functions, "logUserEdit");
        const action = points > 0 ? "Added" : "Removed";
        await logUserEdit({
          userId: demeritStudent.uid,
          changes: {
            demerits: {
              new: `${action} ${Math.abs(
                points
              )} demerit point(s): ${demeritReason}`,
            },
          },
          editorId: user.uid,
          reason: `Teacher ${
            teacher.name
          } ${action.toLowerCase()} demerit points`,
        });
      } catch (logError) {
        console.warn("Failed to log demerit assignment:", logError);
      }

      // --- Notify parents (store translationKey & translationVars, handle plural) ---
      const parentsQuery = query(
        collection(db, "users"),
        where("role", "==", "parent"),
        where("children", "array-contains", demeritStudent.uid)
      );
      const parentsSnap = await getDocs(parentsQuery);
      const pointsAbs = Math.abs(points);
      const plural = pointsAbs > 1 ? "s" : "";
      let translationKey = "";
      if (points > 0) {
        translationKey = "demerit_notification_message_add";
      } else {
        translationKey = "demerit_notification_message_remove";
      }
      const notification = {
        id: `${demeritStudent.uid}_${Date.now()}`,
        title: "new_demerit_assigned",
        translationKey,
        translationVars: {
          student: demeritStudent.name,
          points: pointsAbs,
          plural,
          reason: demeritReason,
        },
        date: new Date().toISOString(),
        type: "demerit",
        acknowledged: false,
        studentUid: demeritStudent.uid,
        demerit: newRecord,
      };
      for (const parentDoc of parentsSnap.docs) {
        const parentRef = doc(db, "users", parentDoc.id);
        await updateDoc(parentRef, {
          notifications: arrayUnion(notification),
        });
      }
    } catch (error) {
      console.error("Error submitting demerit:", error);
    } finally {
      setDemeritLoading(false);
      handleCloseDemerit();
    }
  };

  // --- Submit Report Card ---
  const handleSubmitReportCard = async (student: StudentProfile) => {
    if (!user || !teacher) return;
    setSubmittingReportUid(student.uid);

    try {
      const { term, year } = getCurrentTerm();
      const report: ReportCard = {
        term,
        year,
        issuedAt: new Date().toISOString(),
        subjects: buildReportSubjects(student),
        demerits: (student.demerits || []).reduce(
          (sum, d) => sum + d.points,
          0
        ),
        teacher: teacher?.name || "",
        grade: student.grade,
        homeroomClass: student.homeroomClass,
      };
      const studentRef = doc(db, "users", student.uid);
      const studentSnap = await getDoc(studentRef);
      let prevReports: ReportCard[] = [];
      if (studentSnap.exists()) {
        prevReports = studentSnap.data().reports || [];
      }
      await updateDoc(studentRef, {
        reports: [...prevReports, report],
      });

      // Log the report card generation for POPIA compliance
      try {
        const functions = getFunctions();
        const logUserEdit = httpsCallable(functions, "logUserEdit");
        await logUserEdit({
          userId: student.uid,
          changes: {
            reports: {
              new: `Generated report card for Term ${term} ${year}`,
            },
          },
          editorId: user.uid,
          reason: `Teacher ${teacher.name} generated report card for Term ${term} ${year}`,
        });
      } catch (logError) {
        console.warn("Failed to log report card generation:", logError);
      }

      setReportCardToShow(report);
      setReportStudent(student);
    } catch (error) {
      console.error("Error generating report card:", error);
    } finally {
      setSubmittingReportUid(null);
    }
  };

  // --- Acknowledgement tracking logic ---
  const openAcknowledgementModal = async (
    student: StudentProfile,
    type: "mark" | "demerit",
    markOrDemerit: Mark | DemeritRecord
  ) => {
    setAckModal((prev) => ({
      ...prev,
      open: true,
      student,
      markOrDemerit,
      type,
      acknowledgements: [],
      loading: true,
    }));

    const parentsQuery = query(
      collection(db, "users"),
      where("role", "==", "parent"),
      where("children", "array-contains", student.uid)
    );
    const parentsSnap = await getDocs(parentsQuery);
    const acknowledgements: ParentAcknowledgement[] = [];
    let ackStats: AckStats = { total: 0, acknowledged: 0 };

    for (const parentDoc of parentsSnap.docs) {
      const parentData = parentDoc.data();
      const parentName = parentData.name || parentDoc.id;
      const acknowledgedNotifications: string[] =
        parentData.acknowledgedNotifications || [];
      let notifId = "";
      if (type === "mark" && (markOrDemerit as Mark).date) {
        const notifications = parentData.notifications || [];
        const notif = notifications.find(
          (n: any) =>
            n.type === "mark" &&
            n.studentUid === student.uid &&
            n.mark?.date === (markOrDemerit as Mark).date
        );
        notifId = notif?.id || "";
      } else if (type === "demerit" && (markOrDemerit as DemeritRecord).date) {
        const notifications = parentData.notifications || [];
        const notif = notifications.find(
          (n: any) =>
            n.type === "demerit" &&
            n.studentUid === student.uid &&
            n.demerit?.date === (markOrDemerit as DemeritRecord).date
        );
        notifId = notif?.id || "";
      }
      const isAck = notifId
        ? acknowledgedNotifications.includes(notifId)
        : false;
      acknowledgements.push({
        parentName,
        acknowledged: isAck,
      });
      ackStats.total += 1;
      if (isAck) ackStats.acknowledged += 1;
    }
    let key = "";
    if (type === "mark") {
      key = `mark_${student.uid}_${(markOrDemerit as Mark).date}`;
    } else {
      key = `demerit_${student.uid}_${(markOrDemerit as DemeritRecord).date}`;
    }
    setAckStatsCache((prev) => ({
      ...prev,
      [key]: ackStats,
    }));

    setAckModal((prev) => ({
      ...prev,
      acknowledgements,
      loading: false,
    }));
  };

  // Notification search filter (for subject view)
  const filterNotification = (
    student: StudentProfile,
    markOrDemerit: Mark | DemeritRecord,
    type: "mark" | "demerit"
  ): boolean => {
    const search = notificationSearch.toLowerCase();
    if (type === "mark") {
      const mark = markOrDemerit as Mark;
      return (
        student.name.toLowerCase().includes(search) ||
        mark.subject.toLowerCase().includes(search) ||
        (mark.description
          ? mark.description.toLowerCase().includes(search)
          : false)
      );
    } else {
      const d = markOrDemerit as DemeritRecord;
      return (
        student.name.toLowerCase().includes(search) ||
        (d.reason ? d.reason.toLowerCase().includes(search) : false)
      );
    }
  };

  const getLatestDemeritAckStats = (student: StudentProfile) => {
    if (!student.demerits || student.demerits.length === 0) return null;
    const latest = student.demerits[student.demerits.length - 1];
    const key = `demerit_${student.uid}_${latest.date}`;
    const stats = ackStatsCache[key];
    return stats ? { ...stats, date: latest.date } : null;
  };

  // Preload ack stats for latest demerit for each student
  useEffect(() => {
    const preloadAckStats = async () => {
      for (const student of students) {
        if (!student.demerits || student.demerits.length === 0) continue;
        const latest = student.demerits[student.demerits.length - 1];
        const key = `demerit_${student.uid}_${latest.date}`;
        if (ackStatsCache[key]) continue;
        // Fetch parent acknowledgements for this demerit
        const parentsQuery = query(
          collection(db, "users"),
          where("role", "==", "parent"),
          where("children", "array-contains", student.uid)
        );
        const parentsSnap = await getDocs(parentsQuery);
        let ackStats: AckStats = { total: 0, acknowledged: 0 };
        for (const parentDoc of parentsSnap.docs) {
          const parentData = parentDoc.data();
          const acknowledgedNotifications: string[] =
            parentData.acknowledgedNotifications || [];
          const notifications = parentData.notifications || [];
          const notif = notifications.find(
            (n: any) =>
              n.type === "demerit" &&
              n.studentUid === student.uid &&
              n.demerit?.date === latest.date
          );
          const notifId = notif?.id || "";
          const isAck = notifId
            ? acknowledgedNotifications.includes(notifId)
            : false;
          ackStats.total += 1;
          if (isAck) ackStats.acknowledged += 1;
        }
        setAckStatsCache((prev) => ({
          ...prev,
          [key]: ackStats,
        }));
      }
    };
    if (students.length > 0) {
      preloadAckStats();
    }
    // eslint-disable-next-line
  }, [students]);

  // --- Get all unique grades for filter dropdown ---
  const allGrades = Array.from(
    new Set(
      allStudents
        .map((s) => s.grade)
        .filter((g): g is string => !!g && g.trim().length > 0)
    )
  ).sort((a, b) => {
    const na = parseInt(a);
    const nb = parseInt(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });

  const { term, year } = getCurrentTerm();

  // Bulk marks modal logic
  const handleOpenBulkMark = (subject: string) => {
    setBulkMarkSubject(subject);
    const studentsForSubject = allStudents.filter(
      (student) =>
        student.subjects &&
        student.subjects
          .map((s) => s.trim().toLowerCase())
          .includes(subject.trim().toLowerCase()) &&
        (gradeFilter ? (student.grade || "") === gradeFilter : true) &&
        (subjectFilter ? subject === subjectFilter : true)
    );
    setBulkMarkScores(
      studentsForSubject.map((student) => ({
        student,
        score: 0,
      }))
    );
    setBulkMarkDescription("");
    setBulkMarkTotal(0);
    setBulkMarkOpen(true);
  };

  const handleBulkMarkScoreChange = (idx: number, value: number) => {
    setBulkMarkScores((prev) =>
      prev.map((entry, i) => (i === idx ? { ...entry, score: value } : entry))
    );
  };

  const handleSubmitBulkMarks = async () => {
    if (!bulkMarkDescription.trim() || bulkMarkTotal <= 0 || !teacher || !user)
      return;
    setBulkMarkLoading(true); // DISABLE BUTTON

    try {
      const functions = getFunctions();
      const logUserEdit = httpsCallable(functions, "logUserEdit");

      for (const entry of bulkMarkScores) {
        if (entry.score >= 0) {
          const newMark: Mark = {
            subject: bulkMarkSubject,
            score: entry.score,
            total: bulkMarkTotal,
            description: bulkMarkDescription,
            date: new Date().toISOString(),
            teacher: teacher?.name || "",
          };
          const studentRef = doc(db, "users", entry.student.uid);
          const studentSnap = await getDoc(studentRef);
          let prevMarks: Mark[] = [];
          if (studentSnap.exists()) {
            prevMarks = studentSnap.data().marks || [];
          }
          await updateDoc(studentRef, {
            marks: [...prevMarks, newMark],
          });

          // Log the bulk mark assignment for POPIA compliance
          try {
            await logUserEdit({
              userId: entry.student.uid,
              changes: {
                marks: {
                  new: `Bulk assigned mark: ${entry.score}/${bulkMarkTotal} for ${bulkMarkSubject} - ${bulkMarkDescription}`,
                },
              },
              editorId: user.uid,
              reason: `Teacher ${teacher.name} bulk assigned marks for ${bulkMarkSubject}`,
            });
          } catch (logError) {
            console.warn(
              `Failed to log bulk mark assignment for student ${entry.student.uid}:`,
              logError
            );
          }

          // Notify parents
          const parentsQuery = query(
            collection(db, "users"),
            where("role", "==", "parent"),
            where("children", "array-contains", entry.student.uid)
          );
          const parentsSnap = await getDocs(parentsQuery);
          const percentage = ((entry.score / bulkMarkTotal) * 100).toFixed(1);
          const notification = {
            id: `${entry.student.uid}_${Date.now()}`,
            title: "new_mark_assigned",
            translationKey: "mark_notification_message",
            translationVars: {
              student: entry.student.name,
              percentage,
              description: bulkMarkDescription,
            },
            date: new Date().toISOString(),
            type: "mark",
            acknowledged: false,
            studentUid: entry.student.uid,
            mark: newMark,
          };
          for (const parentDoc of parentsSnap.docs) {
            const parentRef = doc(db, "users", parentDoc.id);
            await updateDoc(parentRef, {
              notifications: arrayUnion(notification),
            });
          }
        }
      }
    } catch (error) {
      console.error("Error submitting bulk marks:", error);
    }

    setBulkMarkOpen(false);
    setBulkMarkScores([]);
    setBulkMarkSubject("");
    setBulkMarkDescription("");
    setBulkMarkTotal(0);
    setAllStudentsLoading(true);
    const usersSnap = await getDocs(collection(db, "users"));
    const students: StudentProfile[] = [];
    usersSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.role === "student") {
        students.push({
          name: data.name,
          email: data.email,
          grade: data.grade,
          subjects: Array.isArray(data.subjects)
            ? data.subjects.filter(
                (s: any) => typeof s === "string" && s.trim().length > 0
              )
            : [],
          uid: docSnap.id,
          homeroomClass: data.homeroomClass,
          demerits: data.demerits || [],
          marks: data.marks || [],
          reports: data.reports || [],
        });
      }
    });
    setAllStudents(students);
    setAllStudentsLoading(false);
    setBulkMarkLoading(false); // ENABLE BUTTON
  };

  return (
    <div className="tdash-mob-bg">
      {/* Sidebar for desktop */}
      <Sidebar
        teacherName={teacher?.name || ""}
        teacherEmail={teacher?.email || ""}
        onSettings={() => setSettingsOpen(true)}
        onLogout={handleSignOut}
        onTemplates={() => setCurrentPage("templates")}
        onAnalytics={() => setShowMarkAnalytics(true)}
        t={t}
      />

      {/* Settings Modal */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        homeroomEdit={homeroomEdit}
        setHomeroomEdit={setHomeroomEdit}
        homeroomSaving={homeroomSaving}
        onSaveHomeroom={handleSaveHomeroom}
        language={language}
        setLanguage={(lang) => {
          setLanguage(lang);
          i18n.changeLanguage(lang);
        }}
        availableLanguages={[
          { code: "en", label: "English" },
          { code: "af", label: "Afrikaans" },
        ]}
        t={t}
        // Add these props to SettingsModal if not already present:
        theme={theme}
        setTheme={setTheme}
        themeOptions={themeOptions}
      />

      <main className="tdash-mob-main">
        {currentPage === "templates" ? (
          <MarkTemplatesPage
            teacherId={user?.uid || ""}
            onTemplateSelect={(template) => {
              setMarkTemplates([...markTemplates, template]);
              setCurrentPage("dashboard");
            }}
            t={t}
            onBack={() => setCurrentPage("dashboard")}
          />
        ) : (
          <>
            {/* Extracurriculars */}
            <section className="tdash-mob-section">
              <ExtracurricularManager />
            </section>

            {/* Homeroom Students Search */}
            <section className="tdash-mob-section">
              <input
                type="text"
                className="tdash-mob-search"
                placeholder={t("search_students") || "Search students..."}
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
            </section>

            {/* Homeroom Students */}
            <section className="tdash-mob-section">
              <div className="tdash-mob-section-title">
                <span role="img" aria-label="students">
                  👨‍🎓
                </span>{" "}
                {t("homeroom_students")}
                <button
                  className="tdash-mob-btn"
                  style={{
                    marginLeft: 16,
                    fontSize: "0.95em",
                    padding: "0.2em 0.7em",
                  }}
                  onClick={() => setManageHomeroomOpen(true)}
                >
                  {t("manage_homeroom")}
                </button>
              </div>
              {studentsLoading ? (
                <div className="tdash-mob-loading">{t("loading_students")}</div>
              ) : students.length === 0 ? (
                <div className="tdash-mob-empty">
                  {t("no_students_assigned")}
                </div>
              ) : (
                <div className="tdash-mob-card-list">
                  {students
                    .filter((student) => {
                      const search = studentSearch.toLowerCase();
                      return (
                        student.name.toLowerCase().includes(search) ||
                        (student.email &&
                          student.email.toLowerCase().includes(search)) ||
                        (student.grade &&
                          student.grade.toLowerCase().includes(search))
                      );
                    })
                    .map((student) => {
                      const totalDemerits = (student.demerits || []).reduce(
                        (sum, d) => sum + d.points,
                        0
                      );
                      const latestAckStats = getLatestDemeritAckStats(student);
                      const latestReport =
                        student.reports &&
                        student.reports
                          .filter((r) => r.term === term && r.year === year)
                          .sort(
                            (a, b) =>
                              new Date(b.issuedAt).getTime() -
                              new Date(a.issuedAt).getTime()
                          )[0];
                      return (
                        <StudentCard
                          key={student.uid}
                          student={student}
                          totalDemerits={totalDemerits}
                          latestAckStats={latestAckStats}
                          latestReport={latestReport}
                          translateGrade={translateGrade}
                          t={t}
                          onAddDemerit={(s) => handleOpenDemerit(s, "add")}
                          onRemoveDemerit={(s) =>
                            handleOpenDemerit(s, "remove")
                          }
                          onShowReport={(s, report) => {
                            setReportStudent(s);
                            setReportCardToShow(report || null);
                          }}
                          onSubmitReport={handleSubmitReportCard}
                          submittingReportUid={submittingReportUid}
                          onShowAckDetails={(student, demerit) =>
                            openAcknowledgementModal(
                              student,
                              "demerit",
                              demerit
                            )
                          }
                        />
                      );
                    })}
                </div>
              )}
            </section>

            {/* Subject Section Search */}
            <section className="tdash-mob-section">
              <input
                type="text"
                className="tdash-mob-search"
                placeholder={
                  t("search_notifications") || "Search notifications..."
                }
                value={notificationSearch}
                onChange={(e) => setNotificationSearch(e.target.value)}
              />
            </section>

            {/* Subject Section FilterBar */}
            <section className="tdash-mob-section">
              <FilterBar
                gradeFilter={gradeFilter}
                subjectFilter={subjectFilter}
                grades={allGrades}
                subjects={teacher?.subjects || []}
                t={t}
                onGradeChange={setGradeFilter}
                onSubjectChange={setSubjectFilter}
              />
              <div className="tdash-mob-section-title">
                <span role="img" aria-label="books">
                  📚
                </span>{" "}
                {t("your_students_by_subject")}
              </div>
              {allStudentsLoading ? (
                <div className="tdash-mob-loading">{t("loading_students")}</div>
              ) : !teacher ||
                !teacher.subjects ||
                teacher.subjects.length === 0 ? (
                <div className="tdash-mob-empty">
                  {t("no_subjects_assigned")}
                </div>
              ) : allStudents.length === 0 ? (
                <div className="tdash-mob-empty">{t("no_students_found")}</div>
              ) : (
                teacher.subjects
                  .filter(
                    (subject) => !subjectFilter || subject === subjectFilter
                  )
                  .map((subject) => (
                    <SubjectBlock
                      key={subject}
                      subject={subject}
                      students={allStudents.filter((student) =>
                        student.subjects
                          ? student.subjects
                              .map((s) => s.trim().toLowerCase())
                              .includes(subject.trim().toLowerCase())
                          : false
                      )}
                      gradeFilter={gradeFilter}
                      t={t}
                      translateGrade={translateGrade}
                      onOpenBulkMark={handleOpenBulkMark}
                      onOpenMark={handleOpenMark}
                      onOpenDemerit={handleOpenDemerit}
                      openAcknowledgementModal={openAcknowledgementModal}
                      notificationSearch={notificationSearch}
                      filterNotification={filterNotification}
                    />
                  ))
              )}
            </section>

            {/* Official Report Card Modal */}
            {reportStudent && (
              <ReportCardModal
                report={
                  reportCardToShow
                    ? reportCardToShow
                    : {
                        term,
                        year,
                        issuedAt: new Date().toISOString(),
                        subjects: buildReportSubjects(reportStudent),
                        demerits: (reportStudent.demerits || []).reduce(
                          (sum, d) => sum + d.points,
                          0
                        ),
                        teacher: teacher?.name || "",
                        grade: reportStudent.grade,
                        homeroomClass: reportStudent.homeroomClass,
                      }
                }
                studentName={reportStudent.name}
                onClose={() => {
                  setReportStudent(null);
                  setReportCardToShow(null);
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <AcknowledgementModal
        open={ackModal.open}
        onClose={() =>
          setAckModal({
            open: false,
            student: null,
            markOrDemerit: null,
            type: null,
            acknowledgements: [],
            loading: false,
          })
        }
        acknowledgements={ackModal.acknowledgements}
        loading={ackModal.loading}
        t={t}
      />

      <EnhancedAddMarkModal
        open={!!markStudent}
        onClose={handleCloseMark}
        student={markStudent}
        subject={markSubject}
        setSubject={setMarkSubject}
        score={markScore}
        setScore={setMarkScore}
        total={markTotal}
        setTotal={setMarkTotal}
        description={markDesc}
        setDescription={setMarkDesc}
        onSubmit={handleSubmitMark}
        loading={markLoading}
        t={t}
        availableSubjects={teacher?.subjects || []}
        recentMarks={recentMarks}
        markTemplates={markTemplates}
      />

      <EnhancedBulkMarkModal
        open={bulkMarkOpen}
        onClose={() => setBulkMarkOpen(false)}
        subject={bulkMarkSubject}
        scores={bulkMarkScores}
        setScore={handleBulkMarkScoreChange}
        description={bulkMarkDescription}
        setDescription={setBulkMarkDescription}
        total={bulkMarkTotal}
        setTotal={setBulkMarkTotal}
        onSubmit={handleSubmitBulkMarks}
        loading={bulkMarkLoading}
        t={t}
      />

      <DemeritModal
        open={!!demeritStudent}
        onClose={handleCloseDemerit}
        student={demeritStudent}
        mode={demeritMode}
        points={demeritPoints}
        setPoints={setDemeritPoints}
        reason={demeritReason}
        setReason={setDemeritReason}
        onSubmit={handleSubmitDemerit}
        loading={demeritLoading}
        t={t}
      />

      <ManageHomeroomModal
        open={manageHomeroomOpen}
        onClose={() => setManageHomeroomOpen(false)}
        candidates={homeroomCandidates}
        selected={selectedHomeroomStudents}
        setSelected={setSelectedHomeroomStudents}
        loading={homeroomManageLoading}
        search={homeroomSearch}
        setSearch={setHomeroomSearch}
        onSave={handleSaveHomeroomStudents}
        t={t}
        teacherHomeroomClass={teacher?.homeroomClass}
      />

      {/* Mark Analytics Modal */}
      {showMarkAnalytics && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              maxWidth: "95vw",
              maxHeight: "95vh",
              overflow: "auto",
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowMarkAnalytics(false)}
              style={{
                position: "absolute",
                top: "10px",
                right: "15px",
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                zIndex: 1001,
              }}
            >
              ×
            </button>
            <MarkAnalytics teacherId={user?.uid || ""} t={t} />
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherDash;
