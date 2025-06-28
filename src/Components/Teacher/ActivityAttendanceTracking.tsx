import React, { useState, useEffect } from "react";
import { useAuth } from "../../AuthContext";
import { useTranslation } from "react-i18next";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import type {
  Activity,
  ActivityParticipation,
  AttendanceRecord,
} from "../../types/activities";
import { ParticipationStatus } from "../../types/activities";
import "./ActivityAttendanceTracking.css";

interface ActivityAttendanceTrackingProps {
  activityId: string;
  onBack?: () => void;
}

const ActivityAttendanceTracking: React.FC<ActivityAttendanceTrackingProps> = ({
  activityId,
  onBack,
}) => {
  const { user, profile } = useAuth();
  const { t } = useTranslation();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [participants, setParticipants] = useState<ActivityParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [attendanceData, setAttendanceData] = useState<
    Record<string, AttendanceRecord>
  >({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchActivity();
    fetchParticipants();
  }, [activityId]);

  useEffect(() => {
    if (participants.length > 0) {
      loadAttendanceForDate();
    }
  }, [selectedDate, participants]);

  const fetchActivity = async () => {
    try {
      const activityDoc = await getDocs(
        query(collection(db, "activities"), where("id", "==", activityId))
      );

      if (!activityDoc.empty) {
        const activityData = activityDoc.docs[0].data() as Activity;
        setActivity(activityData);
      }
    } catch (error) {
      console.error("Error fetching activity:", error);
    }
  };

  const fetchParticipants = async () => {
    try {
      const participationsRef = collection(db, "activityParticipations");
      const q = query(
        participationsRef,
        where("activityId", "==", activityId),
        where("status", "==", ParticipationStatus.APPROVED),
        orderBy("studentName", "asc")
      );

      const snapshot = await getDocs(q);
      const participantsData: ActivityParticipation[] = [];

      snapshot.forEach((doc) => {
        participantsData.push({
          id: doc.id,
          ...doc.data(),
        } as ActivityParticipation);
      });

      setParticipants(participantsData);
    } catch (error) {
      console.error("Error fetching participants:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceForDate = () => {
    const dateAttendance: Record<string, AttendanceRecord> = {};

    participants.forEach((participant) => {
      // Find existing attendance record for this date
      const existingRecord = participant.attendanceRecord?.find(
        (record) => record.date === selectedDate
      );

      if (existingRecord) {
        dateAttendance[participant.id] = existingRecord;
      } else {
        // Create default attendance record
        dateAttendance[participant.id] = {
          date: selectedDate,
          present: false,
          excused: false,
          note: "",
        };
      }
    });

    setAttendanceData(dateAttendance);
  };

  const handleAttendanceChange = (
    participantId: string,
    field: keyof AttendanceRecord,
    value: any
  ) => {
    setAttendanceData((prev) => ({
      ...prev,
      [participantId]: {
        ...prev[participantId],
        [field]: value,
      },
    }));
  };

  const saveAttendance = async () => {
    if (!user || !profile) return;

    setIsSaving(true);
    try {
      // Update each participant's attendance record
      for (const participantId of Object.keys(attendanceData)) {
        const participant = participants.find((p) => p.id === participantId);
        if (!participant) continue;

        const attendanceRecord = attendanceData[participantId];
        const existingRecords = participant.attendanceRecord || [];

        // Remove existing record for this date and add new one
        const updatedRecords = existingRecords.filter(
          (record) => record.date !== selectedDate
        );
        updatedRecords.push(attendanceRecord);

        // Update participant document
        const participantRef = doc(db, "activityParticipations", participantId);
        await updateDoc(participantRef, {
          attendanceRecord: updatedRecords,
        });
      }

      // Log the action for audit
      await addDoc(collection(db, "auditLogs"), {
        action: "activity_attendance_recorded",
        performedBy: user.uid,
        targetId: activityId,
        details: {
          activityTitle: activity?.title || "",
          date: selectedDate,
          participantsCount: participants.length,
          presentCount: Object.values(attendanceData).filter(
            (record) => record.present
          ).length,
        },
        timestamp: Timestamp.now(),
        schoolId: profile.schoolId,
      });

      // Refresh participants data
      await fetchParticipants();
    } catch (error) {
      console.error("Error saving attendance:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const getAttendanceStats = () => {
    const totalParticipants = participants.length;
    const presentCount = Object.values(attendanceData).filter(
      (record) => record.present
    ).length;
    const excusedCount = Object.values(attendanceData).filter(
      (record) => record.excused && !record.present
    ).length;
    const absentCount = totalParticipants - presentCount - excusedCount;

    return {
      total: totalParticipants,
      present: presentCount,
      excused: excusedCount,
      absent: absentCount,
      attendanceRate:
        totalParticipants > 0
          ? ((presentCount / totalParticipants) * 100).toFixed(1)
          : "0",
    };
  };

  const getParticipantAttendanceRate = (participant: ActivityParticipation) => {
    const records = participant.attendanceRecord || [];
    if (records.length === 0) return "0";

    const presentCount = records.filter((record) => record.present).length;
    return ((presentCount / records.length) * 100).toFixed(1);
  };

  const stats = getAttendanceStats();

  if (loading) {
    return (
      <div className="activity-attendance">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-attendance">
      <div className="attendance-header">
        {onBack && (
          <button className="attendance-back-btn" onClick={onBack}>
            ← {t("back")}
          </button>
        )}
        <h3>{t("activities.attendance.title")}</h3>
        <div className="date-selector">
          <label>{t("activities.attendance.selectDate")}</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
        </div>
      </div>

      <div className="attendance-stats">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">
            {t("activities.attendance.totalParticipants")}
          </div>
        </div>
        <div className="stat-card present">
          <div className="stat-value">{stats.present}</div>
          <div className="stat-label">{t("activities.attendance.present")}</div>
        </div>
        <div className="stat-card excused">
          <div className="stat-value">{stats.excused}</div>
          <div className="stat-label">{t("activities.attendance.excused")}</div>
        </div>
        <div className="stat-card absent">
          <div className="stat-value">{stats.absent}</div>
          <div className="stat-label">{t("activities.attendance.absent")}</div>
        </div>
        <div className="stat-card rate">
          <div className="stat-value">{stats.attendanceRate}%</div>
          <div className="stat-label">
            {t("activities.attendance.attendanceRate")}
          </div>
        </div>
      </div>

      {participants.length === 0 ? (
        <div className="no-participants">
          <p>{t("activities.attendance.noParticipants")}</p>
        </div>
      ) : (
        <>
          <div className="attendance-list">
            <div className="attendance-header-row">
              <div className="student-column">
                {t("activities.attendance.student")}
              </div>
              <div className="grade-column">
                {t("activities.attendance.grade")}
              </div>
              <div className="present-column">
                {t("activities.attendance.present")}
              </div>
              <div className="excused-column">
                {t("activities.attendance.excused")}
              </div>
              <div className="rate-column">
                {t("activities.attendance.overallRate")}
              </div>
              <div className="notes-column">
                {t("activities.attendance.notes")}
              </div>
            </div>

            {participants.map((participant) => (
              <div key={participant.id} className="attendance-row">
                <div className="student-column">
                  <div className="student-info">
                    <div className="student-name">
                      {participant.studentName}
                    </div>
                  </div>
                </div>

                <div className="grade-column">
                  <span className="grade-badge">
                    {participant.studentGrade}
                  </span>
                </div>

                <div className="present-column">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={attendanceData[participant.id]?.present || false}
                      onChange={(e) =>
                        handleAttendanceChange(
                          participant.id,
                          "present",
                          e.target.checked
                        )
                      }
                    />
                    <span className="checkmark"></span>
                  </label>
                </div>

                <div className="excused-column">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={attendanceData[participant.id]?.excused || false}
                      onChange={(e) =>
                        handleAttendanceChange(
                          participant.id,
                          "excused",
                          e.target.checked
                        )
                      }
                    />
                    <span className="checkmark"></span>
                  </label>
                </div>

                <div className="rate-column">
                  <span className="rate-value">
                    {getParticipantAttendanceRate(participant)}%
                  </span>
                </div>

                <div className="notes-column">
                  <input
                    type="text"
                    value={attendanceData[participant.id]?.note || ""}
                    onChange={(e) =>
                      handleAttendanceChange(
                        participant.id,
                        "note",
                        e.target.value
                      )
                    }
                    placeholder={t("activities.attendance.addNote")}
                    className="note-input"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="attendance-actions">
            <button
              className="btn-save-attendance"
              onClick={saveAttendance}
              disabled={isSaving}
            >
              {isSaving
                ? t("common.saving")
                : t("activities.attendance.saveAttendance")}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ActivityAttendanceTracking;
