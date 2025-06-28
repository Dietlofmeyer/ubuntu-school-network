import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "../../AuthContext";
import AddStudentModal from "./AddStudentModal";

type Personnel = {
  id: string;
  name?: string;
  email: string;
  role: string;
  registered?: boolean;
  phone?: string;
  address?: string;
  address2?: string;
  address3?: string;
};

type Props = {
  user: Personnel;
  onClose: () => void;
  onRemove: (id: string) => void;
  onSave: (updated: Personnel) => void;
};

const ManageUserModal: React.FC<Props> = ({
  user,
  onClose,
  onRemove,
  onSave,
}) => {
  const { profile, user: authUser } = useAuth();
  const [form, setForm] = useState({
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    address: user.address || "",
    address2: user.address2 || "",
    address3: user.address3 || "",
    role: user.role || "",
  });
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert("Please provide a reason for this change.");
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.id), form);

      // Log the edit for POPIA compliance
      const functions = getFunctions();
      const logUserEdit = httpsCallable(functions, "logUserEdit");
      await logUserEdit({
        userId: user.id,
        changes: form,
        editorId: authUser?.uid || "unknown",
        reason,
      });

      onSave({ ...user, ...form });
      onClose();
    } catch (err) {
      alert("Failed to update user: " + err);
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    if (
      !window.confirm(
        "Are you sure you want to remove this user? This cannot be undone."
      )
    )
      return;
    try {
      const functions = getFunctions();
      const deleteUserAndData = httpsCallable(functions, "deleteUserAndData");
      await deleteUserAndData({ uid: user.id });
      setSuccessMsg("User successfully removed.");
      setTimeout(() => {
        onRemove(user.id); // Notify parent to refresh list
        setSuccessMsg("");
        onClose();
      }, 1200); // Show message for 1.2 seconds
    } catch (err) {
      alert("Failed to remove user: " + (err as Error).message);
    }
  };

  return (
    <div className="manage-user-modal">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        style={{
          position: "absolute",
          top: 12,
          right: 16,
          background: "transparent",
          border: "none",
          fontSize: 28,
          color: "#888",
          cursor: "pointer",
          zIndex: 10,
        }}
      >
        &times;
      </button>
      <h2>Manage User</h2>
      {successMsg && (
        <div style={{ color: "#22c55e", marginBottom: 12 }}>{successMsg}</div>
      )}
      <form onSubmit={handleSubmit}>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Name"
          required
        />
        <input
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Email"
          type="email"
          required
        />
        <input
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="Phone"
        />
        <input
          name="address"
          value={form.address}
          onChange={handleChange}
          placeholder="Address Line 1"
        />
        <input
          name="address2"
          value={form.address2}
          onChange={handleChange}
          placeholder="Address Line 2"
        />
        <input
          name="address3"
          value={form.address3}
          onChange={handleChange}
          placeholder="Address Line 3"
        />
        <select name="role" value={form.role} onChange={handleChange} required>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
          <option value="teacher">Teacher</option>
          <option value="guardian">Guardian</option>
        </select>
        <textarea
          name="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for change (required)"
          required
          style={{ marginTop: 12, minHeight: 60, resize: "vertical" }}
        />
        {form.role === "guardian" && (
          <>
            {showAddStudent && (
              <AddStudentModal
                guardianId={user.id}
                schoolId={profile?.schoolId || ""}
                adminId={authUser?.uid || ""}
                onClose={() => setShowAddStudent(false)}
                onStudentAdded={() => setShowAddStudent(false)}
              />
            )}
          </>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 16,
          }}
        >
          <button type="button" className="remove-btn" onClick={handleRemove}>
            Remove
          </button>
          <button type="submit" className="save-btn" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ManageUserModal;
