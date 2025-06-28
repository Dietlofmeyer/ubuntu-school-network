// Quick setup script to populate availableSubjects collection for existing schools
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export const initializeAvailableSubjects = async (
  schoolId: string
): Promise<void> => {
  try {
    // Get all teachers for this school
    const teachersQuery = query(
      collection(db, "users"),
      where("schoolId", "==", schoolId),
      where("role", "==", "teacher")
    );

    const teachersSnapshot = await getDocs(teachersQuery);
    const availableSubjects = new Set<string>();

    teachersSnapshot.forEach((docSnapshot) => {
      const teacherData = docSnapshot.data();

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

    if (subjectsArray.length > 0) {
      // Store in the availableSubjects collection
      await setDoc(doc(db, "availableSubjects", schoolId), {
        subjects: subjectsArray,
        lastUpdated: serverTimestamp(),
        schoolId: schoolId,
      });
    }

    return;
  } catch (error) {
    throw error;
  }
};
