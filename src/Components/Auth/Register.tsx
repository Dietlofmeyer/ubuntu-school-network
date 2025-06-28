import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import { useAuth } from "../../AuthContext";
import { useTranslation } from "react-i18next";
import { SUBJECTS } from "../../data/constants";
import { SecureRegistrationService } from "../../utils/secureRegistration";
import type { RegistrationToken } from "../../utils/secureRegistration";
import "./Register.css";

const EyeIcon = ({
  visible,
  onClick,
}: {
  visible: boolean;
  onClick: () => void;
}) => (
  <span
    onClick={onClick}
    style={{
      cursor: "pointer",
      position: "absolute",
      right: 12,
      top: "50%",
      transform: "translateY(-50%)",
      color: "#888",
      zIndex: 2,
      fontSize: 18,
      userSelect: "none",
    }}
    aria-label={visible ? "Hide password" : "Show password"}
    tabIndex={0}
    role="button"
  >
    {visible ? (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
        <path
          stroke="currentColor"
          strokeWidth="2"
          d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      </svg>
    ) : (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
        <path
          stroke="currentColor"
          strokeWidth="2"
          d="M3 3l18 18M1 12s4-7 11-7c2.5 0 4.7.7 6.5 1.8M23 12s-4 7-11 7c-2.5 0-4.7-.7-6.5-1.8"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      </svg>
    )}
  </span>
);

