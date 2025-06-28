import React from "react";

interface FilterBarProps {
  gradeFilter: string;
  subjectFilter: string;
  grades: string[];
  subjects: string[];
  t: (key: string, options?: any) => string;
  onGradeChange: (grade: string) => void;
  onSubjectChange: (subject: string) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  gradeFilter,
  subjectFilter,
  grades,
  subjects,
  t,
  onGradeChange,
  onSubjectChange,
}) => {
  return (
    <div
      className="tdash-filter-bar"
      style={{ display: "flex", gap: 16, marginBottom: 16 }}
    >
      <select
        value={gradeFilter}
        onChange={(e) => onGradeChange(e.target.value)}
        className="tdash-filter-select"
      >
        <option value="">{t("all_grades") || "All grades"}</option>
        {grades.map((grade) => (
          <option value={grade} key={grade}>
            {t(grade)}
          </option>
        ))}
      </select>
      <select
        value={subjectFilter}
        onChange={(e) => onSubjectChange(e.target.value)}
        className="tdash-filter-select"
      >
        <option value="">{t("all_subjects") || "All subjects"}</option>
        {subjects.map((subject) => (
          <option value={subject} key={subject}>
            {t(subject)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default FilterBar;
