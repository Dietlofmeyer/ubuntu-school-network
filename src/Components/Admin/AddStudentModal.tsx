import React, { useState } from "react";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { SecureRegistrationService } from "../../utils/secureRegistration";
import { useTranslation } from "react-i18next";
import { useErrorModal } from "../../hooks/useErrorModal";
import { ErrorModal } from "../ErrorReporting";

type Props = {
  guardianId: string; // The guardian to link this student to
  schoolId: string;
  adminId: string; // ID of the admin creating the invitation
  onClose: () => void;
  onStudentAdded: (student: any) => void;
};

const AddStudentModal: React.FC<Props> = ({
  guardianId,
  schoolId,
  adminId,
  onClose,
  onStudentAdded,
}) => {
  const { t } = useTranslation();
  const {
    errorModal,
    isErrorModalOpen,
    showCustomError,
    showErrorFromException,
    hideError,
  } = useErrorModal();
  const [form, setForm] = useState({
    name: "",
    email: "",
    grade: "",
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registrationUrl, setRegistrationUrl] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      // Check for existing user with same email
      const q = query(
        collection(db, "users"),
        where("email", "==", form.email.trim().toLowerCase())
      );
      const existing = await getDocs(q);
      if (!existing.empty) {
        showCustomError(
          t("user_already_exists") || "User Already Exists",
          t("user_already_exists_with_email") ||
            "A user with this email already exists."
        );
        setSaving(false);
        return;
      }

      // Create secure registration token
      const token = await SecureRegistrationService.createRegistrationToken({
        email: form.email.trim().toLowerCase(),
        role: "student",
        schoolId,
        createdBy: adminId,
        metadata: {
          guardianId,
          grade: form.grade,
          name: form.name,
        },
      });

      // Generate registration URL
      const url = SecureRegistrationService.generateRegistrationUrl(token);
      setRegistrationUrl(url);

      // Send invitation (in real implementation, this would send an email)
      await SecureRegistrationService.sendRegistrationInvitation(
        form.email,
        token,
        "student"
      );

      setSuccess(true);

      // Create pending student record in Firestore
      const studentData = {
        name: form.name,
        email: form.email.trim().toLowerCase(),
        grade: form.grade,
        role: "student",
        schoolId,
        guardians: [guardianId],
        registered: false,
        status: "pending",
        invitationSent: true,
        invitedAt: new Date().toISOString(),
        registrationToken: token,
        createdBy: adminId,
      };

      // Save to Firestore users collection
      const studentDocRef = await addDoc(collection(db, "users"), studentData);

      onStudentAdded({ id: studentDocRef.id, ...studentData });
    } catch (err) {
      console.error("Error creating student invitation:", err);
      showErrorFromException(
        err,
        t("failed_to_create_invitation") || "Failed to Create Invitation",
        `Student: ${form.name}, Email: ${form.email}, Grade: ${form.grade}`
      );
    }
    setSaving(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(registrationUrl);
      // Show success feedback (could be enhanced with a toast notification)
      alert(
        t("registration_url_copied") || "Registration URL copied to clipboard!"
      );
    } catch (err) {
      console.error("Failed to copy URL:", err);
      showErrorFromException(
        err,
        t("copy_failed") || "Copy Failed",
        "Failed to copy registration URL to clipboard"
      );
    }
  };

  return (
    <>
      <div className="manage-user-modal">
        <div className="modal-header">
          <h2>{t("add_student") || "Add Student"}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {!success ? (
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label>{t("student_name") || "Student Name"}</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder={t("enter_student_name") || "Enter student name"}
                required
              />
            </div>

            <div className="form-group">
              <label>{t("student_email") || "Student Email"}</label>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder={t("enter_student_email") || "Enter student email"}
                type="email"
                required
              />
            </div>

            <div className="form-group">
              <label>{t("grade") || "Grade"}</label>
              <select
                name="grade"
                value={form.grade}
                onChange={handleChange}
                required
              >
                <option value="">{t("select_grade") || "Select Grade"}</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={`Grade ${i + 1}`}>
                    Grade {i + 1}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={onClose}
                disabled={saving}
              >
                {t("cancel") || "Cancel"}
              </button>
              <button type="submit" className="submit-btn" disabled={saving}>
                {saving ? (
                  <>
                    <span className="loading-spinner"></span>
                    {t("creating_invitation") || "Creating Invitation..."}
                  </>
                ) : (
                  <>
                    <span className="icon">📧</span>
                    {t("send_invitation") || "Send Invitation"}
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="success-state">
            <div className="success-icon">✅</div>
            <h3>{t("invitation_sent") || "Invitation Sent!"}</h3>
            <p>
              {t("secure_invitation_created") ||
                "A secure registration invitation has been created for the student."}
            </p>

            <div className="registration-url-section">
              <label>{t("registration_url") || "Registration URL:"}</label>
              <div className="url-container">
                <input
                  type="text"
                  value={registrationUrl}
                  readOnly
                  className="url-input"
                />
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="copy-btn"
                  title={t("copy_url") || "Copy URL"}
                >
                  📋
                </button>
              </div>
            </div>

            <div className="info-note">
              <p>
                <strong>{t("note") || "Note"}:</strong>{" "}
                {t("share_url_securely") ||
                  "Share this URL securely with the student or their guardian. The link will expire in 48 hours."}
              </p>
            </div>

            <div className="modal-actions">
              <button className="done-btn" onClick={onClose}>
                {t("done") || "Done"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Modal */}
      {isErrorModalOpen && errorModal && (
        <ErrorModal
          isOpen={isErrorModalOpen}
          onClose={hideError}
          error={errorModal}
        />
      )}
    </>
  );
};

export default AddStudentModal;
