// Academic Management Utilities
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import type { SubjectSelection, TeacherAssignment } from "../types/academic";

// Get available subjects for a school (POPIA compliant approach)
export const getAvailableSubjects = async (
  schoolId: string
): Promise<string[]> => {
  try {
    // First, try to get from the dedicated availableSubjects collection (POPIA compliant)
    const availableSubjectsDoc = await getDoc(
      doc(db, "availableSubjects", schoolId)
    );

    if (availableSubjectsDoc.exists()) {
      const data = availableSubjectsDoc.data();
      return data.subjects || [];
    }

    // Fallback: Create the availableSubjects document by querying teachers (admin function)
    // This should ideally be done by admin/teacher roles, not students
    const teachersQuery = query(
      collection(db, "users"),
      where("schoolId", "==", schoolId),
      where("role", "==", "teacher")
    );

    const teachersSnapshot = await getDocs(teachersQuery);
    const availableSubjects = new Set<string>();

    teachersSnapshot.forEach((doc) => {
      const teacherData = doc.data();

      // Check both possible field names for teacher subjects
      let subjectsList: string[] = [];

      if (
        teacherData.teachingSubjects &&
        Array.isArray(teacherData.teachingSubjects)
      ) {
        subjectsList = teacherData.teachingSubjects;
      } else if (teacherData.subjects && Array.isArray(teacherData.subjects)) {
        subjectsList = teacherData.subjects;
      }

      // Add subjects to the available set
      subjectsList.forEach((subject: string) => {
        if (subject && subject.trim()) {
          availableSubjects.add(subject.trim());
        }
      });
    });

    const subjectsArray = Array.from(availableSubjects).sort();

    // Store in the dedicated collection for future POPIA-compliant access
    try {
      await updateDoc(doc(db, "availableSubjects", schoolId), {
        subjects: subjectsArray,
        lastUpdated: serverTimestamp(),
        schoolId: schoolId,
      });
    } catch (createError) {
      // If document doesn't exist, create it
      await addDoc(collection(db, "availableSubjects"), {
        subjects: subjectsArray,
        lastUpdated: serverTimestamp(),
        schoolId: schoolId,
      });
    }

    return subjectsArray;
  } catch (error) {
    // Return empty array on error - don't provide fake subjects
    return [];
  }
};

// Admin utility: Refresh available subjects for a school (POPIA compliant)
export const refreshAvailableSubjects = async (
  schoolId: string
): Promise<void> => {
  try {
    const teachersQuery = query(
      collection(db, "users"),
      where("schoolId", "==", schoolId),
      where("role", "==", "teacher")
    );

    const teachersSnapshot = await getDocs(teachersQuery);
    const availableSubjects = new Set<string>();

    teachersSnapshot.forEach((doc) => {
      const teacherData = doc.data();
      let subjectsList: string[] = [];

      if (
        teacherData.teachingSubjects &&
        Array.isArray(teacherData.teachingSubjects)
      ) {
        subjectsList = teacherData.teachingSubjects;
      } else if (teacherData.subjects && Array.isArray(teacherData.subjects)) {
        subjectsList = teacherData.subjects;
      }

      subjectsList.forEach((subject: string) => {
        if (subject && subject.trim()) {
          availableSubjects.add(subject.trim());
        }
      });
    });

    const subjectsArray = Array.from(availableSubjects).sort();

    // Update the dedicated collection
    await updateDoc(doc(db, "availableSubjects", schoolId), {
      subjects: subjectsArray,
      lastUpdated: serverTimestamp(),
      schoolId: schoolId,
    });
  } catch (error) {
    throw error;
  }
};

