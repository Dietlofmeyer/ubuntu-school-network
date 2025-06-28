import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../AuthContext";
import { useTheme } from "../../ThemeContext";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { db, auth } from "../../firebase";

interface ContactInfo {
  id?: string;
  type: "phone" | "email" | "address";
  value: string;
  primary: boolean;
  label: string;
}

interface EmergencyContact {
  id?: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

const GuardianSettings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const { theme, setTheme } = useTheme();

  // Profile settings
  const [firstName, setFirstName] = useState(
    profile?.name?.split(" ")[0] || ""
  );
  const [lastName, setLastName] = useState(
    profile?.name?.split(" ").slice(1).join(" ") || ""
  );
  const [email, setEmail] = useState(profile?.email || user?.email || "");
  const [contactInfo, setContactInfo] = useState<ContactInfo[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<
    EmergencyContact[]
  >([]);

  // Security settings
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [academicUpdates, setAcademicUpdates] = useState(true);
  const [eventReminders, setEventReminders] = useState(true);

  // Communication preferences
  const [preferredLanguage, setPreferredLanguage] = useState(i18n.language);
  const [preferredContactMethod, setPreferredContactMethod] = useState("email");
  const [availableHours, setAvailableHours] = useState("9:00-17:00");

  // UI state
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeSection, setActiveSection] = useState("profile");

  useEffect(() => {
    loadUserSettings();
  }, [user]);

