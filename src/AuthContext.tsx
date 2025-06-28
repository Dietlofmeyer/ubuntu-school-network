// src/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

type User = {
  uid: string;
  email: string;
};

type Profile = {
  name: string;
  email: string;
  role: string;
  language?: string;
  schoolId?: string;
  subjects?: string[];
  achievements?: string[];
  awards?: string[];
  // Academic Management Extensions
  teachingSubjects?: string[]; // For teachers
  maxStudentsPerSubject?: number; // For teachers
  homeroomStudents?: string[]; // For homeroom teachers
  selectedSubjects?: string[]; // For students
  approvedSubjects?: string[]; // For students
  homeroomTeacher?: string; // For students
  currentTeachers?: { [subject: string]: string }; // For students
  pendingSubjectApprovals?: {
    // For guardians
    [studentUid: string]: {
      subjects: string[];
      requestDate: any; // Firestore timestamp
      status: "pending" | "approved" | "rejected";
    };
  };
  grade?: string; // For students
  linkedChildren?: string[]; // For guardians
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({ uid: firebaseUser.uid, email: firebaseUser.email ?? "" }); // <-- FIXED
        const ref = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);
        const data = snap.exists() ? snap.data() : null;
        setProfile(data as Profile | null);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
