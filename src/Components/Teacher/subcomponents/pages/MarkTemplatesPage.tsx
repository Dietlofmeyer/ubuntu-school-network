import React from "react";
import MarkTemplateManager from "../components/MarkTemplateManager";
import "./MarkTemplatesPage.css";

interface MarkTemplatesPageProps {
  teacherId: string;
  onTemplateSelect?: (template: any) => void;
  t: (key: string, options?: any) => string;
  onBack: () => void;
}

const MarkTemplatesPage: React.FC<MarkTemplatesPageProps> = ({
  teacherId,
  onTemplateSelect,
  t,
  onBack,
}) => {
  return (
    <div className="templates-page">
      <div className="templates-page-container">
        {/* Header */}
        <div className="templates-header">
          <div className="templates-header-content">
            <button className="templates-back-btn" onClick={onBack}>
              <span className="back-icon">←</span>
              {t("back")}
            </button>
            <div className="templates-header-info">
              <h1 className="templates-title">
                <span className="templates-icon">📋</span>
                {t("mark_templates")}
              </h1>
              <p className="templates-subtitle">
                {t("create_and_manage_your_marking_templates")}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="templates-main">
          <MarkTemplateManager
            teacherId={teacherId}
            onTemplateSelect={onTemplateSelect}
            t={t}
          />
        </div>
      </div>
    </div>
  );
};

export default MarkTemplatesPage;
