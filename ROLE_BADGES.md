# Role Badge System

This document explains the standardized role badge system implemented across all dashboards in the school management application.

## Overview

Role badges provide a consistent visual representation of user roles throughout the application. They use CSS variables defined in `theme.css` to ensure consistent theming across all color schemes (default, light, dark, sport).

## Available Role Types

The following roles are supported with their respective styling:

- **Student** - Blue theme colors
- **Guardian/Parent** - Purple/primary theme colors
- **Teacher** - Green theme colors
- **Admin/Principal** - Red theme colors
- **Staff** - Yellow/warning theme colors
- **Developer** - Red theme colors (same as admin)

## CSS Variables

Role badge colors are defined in `src/theme.css` for all themes:

```css
/* Role Badge Colors */
--color-role-student-bg: rgba(79, 209, 255, 0.2);
--color-role-student: #4fd1ff;
--color-role-guardian-bg: rgba(180, 123, 255, 0.2);
--color-role-guardian: #b47bff;
--color-role-teacher-bg: rgba(79, 209, 139, 0.2);
--color-role-teacher: #4fd18b;
--color-role-admin-bg: rgba(255, 107, 107, 0.2);
--color-role-admin: #ff6b6b;
--color-role-staff-bg: rgba(255, 224, 102, 0.2);
--color-role-staff: #ffe066;
```

## Usage

### HTML Structure

```tsx
<span className={`role-badge role-${user.role}`}>
  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
</span>
```

### CSS Classes

```css
.role-badge {
  display: inline-block;
  padding: 0.3rem 0.8rem;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  vertical-align: middle;
  white-space: nowrap;
  line-height: 1;
}

.role-student {
  background: var(--color-role-student-bg);
  color: var(--color-role-student);
}
```

## Standardized Components

The following components have been updated to use the standardized role badge system:

- `src/Components/Staff/StaffDash.tsx` - Staff dashboard user lists and modals
- `src/Components/Admin/UserManagement.tsx` - Admin user management table
- `src/Components/Dev/DevDash.tsx` - Developer dashboard recent signups

## Implementation Files

### CSS Files with Role Badge Styles

- `src/Components/Staff/StaffDash.css`
- `src/Components/Admin/AdminDashboard.css`
- `src/Components/Dev/DevDash.css`
- `src/shared/roleBadges.css` (shared styles reference)

### Theme Definition

- `src/theme.css` - Contains all role badge color variables

## Adding Role Badges to New Components

1. Import the CSS variables through your theme system
2. Add the role badge CSS classes to your component's CSS file
3. Use the HTML structure shown above
4. Ensure proper capitalization of role names

## Role Aliases

Some roles have aliases for compatibility:

- `parent` maps to `guardian` styling
- `principal` maps to `admin` styling
- `developer` maps to `admin` styling

## Theme Compatibility

Role badges are fully compatible with all application themes:

- **Default Theme** (dark)
- **Light Theme**
- **Dark Theme**
- **Sport Theme**

Colors automatically adjust based on the active theme through CSS variables.
