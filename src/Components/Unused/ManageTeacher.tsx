import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Teacher } from "../../types/Teacher";

const SUBJECTS = [
  "Math",
  "Science",
  "English",
  "History",
  "Geography",
  "Biology",
  "Chemistry",
  "Physics",
  "Computer Science",
  "Economics",
];
const CLASSES = [
  "8A",
  "8B",
  "9A",
  "9B",
  "10A",
  "10B",
  "11A",
  "11B",
  "12A",
  "12B",
];
const QUALIFICATIONS = ["B.Ed", "M.Ed", "M.Sc", "M.A", "PhD", "PGCE"];
const AWARDS = [
  "Best Teacher",
  "Excellence Award",
  "Mentor Award",
  "Innovation Award",
];
const TAGS = [
  "Head of Department",
  "Newcomer",
  "Award Winner",
  "Mentor",
  "Sports Coach",
  "STEM",
  "Arts",
  "Languages",
  "Science",
  "Math",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function ManageTeacher() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<any>({});
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`http://localhost:4000/teachers/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setTeacher(data);
        setForm({
          ...data,
          subjects: Array.isArray(data.subjects) ? data.subjects : [],
          classes: Array.isArray(data.classes) ? data.classes : [],
          qualifications: Array.isArray(data.qualifications)
            ? data.qualifications
            : [],
          awards: Array.isArray(data.awards) ? data.awards : [],
          tags: Array.isArray(data.tags) ? data.tags : [],
        });
      });
  }, [id]);

  const handleCheckboxChange = (name: string, value: string) => {
    setForm((prev: any) => {
      const arr = Array.isArray(prev[name]) ? prev[name] : [];
      if (arr.includes(value)) {
        return { ...prev, [name]: arr.filter((v: string) => v !== value) };
      } else {
        return { ...prev, [name]: [...arr, value] };
      }
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setForm({
      ...form,
      [name]: type === "number" ? Number(value) : value,
    });
  };

  const handleSave = () => {
    if (!id) return;
    fetch(`http://localhost:4000/teachers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then((res) => res.json())
      .then((data) => {
        setTeacher(data);
        setEditMode(false);
      });
  };

  const handleDelete = () => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to remove this teacher?"))
      return;
    setDeleting(true);
    fetch(`http://localhost:4000/teachers/${id}`, {
      method: "DELETE",
    })
      .then(() => {
        setDeleting(false);
        navigate(-1);
      })
      .catch(() => setDeleting(false));
  };

  if (!teacher)
    return (
      <div
        style={{
          padding: 40,
          color: "#23408e",
          background: "#f7fafd",
          minHeight: "100vh",
        }}
      >
        Loading...
      </div>
    );

  // Helper for visually appealing value text
  const valueTextStyle: React.CSSProperties = {
    color: "#222",
    fontSize: "1.08rem",
    fontWeight: 500,
    letterSpacing: 0.1,
    marginTop: 2,
    marginBottom: 2,
    lineHeight: 1.6,
  };

  // Helper for visually appealing section headings
  const sectionHeading: React.CSSProperties = {
    color: "#5083af",
    fontWeight: 800,
    fontSize: "1.08rem",
    marginBottom: 4,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  };

  // Helper for visually appealing label text
  const labelText: React.CSSProperties = {
    color: "#23408e",
    fontWeight: 700,
    fontSize: "1.01rem",
    marginBottom: 2,
    letterSpacing: 0.1,
    display: "block",
  };

  // Helper for visually appealing checkbox label text
  const checkboxLabel: React.CSSProperties = {
    color: "#222",
    fontWeight: 500,
    fontSize: "1.01rem",
    marginLeft: 4,
    letterSpacing: 0.1,
    cursor: "pointer",
    userSelect: "none",
  };

  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        background: "linear-gradient(120deg, #e0e7ff 0%, #f7fafd 100%)",
        padding: 0,
        margin: 0,
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          width: "100%",
          background: "#23408e",
          color: "#fff",
          padding: "1.5rem 2.5rem 1.2rem 2.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 12px rgba(80,131,175,0.10)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "#fff",
              color: "#23408e",
              border: "none",
              borderRadius: 6,
              padding: "0.5rem 1.3rem",
              fontWeight: 700,
              fontSize: "1.08rem",
              cursor: "pointer",
              boxShadow: "0 1px 4px rgba(80,131,175,0.08)",
            }}
          >
            ← Back
          </button>
          <h1
            style={{
              margin: 0,
              fontWeight: 900,
              fontSize: "2.3rem",
              letterSpacing: 1,
              color: "#fff",
            }}
          >
            Manage Teacher
          </h1>
        </div>
      </div>

      {/* Dashboard Content */}
      <div
        style={{
          width: "100%",
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "2.5rem 2.5rem 2.5rem 2.5rem",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #c7d2fe 60%, #a5b4fc 100%)",
              color: "#23408e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2.7rem",
              fontWeight: "bold",
              userSelect: "none",
              boxShadow: "0 2px 8px rgba(80,131,175,0.10)",
              border: "2px solid #e0e7ff",
            }}
          >
            {getInitials(teacher.name)}
          </div>
          <div>
            <h2
              style={{
                color: "#23408e",
                marginBottom: 8,
                fontSize: "2.1rem",
                fontWeight: 800,
              }}
            >
              {teacher.name}
            </h2>
            <div
              style={{
                fontSize: "1.1rem",
                color: "#3b486b",
                marginBottom: 6,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {teacher.tags && teacher.tags.length > 0 && (
                <>
                  {teacher.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        background: "#e0e7ff",
                        color: "#23408e",
                        borderRadius: 6,
                        padding: "3px 12px",
                        fontSize: "1rem",
                        fontWeight: 500,
                        marginRight: 4,
                        marginBottom: 4,
                        display: "inline-block",
                        boxShadow: "0 1px 2px rgba(80,131,175,0.04)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </>
              )}
            </div>
            <div style={{ fontSize: "1.08rem", color: "#23408e" }}>
              <span style={{ marginRight: 18 }}>
                <strong>Email:</strong> {teacher.email}
              </span>
              {teacher.phone && (
                <span>
                  <strong>Phone:</strong> {teacher.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {!editMode ? (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 32,
                marginBottom: 32,
                background: "#fff",
                borderRadius: 14,
                padding: "2rem 2rem 1.5rem 2rem",
                boxShadow: "0 1px 8px rgba(80,131,175,0.06)",
                border: "1px solid #e3e8f0",
              }}
            >
              <div>
                <div style={sectionHeading}>Subjects</div>
                <div style={valueTextStyle}>
                  {(teacher.subjects || []).length > 0 ? (
                    teacher.subjects.join(", ")
                  ) : (
                    <span style={{ color: "#b0b8c1" }}>
                      No subjects assigned
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div style={sectionHeading}>Classes</div>
                <div style={valueTextStyle}>
                  {(teacher.classes || []).length > 0 ? (
                    teacher.classes.join(", ")
                  ) : (
                    <span style={{ color: "#b0b8c1" }}>
                      No classes assigned
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div style={sectionHeading}>Qualifications</div>
                <div style={valueTextStyle}>
                  {(teacher.qualifications || []).length > 0 ? (
                    (teacher.qualifications || []).join(", ")
                  ) : (
                    <span style={{ color: "#b0b8c1" }}>No qualifications</span>
                  )}
                </div>
              </div>
              <div>
                <div style={sectionHeading}>Awards</div>
                <div style={valueTextStyle}>
                  {(teacher.awards || []).length > 0 ? (
                    teacher.awards?.join(", ")
                  ) : (
                    <span style={{ color: "#b0b8c1" }}>No awards</span>
                  )}
                </div>
              </div>
              <div>
                <div style={sectionHeading}>Experience</div>
                <div style={valueTextStyle}>
                  {teacher.experienceYears ? (
                    `${teacher.experienceYears} years of teaching`
                  ) : (
                    <span style={{ color: "#b0b8c1" }}>
                      No experience listed
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div style={sectionHeading}>Tags</div>
                <div style={valueTextStyle}>
                  {(teacher.tags || []).length > 0 ? (
                    (teacher.tags || []).join(", ")
                  ) : (
                    <span style={{ color: "#b0b8c1" }}>No tags</span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => setEditMode(true)}
                style={{
                  background: "#5083af",
                  color: "#fff",
                  border: "none",
                  borderRadius: 7,
                  padding: "0.6rem 1.7rem",
                  fontWeight: 600,
                  fontSize: "1.08rem",
                  cursor: "pointer",
                  marginRight: 16,
                  boxShadow: "0 1px 4px rgba(80,131,175,0.10)",
                }}
              >
                Edit Info
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  background: "#e74c3c",
                  color: "#fff",
                  border: "none",
                  borderRadius: 7,
                  padding: "0.6rem 1.7rem",
                  fontWeight: 600,
                  fontSize: "1.08rem",
                  cursor: deleting ? "not-allowed" : "pointer",
                  opacity: deleting ? 0.7 : 1,
                  boxShadow: "0 1px 4px rgba(80,131,175,0.10)",
                }}
              >
                {deleting ? "Removing..." : "Remove Teacher"}
              </button>
            </div>
          </div>
        ) : (
          <form
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: "2rem 2rem 1.5rem 2rem",
              boxShadow: "0 1px 8px rgba(80,131,175,0.06)",
              border: "1px solid #e3e8f0",
              marginBottom: 32,
            }}
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 24,
                flexWrap: "wrap",
                marginBottom: 18,
              }}
            >
              <div style={{ flex: 1, minWidth: 220 }}>
                <label style={labelText}>Full Name</label>
                <input
                  name="name"
                  value={form.name || ""}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  style={{
                    width: "100%",
                    marginBottom: 8,
                    padding: "0.5rem",
                    borderRadius: 6,
                    border: "1px solid #bfc9d1",
                    color: "#1a2636",
                    background: "#fafdff",
                    fontSize: "1.05rem",
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <label style={labelText}>Email Address</label>
                <input
                  name="email"
                  value={form.email || ""}
                  onChange={handleChange}
                  placeholder="Enter email address"
                  style={{
                    width: "100%",
                    marginBottom: 8,
                    padding: "0.5rem",
                    borderRadius: 6,
                    border: "1px solid #bfc9d1",
                    color: "#1a2636",
                    background: "#fafdff",
                    fontSize: "1.05rem",
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={labelText}>Phone Number</label>
                <input
                  name="phone"
                  value={form.phone || ""}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  style={{
                    width: "100%",
                    marginBottom: 8,
                    padding: "0.5rem",
                    borderRadius: 6,
                    border: "1px solid #bfc9d1",
                    color: "#1a2636",
                    background: "#fafdff",
                    fontSize: "1.05rem",
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label style={labelText}>Years of Experience</label>
                <input
                  name="experienceYears"
                  type="number"
                  value={form.experienceYears || ""}
                  onChange={handleChange}
                  placeholder="e.g. 5"
                  style={{
                    width: "100%",
                    marginBottom: 8,
                    padding: "0.5rem",
                    borderRadius: 6,
                    border: "1px solid #bfc9d1",
                    color: "#1a2636",
                    background: "#fafdff",
                    fontSize: "1.05rem",
                  }}
                />
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 24,
                flexWrap: "wrap",
                marginBottom: 18,
              }}
            >
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={labelText}>Subjects Taught</div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    marginTop: 6,
                  }}
                >
                  {SUBJECTS.map((subject) => (
                    <label key={subject} style={checkboxLabel}>
                      <input
                        type="checkbox"
                        name="subjects"
                        value={subject}
                        checked={form.subjects?.includes(subject)}
                        onChange={() =>
                          handleCheckboxChange("subjects", subject)
                        }
                        style={{ marginRight: 4 }}
                      />
                      {subject}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={labelText}>Assigned Classes</div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    marginTop: 6,
                  }}
                >
                  {CLASSES.map((cls) => (
                    <label key={cls} style={checkboxLabel}>
                      <input
                        type="checkbox"
                        name="classes"
                        value={cls}
                        checked={form.classes?.includes(cls)}
                        onChange={() => handleCheckboxChange("classes", cls)}
                        style={{ marginRight: 4 }}
                      />
                      {cls}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 24,
                flexWrap: "wrap",
                marginBottom: 18,
              }}
            >
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={labelText}>Qualifications</div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    marginTop: 6,
                  }}
                >
                  {QUALIFICATIONS.map((qual) => (
                    <label key={qual} style={checkboxLabel}>
                      <input
                        type="checkbox"
                        name="qualifications"
                        value={qual}
                        checked={form.qualifications?.includes(qual)}
                        onChange={() =>
                          handleCheckboxChange("qualifications", qual)
                        }
                        style={{ marginRight: 4 }}
                      />
                      {qual}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={labelText}>Awards</div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    marginTop: 6,
                  }}
                >
                  {AWARDS.map((award) => (
                    <label key={award} style={checkboxLabel}>
                      <input
                        type="checkbox"
                        name="awards"
                        value={award}
                        checked={form.awards?.includes(award)}
                        onChange={() => handleCheckboxChange("awards", award)}
                        style={{ marginRight: 4 }}
                      />
                      {award}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={labelText}>Tags</div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    marginTop: 6,
                  }}
                >
                  {TAGS.map((tag) => (
                    <label key={tag} style={checkboxLabel}>
                      <input
                        type="checkbox"
                        name="tags"
                        value={tag}
                        checked={form.tags?.includes(tag)}
                        onChange={() => handleCheckboxChange("tags", tag)}
                        style={{ marginRight: 4 }}
                      />
                      {tag}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 18 }}>
              <button
                type="submit"
                style={{
                  background: "#5083af",
                  color: "#fff",
                  border: "none",
                  borderRadius: 7,
                  padding: "0.6rem 1.7rem",
                  fontWeight: 600,
                  fontSize: "1.08rem",
                  cursor: "pointer",
                  marginRight: 16,
                  boxShadow: "0 1px 4px rgba(80,131,175,0.10)",
                }}
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setEditMode(false)}
                style={{
                  background: "#e6f0fa",
                  color: "#23408e",
                  border: "1px solid #b0b8c1",
                  borderRadius: 7,
                  padding: "0.6rem 1.7rem",
                  fontWeight: 600,
                  fontSize: "1.08rem",
                  cursor: "pointer",
                  marginRight: 16,
                  boxShadow: "0 1px 4px rgba(80,131,175,0.10)",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  background: "#e74c3c",
                  color: "#fff",
                  border: "none",
                  borderRadius: 7,
                  padding: "0.6rem 1.7rem",
                  fontWeight: 600,
                  fontSize: "1.08rem",
                  cursor: deleting ? "not-allowed" : "pointer",
                  opacity: deleting ? 0.7 : 1,
                  boxShadow: "0 1px 4px rgba(80,131,175,0.10)",
                }}
              >
                {deleting ? "Removing..." : "Remove Teacher"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ManageTeacher;
