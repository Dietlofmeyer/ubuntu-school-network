import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import "./UserSignupsAnalytics.css";

type UserDoc = {
  id: string;
  email?: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
};

const DAY_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "120 days", value: 120 },
  { label: "365 days", value: 365 },
];

const UserSignupsAnalytics: React.FC = () => {
  const [signups, setSignups] = useState<{ date: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState(7);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSignups = async () => {
      setLoading(true);
      const snap = await getDocs(collection(db, "users"));
      const users: UserDoc[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const days: { [date: string]: number } = {};
      const now = new Date();
      for (let i = daysFilter - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key =
          d.getFullYear() +
          "-" +
          String(d.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(d.getDate()).padStart(2, "0");
        days[key] = 0;
      }
      users.forEach((u) => {
        if (u.createdAt && typeof u.createdAt.seconds === "number") {
          const d = new Date(u.createdAt.seconds * 1000);
          const key =
            d.getFullYear() +
            "-" +
            String(d.getMonth() + 1).padStart(2, "0") +
            "-" +
            String(d.getDate()).padStart(2, "0");
          if (days[key] !== undefined) days[key]++;
        }
      });
      setSignups(
        Object.entries(days).map(([date, count]) => ({ date, count }))
      );
      setLoading(false);
    };
    fetchSignups();
  }, [daysFilter]);

  return (
    <div className="signups-analytics-container">
      <button
        className="signups-analytics-back-btn"
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>
      <h1 className="signups-analytics-title">User Signups Analytics</h1>
      <section className="signups-analytics-section">
        <div className="signups-analytics-filter">
          <label htmlFor="daysFilter">Show:</label>
          <select
            id="daysFilter"
            value={daysFilter}
            onChange={(e) => setDaysFilter(Number(e.target.value))}
          >
            {DAY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <h2>Signups Last {daysFilter} Days</h2>
        {loading ? (
          <div>Loading...</div>
        ) : signups.length > 0 ? (
          <div className="signups-analytics-row">
            {signups.map((s) => (
              <div key={s.date} className="signups-analytics-day">
                <strong>{s.date}:</strong> {s.count}
              </div>
            ))}
          </div>
        ) : (
          <div>No analytics found.</div>
        )}
      </section>
    </div>
  );
};

export default UserSignupsAnalytics;