function Register() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);

  // Token-based registration state
  const [registrationToken, setRegistrationToken] =
    useState<RegistrationToken | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [tokenError, setTokenError] = useState("");

  // Step 1 fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 2 fields
  const [address, setAddress] = useState("");
  const [address2, setAddress2] = useState("");
  const [address3, setAddress3] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [achievements, setAchievements] = useState("");
  const [awards, setAwards] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // Token validation effect
  useEffect(() => {
    const validateToken = async () => {
      const token = searchParams.get("token");

      if (token) {
        setTokenLoading(true);
        setTokenError("");

        try {
          const tokenData = await SecureRegistrationService.validateToken(
            token
          );

          if (tokenData) {
            setRegistrationToken(tokenData);
            setEmail(tokenData.email);
            setSchoolId(tokenData.schoolId);
            setUserRole(tokenData.role);

            // Pre-fill metadata if available
            if (tokenData.metadata?.name) {
              // For student registration, name might be pre-filled
              // We'll handle this in the step 2 logic
            }

            // Skip to step 2 for token-based registration
            setStep(2);
          } else {
            setTokenError(
              t("invalid_or_expired_token") ||
                "Invalid or expired registration token"
            );
          }
        } catch (error) {
          console.error("Token validation error:", error);
          setTokenError(
            t("token_validation_failed") ||
              "Failed to validate registration token"
          );
        }

        setTokenLoading(false);
      } else {
        setTokenLoading(false);
      }
    };

    validateToken();
  }, [searchParams, t]);

  useEffect(() => {
    if (user && profile) {
      if (profile.role === "principal") navigate("/admin-dashboard");
      // Add other roles if needed
    }
  }, [user, profile, navigate]);

  // Store schoolId and role for use in step 2
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Handle subject selection for teachers
  const handleSubjectToggle = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  };

  // Step 1: Validate email and password, check school or personnel exists
  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("passwords_do_not_match") || "Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // 1. Check if this is a principal registration (schools collection)
      const schoolQuery = query(
        collection(db, "schools"),
        where("principalEmail", "==", email.trim().toLowerCase())
      );
      const schoolSnapshot = await getDocs(schoolQuery);

      if (!schoolSnapshot.empty) {
        // Principal registration
        const schoolDoc = schoolSnapshot.docs[0];
        setSchoolId(schoolDoc.id);
        setUserRole("principal");
        setStep(2);
        setLoading(false);
        return;
      }

      // 2. Check if this is a personnel registration (users collection)
      const userQuery = query(
        collection(db, "users"),
        where("email", "==", email.trim().toLowerCase())
      );
      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) {
        setError(
          t("email_not_linked_to_school") ||
            "This email is not linked to any school registration. Please contact your administrator."
        );
        setLoading(false);
        return;
      }

      // Get schoolId and role from user doc
      const userDoc = userSnapshot.docs[0];
      setSchoolId(userDoc.data().schoolId);
      setUserRole(userDoc.data().role);
      setStep(2);
    } catch (err: any) {
      setError(err.message || t("registration_failed"));
    }
    setLoading(false);
  };

  // Step 2: Collect details and create user
  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate password for token-based registration
    if (registrationToken && password !== confirmPassword) {
      setError(t("passwords_do_not_match") || "Passwords do not match.");
      return;
    }

    // Validate teacher subjects
    if (userRole === "teacher" && selectedSubjects.length === 0) {
      setError(
        t("please_select_at_least_one_subject") ||
          "Please select at least one subject"
      );
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Use the UID from userCredential directly!
      const uid = userCredential.user.uid;

      if (!uid) {
        setError(
          "Registration failed: Could not get user ID. Please try again."
        );
        setLoading(false);
        return;
      }

      // Handle token-based registration
      if (registrationToken) {
        const userData: any = {
          email: email.trim().toLowerCase(),
          role: userRole,
          schoolId,
          registered: true,
          address,
          address2,
          address3,
          phone,
          createdAt: serverTimestamp(),
          ...registrationToken.metadata, // Include any pre-filled data
        };

        // Add role-specific data
        if (userRole === "teacher") {
          userData.subjects = selectedSubjects;
          userData.achievements = achievements
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean);
          userData.awards = awards
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean);
        }

        await setDoc(doc(db, "users", uid), userData, { merge: true });

        // Mark token as used
        if (registrationToken.id) {
          await SecureRegistrationService.markTokenAsUsed(registrationToken.id);
        }
      } else if (userRole === "principal") {
        // Principal registration
        const userData = {
          email,
          role: "principal",
          schoolId,
          address,
          address2,
          address3,
          phone,
          createdAt: serverTimestamp(),
        };

        await setDoc(doc(db, "users", uid), userData);

        await setDoc(
          doc(db, "schools", schoolId!),
          { principalRegistered: true, principalUid: uid },
          { merge: true }
        );
      } else if (userRole === "guardian" || userRole === "teacher") {
        // Fetch pre-created doc to get name (and other info if needed)
        const userQuery = query(
          collection(db, "users"),
          where("email", "==", email.trim().toLowerCase())
        );
        const userSnapshot = await getDocs(userQuery);
        let name = "";
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          name = userDoc.data().name || "";
        }

        await setDoc(
          doc(db, "users", uid),
          {
            email,
            role: userRole,
            schoolId,
            registered: true,
            address,
            address2,
            address3,
            phone,
            name,
            subjects: userRole === "teacher" ? selectedSubjects : [],
            achievements:
              userRole === "teacher"
                ? achievements
                    .split(",")
                    .map((a) => a.trim())
                    .filter(Boolean)
                : [],
            awards:
              userRole === "teacher"
                ? awards
                    .split(",")
                    .map((a) => a.trim())
                    .filter(Boolean)
                : [],
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
        // No need to delete pre-created docs here; Cloud Function will handle it
      } else if (userRole === "student") {
        // Fetch pre-created doc to get guardians, name, and grade
        const userQuery = query(
          collection(db, "users"),
          where("email", "==", email.trim().toLowerCase())
        );
        const userSnapshot = await getDocs(userQuery);
        let name = "";
        let guardians: string[] = [];
        let grade = "";
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          name = userDoc.data().name || "";
          // Robust fallback for guardians field:
          const g = userDoc.data().guardians;
          if (Array.isArray(g)) {
            guardians = g;
          } else if (typeof g === "string" && g) {
            guardians = [g];
          } else {
            guardians = [];
          }
          grade = userDoc.data().grade || "";
        }

        await setDoc(
          doc(db, "users", uid),
          {
            email,
            role: "student",
            schoolId,
            registered: true,
            address,
            address2,
            address3,
            phone,
            name,
            guardians, // always an array now
            grade,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
        // Cloud Function will handle cleanup
      } else {
        // Personnel registration (admin, staff, etc.)
        const userQuery = query(
          collection(db, "users"),
          where("email", "==", email.trim().toLowerCase())
        );
        const userSnapshot = await getDocs(userQuery);
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          const { role, schoolId, name } = userDoc.data();

          await setDoc(
            doc(db, "users", uid),
            {
              email: email.trim().toLowerCase(),
              role,
              schoolId,
              name: name || "",
              registered: true,
              address,
              address2,
              address3,
              phone,
              createdAt: serverTimestamp(),
            },
            { merge: true }
          );
          // No need to delete pre-created docs here; Cloud Function will handle it
        }
      }

      if (userRole === "principal" || userRole === "admin") {
        navigate("/admin-dashboard");
      } else if (userRole === "teacher") {
        navigate("/teachers");
      } else if (userRole === "staff") {
        navigate("/staff");
      } else if (userRole === "guardian" || userRole === "parent") {
        navigate("/guardians");
      } else {
        navigate("/");
      }

      // Check if profile is ready, retry if not
      let profileReady = false;
      for (let i = 0; i < 10; i++) {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          profileReady = true;
          break;
        }
        await new Promise((res) => setTimeout(res, 500));
      }
      if (profileReady) {
        await signInWithEmailAndPassword(auth, email, password);
        // Redirect or let AuthContext handle it
      } else {
        setError(
          "Account setup is taking longer than expected. Please try again in a minute."
        );
      }
    } catch (err: any) {
      setError(err.message || t("registration_failed"));
    }
    setLoading(false);
  };

  useEffect(() => {
    // Code can be updated here if needed for debugging
  }, [auth.currentUser, user]);

  return (
    <div className="register-bg">
      {tokenLoading ? (
        <div className="register-card">
          <h2 className="register-title">
            {t("validating_invitation") || "Validating Invitation..."}
          </h2>
          <div className="register-loading">
            <div className="spinner"></div>
            <p>{t("please_wait") || "Please wait..."}</p>
          </div>
        </div>
      ) : tokenError ? (
        <div className="register-card">
          <h2 className="register-title">
            {t("registration_error") || "Registration Error"}
          </h2>
          <div className="register-error">{tokenError}</div>
          <p className="register-info">
            {t("contact_administrator_for_new_invitation") ||
              "Please contact your administrator for a new invitation link."}
          </p>
        </div>
      ) : (
        <form
          className="register-card"
          onSubmit={step === 1 ? handleStep1 : handleStep2}
        >
          <h2 className="register-title">
            {step === 1
              ? t("register")
              : userRole === "principal"
              ? t("welcome_principal") || "Welcome!"
              : t("welcome_personnel") || "Welcome!"}
          </h2>
          {error && <div className="register-error">{error}</div>}

          {step === 1 && (
            <>
              <div className="register-input-group">
                <input
                  type="email"
                  placeholder={t("email")}
                  value={email}
                  autoComplete="username"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="register-input"
                />
              </div>
              <div
                className="register-input-group"
                style={{ position: "relative" }}
              >
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={t("password")}
                  value={password}
                  autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="register-input"
                />
                <EyeIcon
                  visible={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                />
              </div>
              <div
                className="register-input-group"
                style={{ position: "relative" }}
              >
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder={t("confirm_password") || "Confirm Password"}
                  value={confirmPassword}
                  autoComplete="new-password"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="register-input"
                />
                <EyeIcon
                  visible={showConfirm}
                  onClick={() => setShowConfirm((v) => !v)}
                />
              </div>
              <button type="submit" className="register-btn" disabled={loading}>
                {loading ? t("checking") || "Checking..." : t("next") || "Next"}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="register-welcome">
                <p>
                  {userRole === "principal"
                    ? t("welcome_principal_details") ||
                      "Welcome! Please complete your details below."
                    : userRole === "student"
                    ? t("welcome_student_details") ||
                      "Welcome! Please complete your student profile below."
                    : t("welcome_personnel_details") ||
                      "Welcome! Please complete your details below."}
                </p>
              </div>

              {/* Show password fields for token-based registration */}
              {registrationToken && (
                <>
                  <div className="register-input-group">
                    <input
                      type="email"
                      placeholder={t("email")}
                      value={email}
                      disabled
                      className="register-input register-input-disabled"
                    />
                  </div>
                  <div
                    className="register-input-group"
                    style={{ position: "relative" }}
                  >
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder={t("password")}
                      value={password}
                      autoComplete="new-password"
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="register-input"
                    />
                    <EyeIcon
                      visible={showPassword}
                      onClick={() => setShowPassword((v) => !v)}
                    />
                  </div>
                  <div
                    className="register-input-group"
                    style={{ position: "relative" }}
                  >
                    <input
                      type={showConfirm ? "text" : "password"}
                      placeholder={t("confirm_password") || "Confirm Password"}
                      value={confirmPassword}
                      autoComplete="new-password"
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="register-input"
                    />
                    <EyeIcon
                      visible={showConfirm}
                      onClick={() => setShowConfirm((v) => !v)}
                    />
                  </div>
                </>
              )}

              <div className="register-input-group">
                <input
                  type="text"
                  placeholder={t("address_line_1") || "Address Line 1"}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  className="register-input"
                />
              </div>
              <div className="register-input-group">
                <input
                  type="text"
                  placeholder={t("address_line_2") || "Address Line 2"}
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                  className="register-input"
                />
              </div>
              <div className="register-input-group">
                <input
                  type="text"
                  placeholder={t("address_line_3") || "Address Line 3"}
                  value={address3}
                  onChange={(e) => setAddress3(e.target.value)}
                  className="register-input"
                />
              </div>
              <div className="register-input-group">
                <input
                  type="tel"
                  placeholder={t("phone_number") || "Phone Number"}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="register-input"
                />
              </div>
              {userRole === "teacher" && (
                <>
                  <div className="register-input-group">
                    <label className="register-label">
                      {t("subjects_taught") || "Subjects Taught"}
                    </label>
                    <div className="subjects-selection">
                      {SUBJECTS.map((subject) => (
                        <label key={subject} className="subject-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedSubjects.includes(subject)}
                            onChange={() => handleSubjectToggle(subject)}
                          />
                          <span className="subject-name">
                            {t(subject) || subject}
                          </span>
                        </label>
                      ))}
                    </div>
                    {selectedSubjects.length === 0 && (
                      <p className="selection-warning">
                        {t("please_select_at_least_one_subject") ||
                          "Please select at least one subject"}
                      </p>
                    )}
                  </div>
                  <div className="register-input-group">
                    <input
                      type="text"
                      placeholder="Achievements (comma separated)"
                      value={achievements}
                      onChange={(e) => setAchievements(e.target.value)}
                      className="register-input"
                    />
                  </div>
                  <div className="register-input-group">
                    <input
                      type="text"
                      placeholder="Awards (comma separated)"
                      value={awards}
                      onChange={(e) => setAwards(e.target.value)}
                      className="register-input"
                    />
                  </div>
                </>
              )}
              <button type="submit" className="register-btn" disabled={loading}>
                {loading ? t("registering") : t("register")}
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}

export default Register;
