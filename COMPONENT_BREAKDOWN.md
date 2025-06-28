# Student Dashboard Component Breakdown

## Current State

The `studentDash.tsx` file is 550+ lines and handles multiple concerns, making it difficult to maintain.

## Proposed Structure

### 1. Main Container

- `StudentDashboard.tsx` (100-150 lines)
  - Main layout and state management
  - Data fetching logic
  - Modal coordination

### 2. Header Components

- `DashboardHeader.tsx`
  - Title and date display
- `NotificationBanner.tsx`
  - Subject selection notifications
  - Other important alerts

### 3. Stats & Quick Actions

- `QuickStatsGrid.tsx`
  - Subject count, marks, activities, demerits
- `QuickActionsPanel.tsx`
  - Action buttons (Subject Selection, Extracurriculars, etc.)

### 4. Main Content

- `AcademicSection.tsx`
  - Latest marks
  - Courses grid
- `AchievementsSection.tsx`
  - Awards and activities display

### 5. Modal Management

- `StudentModals.tsx`
  - Coordinates all modals (settings, demerits, subject selection, etc.)
  - Reduces clutter in main component

### 6. Sidebar

- `StudentSidebar.tsx` (already exists)
  - Keep as-is, working well

## Benefits

- ✅ Easier to debug and maintain
- ✅ Better separation of concerns
- ✅ Reusable components
- ✅ Cleaner code structure
- ✅ Less prone to corruption during edits
- ✅ Easier to add new features

## Academic Features Integration

The subject selection features would be cleanly integrated into:

- `NotificationBanner.tsx` - for the prominent alert
- `QuickActionsPanel.tsx` - for the action button
- `StudentModals.tsx` - for the modal management
