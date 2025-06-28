import { useEffect, useState } from "react";
import { useAuth } from "../../AuthContext";
import { db, auth } from "../../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  query,
  where,
  getDocs,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import Modal from "../Modal/Modal";
import ParentSettingsModal from "./ParentSettingsModal";
import "./ParentDash.css";
import { useTranslation } from "react-i18next";
import ParentChildList from "./ParentChildList";
import ParentNotifications from "./ParentNotifications";
import { useTheme } from "../../ThemeContext";

type ChildProfile = {
  uid: string;
  name: string;
  grade?: string;
  homeroomClass?: string;
  progress?: string;
};

function ParentDash() {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const { theme, setTheme, themeOptions } = useTheme();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState<string>(i18n.language);

  // Link child modal state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [linkStatus, setLinkStatus] = useState<null | string>(null);
  const [linkLoading, setLinkLoading] = useState(false);

  // Fetch linked children
  useEffect(() => {
    if (!user) return;
    const fetchChildren = async () => {
      setLoading(true);
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      let childIds: string[] = [];
      if (userSnap.exists()) {
        childIds = userSnap.data().children || [];
      }
      if (childIds.length === 0) {
        setChildren([]);
        setLoading(false);
        return;
      }
      const childDocs = await Promise.all(
        childIds.map((id) => getDoc(doc(db, "users", id)))
      );
      const childProfiles: ChildProfile[] = [];
      childDocs.forEach((snap, idx) => {
        if (snap.exists()) {
          const data = snap.data();
          childProfiles.push({
            uid: childIds[idx],
            name: data.name,
            grade: data.grade,
            homeroomClass: data.homeroomClass,
            progress: data.progress || "",
          });
        }
      });
      setChildren(childProfiles);
      setLoading(false);
    };
    fetchChildren();
  }, [user, showLinkModal]);

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

  const handleSignOut = async () => {
    await signOut(auth);
    window.location.reload();
  };

  // Link child logic (supports UID or email, always stores UID)
  const handleLinkChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkStatus(null);
    setLinkLoading(true);
    const input = linkInput.trim();
    if (!input) {
      setLinkStatus(t("enter_child_uids_or_emails"));
      setLinkLoading(false);
      return;
    }
    let childId = "";
    let childSnap: any = null;
    // Try as UID
    try {
      const tryUidSnap = await getDoc(doc(db, "users", input));
      if (tryUidSnap.exists() && tryUidSnap.data().role === "student") {
        childId = input;
        childSnap = tryUidSnap;
      }
    } catch {}
    // Try as email if not found by UID
    if (!childId) {
      try {
        const q = query(
          collection(db, "users"),
          where("email", "==", input),
          where("role", "==", "student")
        );
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          const docSnap = querySnap.docs[0];
          childId = docSnap.id;
          childSnap = docSnap;
        }
      } catch {}
    }
    if (!childSnap) {
      setLinkStatus(t("child_not_found_or_not_student"));
      setLinkLoading(false);
      return;
    }
    // Prevent duplicate linking
    const parentRef = doc(db, "users", user!.uid);
    const parentSnap = await getDoc(parentRef);
    const existingChildren: string[] = parentSnap.exists()
      ? parentSnap.data().children || []
      : [];
    if (existingChildren.includes(childId)) {
      setLinkStatus(t("child_already_linked") || "Child already linked.");
      setLinkLoading(false);
      return;
    }
    // Add child UID to parent's children array
    try {
      await updateDoc(parentRef, {
        children: arrayUnion(childId),
      });
      setLinkStatus(t("child_linked_successfully"));
      setLinkInput("");
    } catch {
      setLinkStatus(t("link_failed"));
    }
    setLinkLoading(false);
  };

  // Request child deletion
  const handleRequestChildDeletion = async (
    childId: string,
    name: string,
    homeroomClass?: string
  ) => {
    if (!user) return;
    // Add a document to the deletionRequests collection
    await addDoc(collection(db, "deletionRequests"), {
      requestType: "child",
      targetId: childId,
      requestedBy: user.uid,
      childName: name,
      homeroomClass: homeroomClass || "", // Provide a value or fallback
      timestamp: serverTimestamp(),
      status: "pending",
    });
  };

  return (
    <div className="parentdash-bg">
      <header className="parentdash-header">
        <div className="parentdash-title">{t("parent_dashboard")}</div>
        <button
          className="parentdash-settings-btn"
          onClick={() => setShowSettings(true)}
        >
          {t("settings")}
        </button>
      </header>

      {/* Settings Modal with account deletion */}
      <ParentSettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        t={t}
        profile={profile}
        theme={theme}
        setTheme={setTheme}
        themeOptions={themeOptions}
        language={language}
        handleLanguageChange={handleLanguageChange}
      />

      {/* Link Child Modal */}
      <Modal
        open={showLinkModal}
        onClose={() => {
          setShowLinkModal(false);
          setLinkStatus(null);
          setLinkInput("");
        }}
        ariaLabel={t("link_child")}
      >
        <h2 style={{ marginTop: 0 }}>{t("link_child")}</h2>
        <form onSubmit={handleLinkChild}>
          <input
            type="text"
            placeholder={t("enter_child_uids_or_emails")}
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              marginBottom: "1rem",
              borderRadius: 6,
              border: "1px solid #7bb0ff",
              fontSize: "1rem",
            }}
          />
          <button
            type="submit"
            style={{
              background: "#7bb0ff",
              color: "#232946",
              border: "none",
              borderRadius: 8,
              padding: "0.5rem 1.2rem",
              fontWeight: 600,
              fontSize: "1rem",
              cursor: "pointer",
              marginRight: 8,
            }}
            disabled={linkLoading}
          >
            {linkLoading ? t("linking") : t("link")}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowLinkModal(false);
              setLinkStatus(null);
              setLinkInput("");
            }}
            style={{
              background: "#b0b8c1",
              color: "#232946",
              border: "none",
              borderRadius: 8,
              padding: "0.5rem 1.2rem",
              fontWeight: 600,
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            {t("cancel")}
          </button>
        </form>
        {linkStatus && (
          <div style={{ marginTop: 12, color: "#e74c3c", fontWeight: 500 }}>
            {linkStatus}
          </div>
        )}
      </Modal>

      <main className="parentdash-main">
        <ParentNotifications />
        {loading ? (
          <div className="parentdash-loading">{t("loading_dashboard")}</div>
        ) : children.length === 0 ? (
          <div className="parentdash-empty">
            {t("no_children_linked")}
            <div style={{ marginTop: 16 }}>
              <button
                className="parentdash-settings-btn"
                onClick={() => setShowLinkModal(true)}
              >
                {t("link_child")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <ParentChildList childrenList={children} />
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <button
                className="parentdash-settings-btn"
                onClick={() => setShowLinkModal(true)}
              >
                {t("link_another_child")}
              </button>
            </div>
          </>
        )}
      </main>

      <footer className="parentdash-footer">
        <button className="parentdash-signout-btn" onClick={handleSignOut}>
          ⎋ {t("logout")}
        </button>
      </footer>
    </div>
  );
}

export default ParentDash;
