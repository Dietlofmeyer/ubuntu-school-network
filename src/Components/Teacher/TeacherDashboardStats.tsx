type Props = {
  totalTeachers: number;
  totalAwards: number;
  avgExperience: string;
  tags: string[];
};

function TeacherDashboardStats({
  totalTeachers,
  totalAwards,
  avgExperience,
  tags,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        gap: 32,
        marginBottom: 40,
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "linear-gradient(120deg, #f7fafc 60%, #dbeafe 100%)",
          borderRadius: 14,
          padding: "1.5rem 2.5rem",
          minWidth: 180,
          boxShadow: "0 2px 12px rgba(80,131,175,0.10)",
          textAlign: "center",
          color: "#23408e",
          border: "1px solid #e0e7ff",
        }}
      >
        <div style={{ fontSize: 36, fontWeight: 800 }}>{totalTeachers}</div>
        <div style={{ color: "#5083af", fontWeight: 700, fontSize: "1.08rem" }}>
          Total Teachers
        </div>
      </div>
      <div
        style={{
          background: "linear-gradient(120deg, #f7fafc 60%, #dbeafe 100%)",
          borderRadius: 14,
          padding: "1.5rem 2.5rem",
          minWidth: 180,
          boxShadow: "0 2px 12px rgba(80,131,175,0.10)",
          textAlign: "center",
          color: "#23408e",
          border: "1px solid #e0e7ff",
        }}
      >
        <div style={{ fontSize: 36, fontWeight: 800 }}>{avgExperience}</div>
        <div style={{ color: "#5083af", fontWeight: 700, fontSize: "1.08rem" }}>
          Avg. Experience (yrs)
        </div>
      </div>
      <div
        style={{
          background: "linear-gradient(120deg, #f7fafc 60%, #dbeafe 100%)",
          borderRadius: 14,
          padding: "1.5rem 2.5rem",
          minWidth: 180,
          boxShadow: "0 2px 12px rgba(80,131,175,0.10)",
          textAlign: "center",
          color: "#23408e",
          border: "1px solid #e0e7ff",
        }}
      >
        <div style={{ fontSize: 36, fontWeight: 800 }}>{totalAwards}</div>
        <div style={{ color: "#5083af", fontWeight: 700, fontSize: "1.08rem" }}>
          Total Awards
        </div>
      </div>
      <div
        style={{
          background: "linear-gradient(120deg, #f7fafc 60%, #dbeafe 100%)",
          borderRadius: 14,
          padding: "1.5rem 2.5rem",
          minWidth: 180,
          boxShadow: "0 2px 12px rgba(80,131,175,0.10)",
          textAlign: "center",
          color: "#23408e",
          border: "1px solid #e0e7ff",
        }}
      >
        <div style={{ fontSize: 36, fontWeight: 800 }}>{tags.length}</div>
        <div style={{ color: "#5083af", fontWeight: 700, fontSize: "1.08rem" }}>
          Unique Tags
        </div>
      </div>
    </div>
  );
}

export default TeacherDashboardStats;
