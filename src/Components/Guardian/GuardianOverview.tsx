import React from "react";

interface GuardianOverviewProps {
  children: any[];
  stats: {
    totalChildren: number;
    pendingApprovals: number;
    newNotifications: number;
    averageGrade: number;
  };
  onRefresh: () => void;
}

const GuardianOverview: React.FC<GuardianOverviewProps> = ({
  children,
  stats,
  onRefresh,
}) => {
  const getGradeColor = (grade: number) => {
    if (grade >= 90) return "#22c55e"; // Green
    if (grade >= 80) return "#3b82f6"; // Blue
    if (grade >= 70) return "#f59e0b"; // Yellow
    if (grade >= 60) return "#f97316"; // Orange
    return "#ef4444"; // Red
  };

  const getGradeLabel = (grade: number) => {
    if (grade >= 90) return "Excellent";
    if (grade >= 80) return "Good";
    if (grade >= 70) return "Satisfactory";
    if (grade >= 60) return "Needs Improvement";
    return "Requires Attention";
  };

  return (
    <div className="guardian-overview">
      {/* Header */}
      <div className="guardian-page-header">
        <div>
          <h1>Dashboard Overview</h1>
          <p>Monitor your children's academic progress and important updates</p>
        </div>
        <button onClick={onRefresh} className="guardian-refresh-btn">
          <span>🔄</span>
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="guardian-stats-grid">
        <div className="guardian-stat-card">
          <span className="guardian-stat-icon">👨‍👩‍👧‍👦</span>
          <div className="guardian-stat-value">{stats.totalChildren}</div>
          <div className="guardian-stat-label">Children</div>
        </div>

        <div className="guardian-stat-card">
          <span className="guardian-stat-icon">✅</span>
          <div className="guardian-stat-value">{stats.pendingApprovals}</div>
          <div className="guardian-stat-label">Pending Approvals</div>
        </div>

        <div className="guardian-stat-card">
          <span className="guardian-stat-icon">🔔</span>
          <div className="guardian-stat-value">{stats.newNotifications}</div>
          <div className="guardian-stat-label">New Notifications</div>
        </div>

        <div className="guardian-stat-card">
          <span className="guardian-stat-icon">📊</span>
          <div
            className="guardian-stat-value"
            style={{ color: getGradeColor(stats.averageGrade) }}
          >
            {stats.averageGrade}%
          </div>
          <div className="guardian-stat-label">
            {getGradeLabel(stats.averageGrade)}
          </div>
        </div>
      </div>

      {/* Children Quick Overview */}
      <div className="guardian-card">
        <div className="guardian-card-header">
          <h2 className="guardian-card-title">Children Overview</h2>
        </div>

        {children.length === 0 ? (
          <div className="guardian-empty-state">
            <span className="guardian-empty-icon">👨‍👩‍👧‍👦</span>
            <h3 className="guardian-empty-title">No Children Linked</h3>
            <p className="guardian-empty-description">
              Contact your school administrator to link your children to your
              account
            </p>
          </div>
        ) : (
          <div className="children-quick-list">
            {children.map((child) => (
              <div key={child.id} className="child-quick-card">
                <div className="child-info">
                  <div className="child-avatar">
                    <span className="child-avatar-icon">👨‍🎓</span>
                  </div>
                  <div className="child-details">
                    <h4 className="child-name">{child.name}</h4>
                    <p className="child-grade">{child.grade}</p>
                    <div className="child-stats">
                      <span className="child-stat">
                        📚 {child.subjects?.length || 0} Subjects
                      </span>
                      {child.demerits !== undefined && (
                        <span className="child-stat">
                          ⚠️ {child.demerits} Demerits
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="child-actions">
                  <button className="child-action-btn primary">
                    View Progress
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="guardian-card">
        <div className="guardian-card-header">
          <h2 className="guardian-card-title">Quick Actions</h2>
        </div>

        <div className="quick-actions-grid">
          <button className="quick-action-btn">
            <span className="quick-action-icon">✅</span>
            <div className="quick-action-content">
              <h4>Approve Subjects</h4>
              <p>Review and approve subject selections</p>
              {stats.pendingApprovals > 0 && (
                <span className="quick-action-badge">
                  {stats.pendingApprovals}
                </span>
              )}
            </div>
          </button>

          <button className="quick-action-btn">
            <span className="quick-action-icon">📈</span>
            <div className="quick-action-content">
              <h4>View Progress</h4>
              <p>Check your children's academic progress</p>
            </div>
          </button>

          <button className="quick-action-btn">
            <span className="quick-action-icon">💬</span>
            <div className="quick-action-content">
              <h4>Contact Teachers</h4>
              <p>Send messages to teachers</p>
            </div>
          </button>

          <button className="quick-action-btn">
            <span className="quick-action-icon">📋</span>
            <div className="quick-action-content">
              <h4>View Reports</h4>
              <p>Download and view report cards</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="guardian-card">
        <div className="guardian-card-header">
          <h2 className="guardian-card-title">Recent Activity</h2>
        </div>

        <div className="recent-activity-list">
          <div className="activity-item">
            <div className="activity-icon">📝</div>
            <div className="activity-content">
              <h4>New assignment posted</h4>
              <p>Mathematics assignment due next week</p>
              <span className="activity-time">2 hours ago</span>
            </div>
          </div>

          <div className="activity-item">
            <div className="activity-icon">🏆</div>
            <div className="activity-content">
              <h4>Achievement unlocked</h4>
              <p>Perfect attendance this month</p>
              <span className="activity-time">1 day ago</span>
            </div>
          </div>

          <div className="activity-item">
            <div className="activity-icon">📊</div>
            <div className="activity-content">
              <h4>Grades updated</h4>
              <p>New test scores are available</p>
              <span className="activity-time">3 days ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuardianOverview;
