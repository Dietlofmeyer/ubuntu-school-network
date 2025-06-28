import { useEffect, useState } from "react";
import { db } from "../../../../firebase"; // Adjust the import path as needed
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  Timestamp,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import type { DocumentData } from "firebase/firestore";
// Update the import path below if your authContext file is in a different location
import { useAuth } from "../../../../AuthContext";
import { useTranslation } from "react-i18next";
import "./ExtracurricularManager.css";

type Extracurricular = {
  id: string;
  name: string;
  description: string;
  teacher: string;
  createdAt: string;
};

function ExtracurricularManager() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [activities, setActivities] = useState<Extracurricular[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Fetch activities created by this teacher
  useEffect(() => {
    if (!profile?.name) return;
    const fetchActivities = async () => {
      setLoading(true);
      const snap = await getDocs(collection(db, "extracurriculars"));
      const list: Extracurricular[] = [];
      snap.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
        const data = docSnap.data();
        if (data.teacher === profile.name) {
          list.push({
            id: docSnap.id,
            name: data.name,
            description: data.description,
            teacher: data.teacher,
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate().toLocaleString()
              : "",
          });
        }
      });
      setActivities(list);
      setLoading(false);
    };
    fetchActivities();
  }, [profile, saving, modalOpen]);

  // Add or update activity
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !profile?.name) return;
    setSaving(true);
    if (editId) {
      // Update
      await updateDoc(doc(db, "extracurriculars", editId), {
        name: name.trim(),
        description: description.trim(),
      });
    } else {
      // Add new
      await addDoc(collection(db, "extracurriculars"), {
        name: name.trim(),
        description: description.trim(),
        teacher: profile.name,
        createdAt: Timestamp.now(),
        available: true, // Ensures students can sign up for it
      });
    }
    setName("");
    setDescription("");
    setEditId(null);
    setSaving(false);
    setModalOpen(false);
  };

  // Delete activity
  const handleDelete = async (id: string) => {
    if (!window.confirm(t("delete_activity_confirm"))) return;
    setSaving(true);
    await deleteDoc(doc(db, "extracurriculars", id));
    setSaving(false);
  };

  // Edit activity
  const handleEdit = (activity: Extracurricular) => {
    setEditId(activity.id);
    setName(activity.name);
    setDescription(activity.description);
    setModalOpen(true);
  };

  // Cancel edit
  const handleCancel = () => {
    setEditId(null);
    setName("");
    setDescription("");
    setModalOpen(false);
  };

  return (
    <section className="extracurricular-section">
      <div className="extracurricular-title-row">
        <div className="extracurricular-title">
          {t("extracurricular_activities")}
        </div>
        <button
          className="extracurricular-add-btn"
          onClick={() => setModalOpen(true)}
        >
          + {t("add_activity")}
        </button>
      </div>
      {activities.length === 0 ? (
        <div className="extracurricular-empty">{t("no_activities")}</div>
      ) : (
        <div className="extracurricular-card-list">
          {activities.map((activity) => (
            <div className="extracurricular-card" key={activity.id}>
              <div className="extracurricular-card-title">{activity.name}</div>
              <div className="extracurricular-card-desc">
                {activity.description}
              </div>
              <div className="extracurricular-card-meta">
                {t("created_by")}: {activity.teacher}
                <br />
                {t("created_at")}: {activity.createdAt}
              </div>
              <div className="extracurricular-card-actions">
                <button
                  className="extracurricular-action-btn"
                  title={t("edit")}
                  onClick={() => handleEdit(activity)}
                >
                  <span role="img" aria-label="edit">
                    ✏️
                  </span>
                </button>
                <button
                  className="extracurricular-action-btn"
                  title={t("delete")}
                  onClick={() => handleDelete(activity.id)}
                >
                  <span role="img" aria-label="delete">
                    🗑️
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Add Button */}
      {/* <button
        className="extracurricular-fab"
        title={t("add_activity")}
        onClick={() => setModalOpen(true)}
      >
        +
      </button> */}

      {/* Modal for Add/Edit */}
      {modalOpen && (
        <div className="extracurricular-modal-bg">
          <div className="extracurricular-modal">
            <div className="extracurricular-modal-title">
              {editId ? t("edit_activity") : t("add_activity")}
            </div>
            <form className="extracurricular-form" onSubmit={handleSave}>
              <input
                type="text"
                placeholder={t("activity_name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={saving}
              />
              <textarea
                placeholder={t("description")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={2}
                disabled={saving}
              />
              <div className="extracurricular-actions">
                <button type="submit" disabled={saving}>
                  {editId
                    ? saving
                      ? "Saving..."
                      : "Update"
                    : saving
                    ? "Saving..."
                    : "Add"}
                </button>
                <button type="button" onClick={handleCancel} disabled={saving}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default ExtracurricularManager;