  const loadUserSettings = async () => {
    if (!user?.uid) return;

    try {
      // Load contact information
      const contactQuery = query(
        collection(db, "contactInfo"),
        where("guardianId", "==", user.uid)
      );
      const contactSnapshot = await getDocs(contactQuery);
      const contacts = contactSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ContactInfo[];
      setContactInfo(contacts);

      // Load emergency contacts
      const emergencyQuery = query(
        collection(db, "emergencyContacts"),
        where("guardianId", "==", user.uid)
      );
      const emergencySnapshot = await getDocs(emergencyQuery);
      const emergencies = emergencySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as EmergencyContact[];
      setEmergencyContacts(emergencies);
    } catch (error) {
      // Error loading user settings
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (user?.uid) {
        await updateDoc(doc(db, "users", user.uid), {
          name: `${firstName} ${lastName}`.trim(),
          email,
          updatedAt: new Date(),
        });

        setMessage(t("Profile updated successfully"));
      }
    } catch (error) {
      setMessage(t("Error updating profile"));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (newPassword !== confirmPassword) {
      setMessage(t("Passwords do not match"));
      setLoading(false);
      return;
    }

    try {
      if (user && auth.currentUser) {
        // Re-authenticate user
        const credential = EmailAuthProvider.credential(
          user.email!,
          currentPassword
        );
        await reauthenticateWithCredential(auth.currentUser, credential);

        // Update password
        await updatePassword(auth.currentUser, newPassword);

        setMessage(t("Password updated successfully"));
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error) {
      setMessage(
        t("Error updating password. Please check your current password.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (lang: string) => {
    setPreferredLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const addContactInfo = async () => {
    try {
      const newContact: ContactInfo = {
        type: "phone",
        value: "",
        primary: false,
        label: "New Contact",
      };

      const docRef = await addDoc(collection(db, "contactInfo"), {
        ...newContact,
        guardianId: user?.uid,
      });

      setContactInfo([...contactInfo, { ...newContact, id: docRef.id }]);
    } catch (error) {
      // Error adding contact info
    }
  };

  const updateContactInfo = async (id: string, field: string, value: any) => {
    try {
      await updateDoc(doc(db, "contactInfo", id), { [field]: value });

      setContactInfo((prev) =>
        prev.map((contact) =>
          contact.id === id ? { ...contact, [field]: value } : contact
        )
      );
    } catch (error) {
      // Error updating contact info
    }
  };

  const removeContactInfo = async (id: string) => {
    try {
      await deleteDoc(doc(db, "contactInfo", id));
      setContactInfo((prev) => prev.filter((contact) => contact.id !== id));
    } catch (error) {
      // Error removing contact info
    }
  };

  const addEmergencyContact = async () => {
    try {
      const newContact: EmergencyContact = {
        name: "",
        relationship: "",
        phone: "",
      };

      const docRef = await addDoc(collection(db, "emergencyContacts"), {
        ...newContact,
        guardianId: user?.uid,
      });

      setEmergencyContacts([
        ...emergencyContacts,
        { ...newContact, id: docRef.id },
      ]);
    } catch (error) {
      // Error adding emergency contact
    }
  };

  return (
    <div className="guardian-tab-content">
      <div className="tab-header">
        <h2>{t("Settings")}</h2>
        <p className="tab-description">
          {t(
            "Manage your account settings, preferences, and contact information"
          )}
        </p>
      </div>

      <div className="settings-navigation">
        <div className="settings-nav">
          {[
            "profile",
            "security",
            "notifications",
            "communication",
            "privacy",
          ].map((section) => (
            <button
              key={section}
              className={`nav-item ${
                activeSection === section ? "active" : ""
              }`}
              onClick={() => setActiveSection(section)}
            >
              {t(section)}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div
          className={`message ${
            message.includes("Error") ? "error" : "success"
          }`}
        >
          {message}
        </div>
      )}

      <div className="settings-content">
        {activeSection === "profile" && (
          <div className="settings-section">
            <h3>{t("Profile Information")}</h3>
            <form onSubmit={handleProfileUpdate} className="settings-form">
              <div className="form-row">
                <div className="form-group">
                  <label>{t("First Name")}</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t("Last Name")}</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{t("Email Address")}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? t("Updating...") : t("Update Profile")}
              </button>
            </form>

            <div className="contact-info-section">
              <h4>{t("Contact Information")}</h4>
              {contactInfo.map((contact) => (
                <div key={contact.id} className="contact-item">
                  <select
                    value={contact.type}
                    onChange={(e) =>
                      updateContactInfo(contact.id!, "type", e.target.value)
                    }
                  >
                    <option value="phone">{t("Phone")}</option>
                    <option value="email">{t("Email")}</option>
                    <option value="address">{t("Address")}</option>
                  </select>
                  <input
                    type="text"
                    value={contact.value}
                    onChange={(e) =>
                      updateContactInfo(contact.id!, "value", e.target.value)
                    }
                    placeholder={t("Contact value")}
                  />
                  <input
                    type="text"
                    value={contact.label}
                    onChange={(e) =>
                      updateContactInfo(contact.id!, "label", e.target.value)
                    }
                    placeholder={t("Label")}
                  />
                  <button
                    type="button"
                    onClick={() => removeContactInfo(contact.id!)}
                    className="btn-danger-small"
                  >
                    ✗
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addContactInfo}
                className="btn-secondary"
              >
                {t("Add Contact Info")}
              </button>
            </div>
          </div>
        )}

        {activeSection === "security" && (
          <div className="settings-section">
            <h3>{t("Security Settings")}</h3>
            <form onSubmit={handlePasswordChange} className="settings-form">
              <div className="form-group">
                <label>{t("Current Password")}</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t("New Password")}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t("Confirm New Password")}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? t("Updating...") : t("Change Password")}
              </button>
            </form>
          </div>
        )}

        {activeSection === "notifications" && (
          <div className="settings-section">
            <h3>{t("Notification Preferences")}</h3>
            <div className="preferences-grid">
              <label className="preference-item">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                />
                <span>{t("Email Notifications")}</span>
              </label>

              <label className="preference-item">
                <input
                  type="checkbox"
                  checked={smsNotifications}
                  onChange={(e) => setSmsNotifications(e.target.checked)}
                />
                <span>{t("SMS Notifications")}</span>
              </label>

              <label className="preference-item">
                <input
                  type="checkbox"
                  checked={academicUpdates}
                  onChange={(e) => setAcademicUpdates(e.target.checked)}
                />
                <span>{t("Academic Progress Updates")}</span>
              </label>

              <label className="preference-item">
                <input
                  type="checkbox"
                  checked={eventReminders}
                  onChange={(e) => setEventReminders(e.target.checked)}
                />
                <span>{t("School Event Reminders")}</span>
              </label>
            </div>
          </div>
        )}

        {activeSection === "communication" && (
          <div className="settings-section">
            <h3>{t("Communication Preferences")}</h3>
            <div className="settings-form">
              <div className="form-group">
                <label>{t("Preferred Language")}</label>
                <select
                  value={preferredLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                >
                  <option value="en">{t("English")}</option>
                  <option value="af">{t("Afrikaans")}</option>
                </select>
              </div>

              <div className="form-group">
                <label>{t("Theme")}</label>
                <button
                  type="button"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="theme-toggle-btn"
                >
                  {theme === "dark" ? "🌞 Light Mode" : "🌙 Dark Mode"}
                </button>
              </div>

              <div className="form-group">
                <label>{t("Preferred Contact Method")}</label>
                <select
                  value={preferredContactMethod}
                  onChange={(e) => setPreferredContactMethod(e.target.value)}
                >
                  <option value="email">{t("Email")}</option>
                  <option value="phone">{t("Phone")}</option>
                  <option value="sms">{t("SMS")}</option>
                </select>
              </div>

              <div className="form-group">
                <label>{t("Available Hours")}</label>
                <input
                  type="text"
                  value={availableHours}
                  onChange={(e) => setAvailableHours(e.target.value)}
                  placeholder="e.g., 9:00-17:00"
                />
              </div>
            </div>

            <div className="emergency-contacts-section">
              <h4>{t("Emergency Contacts")}</h4>
              {emergencyContacts.map((contact) => (
                <div key={contact.id} className="emergency-contact-item">
                  <input
                    type="text"
                    value={contact.name}
                    onChange={(e) => {
                      const updated = emergencyContacts.map((c) =>
                        c.id === contact.id ? { ...c, name: e.target.value } : c
                      );
                      setEmergencyContacts(updated);
                    }}
                    placeholder={t("Contact Name")}
                  />
                  <input
                    type="text"
                    value={contact.relationship}
                    onChange={(e) => {
                      const updated = emergencyContacts.map((c) =>
                        c.id === contact.id
                          ? { ...c, relationship: e.target.value }
                          : c
                      );
                      setEmergencyContacts(updated);
                    }}
                    placeholder={t("Relationship")}
                  />
                  <input
                    type="tel"
                    value={contact.phone}
                    onChange={(e) => {
                      const updated = emergencyContacts.map((c) =>
                        c.id === contact.id
                          ? { ...c, phone: e.target.value }
                          : c
                      );
                      setEmergencyContacts(updated);
                    }}
                    placeholder={t("Phone Number")}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addEmergencyContact}
                className="btn-secondary"
              >
                {t("Add Emergency Contact")}
              </button>
            </div>
          </div>
        )}

        {activeSection === "privacy" && (
          <div className="settings-section">
            <h3>{t("Privacy & Data")}</h3>
            <div className="privacy-section">
              <p>
                {t(
                  "Your privacy is important to us. Here you can manage your data preferences."
                )}
              </p>

              <div className="privacy-options">
                <label className="preference-item">
                  <input type="checkbox" defaultChecked />
                  <span>
                    {t("Allow data processing for academic reporting")}
                  </span>
                </label>

                <label className="preference-item">
                  <input type="checkbox" defaultChecked />
                  <span>
                    {t("Share anonymous usage data to improve the platform")}
                  </span>
                </label>

                <label className="preference-item">
                  <input type="checkbox" defaultChecked />
                  <span>
                    {t("Allow communication from school administrators")}
                  </span>
                </label>
              </div>

              <div className="data-actions">
                <button className="btn-secondary">
                  {t("Download My Data")}
                </button>
                <button className="btn-danger">{t("Delete Account")}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuardianSettings;
