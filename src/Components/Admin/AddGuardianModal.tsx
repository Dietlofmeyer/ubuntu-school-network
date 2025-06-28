import React, { useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "../../firebase";

type Props = {
  schoolId: string;
  onClose: () => void;
  onGuardianAdded: (guardian: any) => void;
};

const AddGuardianModal: React.FC<Props> = ({
  schoolId,
  onClose,
  onGuardianAdded,
}) => {
  const [form, setForm] = useState({
    name: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Check for existing guardian with same email
      const q = query(
        collection(db, "users"),
        where("email", "==", form.email.trim().toLowerCase())
      );
      const existing = await getDocs(q);
      if (!existing.empty) {
        alert("A guardian with this email already exists.");
        setSaving(false);
        return;
      }
      const guardianRef = doc(db, "users", crypto.randomUUID());
      const guardianData = {
        name: form.name,
        email: form.email.trim().toLowerCase(),
        role: "guardian",
        schoolId,
        registered: true,
      };
      await setDoc(guardianRef, guardianData);
      onGuardianAdded({ id: guardianRef.id, ...guardianData });
      onClose();
    } catch (err) {
      alert("Failed to add guardian: " + (err as Error).message);
    }
    setSaving(false);
  };

  return (
    <div className="manage-user-modal">
      <div className="manage-user-modal-content">
        <h2>Add Guardian</h2>
        <form onSubmit={handleSubmit}>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Guardian Name"
            required
          />
          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Guardian Email"
            type="email"
            required
          />
          <div className="manage-user-modal-actions">
            <button type="button" className="remove-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? "Saving..." : "Add Guardian"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddGuardianModal;