// Submit subject selection for student
export const submitSubjectSelection = async (
  studentUid: string,
  guardianUid: string,
  schoolId: string,
  subjects: string[],
  academicYear: string
): Promise<string> => {
  try {
    const selectionData: Omit<SubjectSelection, "id"> = {
      studentUid,
      guardianUid,
      schoolId,
      subjects,
      status: "pending",
      requestDate: serverTimestamp(),
      academicYear,
    };

    const docRef = await addDoc(
      collection(db, "subjectSelections"),
      selectionData
    );

    // Create notification for guardian
    await addDoc(collection(db, "notifications"), {
      type: "subject_approval_pending",
      recipientUid: guardianUid,
      recipientRole: "guardian",
      title: "Subject Selection Approval Required",
      message: `Please review and approve subject selections for your child.`,
      data: {
        studentUid,
        subjects,
        selectionId: docRef.id,
      },
      read: false,
      createdAt: serverTimestamp(),
      schoolId,
    });

    return docRef.id;
  } catch (error) {
    throw error;
  }
};

// Approve subject selection
export const approveSubjectSelection = async (
  selectionId: string,
  guardianUid: string
): Promise<void> => {
  try {
    const selectionRef = doc(db, "subjectSelections", selectionId);

    // First, verify that the guardian is authorized to approve this selection
    const selectionDoc = await getDoc(selectionRef);
    if (!selectionDoc.exists()) {
      throw new Error("Subject selection not found");
    }

    const selectionData = selectionDoc.data() as SubjectSelection;

    if (selectionData.guardianUid !== guardianUid) {
      throw new Error(
        "Unauthorized: You are not authorized to approve this selection"
      );
    }

    await updateDoc(selectionRef, {
      status: "approved",
      approvalDate: serverTimestamp(),
    });

    // Update student profile with approved subjects
    const studentRef = doc(db, "users", selectionData.studentUid);
    const approvedSubjects = selectionData.subjects || [];

    // Update the student profile
    await updateDoc(studentRef, {
      approvedSubjects: approvedSubjects,
      selectedSubjects: approvedSubjects,
    });

    // Notify admin for teacher assignment
    await addDoc(collection(db, "notifications"), {
      type: "teacher_assignment_required",
      recipientUid: "admin", // This should be actual admin UIDs
      recipientRole: "admin",
      title: "Teacher Assignment Required",
      message: `Student subject selection approved. Teacher assignment needed.`,
      data: {
        studentUid: selectionData.studentUid,
        subjects: approvedSubjects, // Use the safety-checked array
        selectionId,
      },
      read: false,
      createdAt: serverTimestamp(),
      schoolId: selectionData.schoolId,
    });
  } catch (error) {
    throw error;
  }
};

// Reject subject selection
export const rejectSubjectSelection = async (
  selectionId: string,
  guardianUid: string,
  rejectionReason?: string
): Promise<void> => {
  try {
    const selectionRef = doc(db, "subjectSelections", selectionId);

    // First, verify that the guardian is authorized to reject this selection
    const selectionDoc = await getDoc(selectionRef);
    if (!selectionDoc.exists()) {
      throw new Error("Subject selection not found");
    }

    const selectionData = selectionDoc.data() as SubjectSelection;

    if (selectionData.guardianUid !== guardianUid) {
      throw new Error(
        "Unauthorized: You are not authorized to reject this selection"
      );
    }

    // Get student name for notifications
    const studentDoc = await getDoc(doc(db, "users", selectionData.studentUid));
    const studentData = studentDoc.exists() ? studentDoc.data() : null;
    const studentName = studentData
      ? studentData.name ||
        `${studentData.firstName || ""} ${studentData.lastName || ""}`.trim()
      : "Unknown Student";

    await updateDoc(selectionRef, {
      status: "rejected",
      rejectionDate: serverTimestamp(),
      rejectionReason: rejectionReason || "Guardian rejected the selection",
    });

    // Notify student about rejection
    await addDoc(collection(db, "notifications"), {
      type: "subject_selection_rejected",
      recipientUid: selectionData.studentUid,
      recipientRole: "student",
      title: "Subject Selection Rejected",
      message: `Your subject selection has been rejected by your guardian. Please revise and resubmit.`,
      data: {
        selectionId,
        rejectionReason: rejectionReason || "Guardian rejected the selection",
        subjects: selectionData.subjects || [], // Safety check for undefined subjects
      },
      read: false,
      createdAt: serverTimestamp(),
      schoolId: selectionData.schoolId,
    });

    // Also notify academic staff
    await addDoc(collection(db, "notifications"), {
      type: "subject_selection_rejected",
      recipientRole: "academic",
      title: "Subject Selection Rejected",
      message: `Student subject selection rejected by guardian: ${studentName}`,
      data: {
        studentUid: selectionData.studentUid,
        studentName: studentName,
        selectionId,
        rejectionReason: rejectionReason || "Guardian rejected the selection",
      },
      read: false,
      createdAt: serverTimestamp(),
      schoolId: selectionData.schoolId,
    });
  } catch (error) {
    throw error;
  }
};

