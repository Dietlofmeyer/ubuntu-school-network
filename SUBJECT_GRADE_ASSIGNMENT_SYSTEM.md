# Subject-Grade Assignment System

This document explains the new granular teacher assignment system that allows administrators to assign specific subjects and grades to teachers.

## Overview

The system has been upgraded from simple grade-level assignments to granular subject-grade combinations. This means:

- **Previously**: A teacher could be assigned to "Grade 8" (all subjects)
- **Now**: A teacher can be assigned to "Mathematics in Grade 8" AND "Science in Grade 9"

## Data Structure

### SubjectGradeAssignment Interface

```typescript
interface SubjectGradeAssignment {
  subject: string; // e.g., "Mathematics", "Science", "English"
  grades: string[]; // e.g., ["8", "9"], ["10", "11", "12"]
}
```

### Teacher Interface Updates

```typescript
interface Teacher {
  // ... existing fields ...
  assignedGrades?: string[]; // Kept for backward compatibility
  subjectGradeAssignments?: SubjectGradeAssignment[]; // New granular assignments
}
```

## Example Usage

A teacher's assignments might look like:

```javascript
{
  name: "John Smith",
  email: "john.smith@school.edu",
  subjectGradeAssignments: [
    {
      subject: "Mathematics",
      grades: ["8", "9"]
    },
    {
      subject: "Physical Science",
      grades: ["10", "11"]
    }
  ]
}
```

This means John Smith teaches:

- Mathematics to Grade 8 and Grade 9 students
- Physical Science to Grade 10 and Grade 11 students

## UI Features

### Admin Dashboard

- Navigate to Admin Dashboard → Teacher Subject & Grade Assignment
- View all teachers with their current assignments
- Edit assignments using the grid-based interface

### Assignment Interface

- **Subjects Grid**: Shows all available subjects
- **Grade Checkboxes**: For each subject, select which grades the teacher can teach
- **Real-time Updates**: Changes are saved to Firestore and reflected immediately

### Benefits

1. **Granular Control**: Assign specific subject-grade combinations
2. **Flexibility**: A teacher can teach different subjects across different grades
3. **Clarity**: Clear visualization of who teaches what where
4. **Backward Compatibility**: Existing grade-only assignments still work

## Firebase Storage

The data is stored in Firestore under the user's document:

```javascript
// Firestore document structure
{
  uid: "teacher123",
  role: "teacher",
  name: "John Smith",
  // ... other fields ...
  subjectGradeAssignments: [
    { subject: "Mathematics", grades: ["8", "9"] },
    { subject: "Physical Science", grades: ["10", "11"] }
  ],
  assignedGrades: ["8", "9", "10", "11"] // Auto-generated for backward compatibility
}
```

## Migration

The system automatically maintains backward compatibility:

- Existing `assignedGrades` arrays are preserved
- New `subjectGradeAssignments` are additive
- The `assignedGrades` field is automatically updated when subject-grade assignments change

## CSS Classes

Key CSS classes for styling:

- `.subject-grade-assignments-section` - Main container
- `.subjects-grid` - Grid layout for subjects
- `.subject-section` - Individual subject container
- `.assignment-item` - Display of current assignments
- `.grades-list` - List of grade tags

## Translation Keys

New translation keys added:

- `teacher_subject_grade_assignment`
- `assign_subject_grades_to_teachers_description`
- `subject_grade_assignments`
- `no_subject_grades_assigned`
- `edit_subject_grades`
- `subject_grades_assigned_successfully`
- `failed_to_assign_subject_grades`
