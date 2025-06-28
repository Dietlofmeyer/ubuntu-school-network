import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../../AuthContext";

type DeletionRequest = {
  id: string;
  childName: string;
  status: string;
  timestamp: any;
};

const ParentDeletionRequests = ({
  t,
}: {
  t: (key: string, opts?: any) => string;
}) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchRequests = async () => {
      setLoading(true);
      const q = query(
        collection(db, "deletionRequests"),
        where("requestedBy", "==", user.uid)
      );
      const snap = await getDocs(q);
      setRequests(
        snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as DeletionRequest[]
      );
      setLoading(false);
    };
    fetchRequests();
  }, [user]);

  return (
    <section style={{ margin: "2rem 0" }}>
      <h3>{t("your_deletion_requests")}</h3>
      {loading ? (
        <div>{t("loading")}</div>
      ) : requests.length === 0 ? (
        <div>{t("no_deletion_requests")}</div>
      ) : (
        <ul>
          {requests.map((req) => (
            <li key={req.id}>
              {t("child_name")}: {req.childName} — {t("status")}: {req.status}
              {req.timestamp?.toDate
                ? " (" + req.timestamp.toDate().toLocaleString() + ")"
                : ""}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default ParentDeletionRequests;