// Assign student to teacher for subjects
export const assignStudentToTeachers = async (
  studentUid: string,
  subjectTeacherMap: { [subject: string]: string },
  schoolId: string,
  academicYear: string
): Promise<void> => {
  try {
    const batch = writeBatch(db);
    const assignments: TeacherAssignment[] = [];

    // Create teacher assignments
    for (const [subject, teacherUid] of Object.entries(subjectTeacherMap)) {
      const assignmentRef = doc(collection(db, "teacherAssignments"));
      const assignment: TeacherAssignment = {
        id: assignmentRef.id,
        teacherUid,
        studentUid,
        subject,
        schoolId,
        academicYear,
        assignedDate: serverTimestamp(),
        status: "active",
      };

      batch.set(assignmentRef, assignment);
      assignments.push(assignment);
    }

    // Update student profile with current teachers
    const studentRef = doc(db, "users", studentUid);
    batch.update(studentRef, {
      currentTeachers: subjectTeacherMap,
    });

    await batch.commit();

    // Create notifications for student and teachers
    await addDoc(collection(db, "notifications"), {
      type: "teacher_assigned",
      recipientUid: studentUid,
      recipientRole: "student",
      title: "Teachers Assigned",
      message: `You have been assigned to teachers for your selected subjects.`,
      data: { assignments },
      read: false,
      createdAt: serverTimestamp(),
      schoolId,
    });
  } catch (error) {
    throw error;
  }
};

// Get teacher capacity for subjects
export const getTeacherSubjectCapacity = async (
  schoolId: string,
  academicYear: string
): Promise<{
  [teacherUid: string]: { [subject: string]: { current: number; max: number } };
}> => {
  try {
    const assignmentsQuery = query(
      collection(db, "teacherAssignments"),
      where("schoolId", "==", schoolId),
      where("academicYear", "==", academicYear),
      where("status", "==", "active")
    );

    const assignmentsSnapshot = await getDocs(assignmentsQuery);
    const capacity: {
      [teacherUid: string]: {
        [subject: string]: { current: number; max: number };
      };
    } = {};

    // Count current assignments
    assignmentsSnapshot.forEach((doc) => {
      const assignment = doc.data() as TeacherAssignment;
      if (!capacity[assignment.teacherUid]) {
        capacity[assignment.teacherUid] = {};
      }
      if (!capacity[assignment.teacherUid][assignment.subject]) {
        capacity[assignment.teacherUid][assignment.subject] = {
          current: 0,
          max: 30,
        }; // Default max
      }
      capacity[assignment.teacherUid][assignment.subject].current++;
    });

    // Get teacher max capacities
    const teachersQuery = query(
      collection(db, "users"),
      where("schoolId", "==", schoolId),
      where("role", "==", "teacher")
    );

    const teachersSnapshot = await getDocs(teachersQuery);
    teachersSnapshot.forEach((doc) => {
      const teacher = doc.data();
      if (teacher.maxStudentsPerSubject && capacity[doc.id]) {
        Object.keys(capacity[doc.id]).forEach((subject) => {
          capacity[doc.id][subject].max = teacher.maxStudentsPerSubject;
        });
      }
    });

    return capacity;
  } catch (error) {
    return {};
  }
};

// Auto-assign students to teachers based on availability
export const autoAssignStudentToTeachers = async (
  _studentUid: string,
  subjects: string[],
  schoolId: string,
  academicYear: string
): Promise<{ [subject: string]: string }> => {
  try {
    const capacity = await getTeacherSubjectCapacity(schoolId, academicYear);
    const assignments: { [subject: string]: string } = {};

    // Get available teachers for each subject
    const teachersQuery = query(
      collection(db, "users"),
      where("schoolId", "==", schoolId),
      where("role", "==", "teacher")
    );

    const teachersSnapshot = await getDocs(teachersQuery);
    const teachersBySubject: { [subject: string]: string[] } = {};

    teachersSnapshot.forEach((doc) => {
      const teacher = doc.data();
      if (teacher.teachingSubjects) {
        teacher.teachingSubjects.forEach((subject: string) => {
          if (!teachersBySubject[subject]) {
            teachersBySubject[subject] = [];
          }
          teachersBySubject[subject].push(doc.id);
        });
      }
    });

    // Assign students to teachers with lowest current load
    for (const subject of subjects) {
      const availableTeachers = teachersBySubject[subject] || [];
      let bestTeacher: string | null = null;
      let lowestLoad = Infinity;

      for (const teacherUid of availableTeachers) {
        const teacherCapacity = capacity[teacherUid]?.[subject];
        const currentLoad = teacherCapacity?.current || 0;
        const maxLoad = teacherCapacity?.max || 30;

        if (currentLoad < maxLoad && currentLoad < lowestLoad) {
          lowestLoad = currentLoad;
          bestTeacher = teacherUid;
        }
      }

      if (bestTeacher) {
        assignments[subject] = bestTeacher;
      } else {
        throw new Error(`No available teacher for subject: ${subject}`);
      }
    }

    return assignments;
  } catch (error) {
    throw error;
  }
};

// Get pending subject selections for guardians
export const getPendingSubjectSelections = async (
  guardianUid: string
): Promise<SubjectSelection[]> => {
  try {
    // Now using proper database sorting with the created index
    const selectionsQuery = query(
      collection(db, "subjectSelections"),
      where("guardianUid", "==", guardianUid),
      where("status", "==", "pending"),
      orderBy("requestDate", "desc")
    );

    const snapshot = await getDocs(selectionsQuery);
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as SubjectSelection)
    );
  } catch (error) {
    return [];
  }
};

// Get students without subject selections
export const getStudentsWithoutSubjects = async (
  schoolId: string
): Promise<any[]> => {
  try {
    const studentsQuery = query(
      collection(db, "users"),
      where("schoolId", "==", schoolId),
      where("role", "==", "student")
    );

    const snapshot = await getDocs(studentsQuery);
    const studentsWithoutSubjects = [];

    for (const doc of snapshot.docs) {
      const student = doc.data();
      if (!student.selectedSubjects || student.selectedSubjects.length === 0) {
        studentsWithoutSubjects.push({ id: doc.id, ...student });
      }
    }

    return studentsWithoutSubjects;
  } catch (error) {
    return [];
  }
};

// Get teachers without teaching subjects
export const getTeachersWithoutSubjects = async (
  schoolId: string
): Promise<any[]> => {
  try {
    const teachersQuery = query(
      collection(db, "users"),
      where("schoolId", "==", schoolId),
      where("role", "==", "teacher")
    );

    const snapshot = await getDocs(teachersQuery);
    const teachersWithoutSubjects = [];

    for (const doc of snapshot.docs) {
      const teacher = doc.data();
      if (!teacher.teachingSubjects || teacher.teachingSubjects.length === 0) {
        teachersWithoutSubjects.push({ id: doc.id, ...teacher });
      }
    }

    return teachersWithoutSubjects;
  } catch (error) {
    return [];
  }
};
