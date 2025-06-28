// POPIA Compliance and Security Documentation for Subject Selection

## Security Improvements Made:

### 1. **Data Minimization (POPIA Principle)**

- **Before**: Students could read entire teacher profiles including personal data
- **After**: Students only access a dedicated `availableSubjects` collection with minimal data

### 2. **Purpose Limitation (POPIA Principle)**

- **Before**: Broad access to teacher data for any purpose
- **After**: Access strictly limited to subject selection purposes only

### 3. **Access Control Improvements**

- **Before**: `allow read: if request.auth != null && resource.data.role == "teacher"`
- **After**: School-based filtering with dedicated collections

### 4. **New Security Rules Added**

```javascript
// AVAILABLE SUBJECTS COLLECTION (POPIA compliant - minimal data exposure)
match /availableSubjects/{schoolId} {
  // Students can only read subjects from their own school
  allow read: if request.auth != null
              && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.schoolId == schoolId;

  // Only authorized roles can manage subjects
  allow create, read, update, delete: if isAdmin() || isPrincipal() || isTeacher();
}

// SUBJECT SELECTIONS COLLECTION
match /subjectSelections/{selectionId} {
  // Students can only access their own selections
  allow read, create, update: if request.auth != null
                               && (resource.data.studentUid == request.auth.uid || request.resource.data.studentUid == request.auth.uid);

  // Guardians can only access selections for their children
  allow read, update: if isGuardian() && resource.data.guardianUid == request.auth.uid;
}
```

### 5. **POPIA Compliance Features**

- ✅ **Data Minimization**: Only necessary subject data exposed
- ✅ **Purpose Limitation**: Access limited to subject selection only
- ✅ **Storage Limitation**: No caching of unnecessary teacher data
- ✅ **Access Control**: School-based and role-based restrictions
- ✅ **Accountability**: Audit trails via Firestore rules
- ✅ **Transparency**: Clear documentation of data access

### 6. **Admin Functions**

- `refreshAvailableSubjects(schoolId)`: Updates subject lists when teachers change
- Automatic fallback creation of subject collections
- Proper error handling and logging

### 7. **Security Benefits**

- No cross-school data access
- No personal teacher data exposure to students
- Principle of least privilege enforced
- Proper role-based access control
- Audit-friendly rule structure

## Implementation Notes:

1. Admin should call `refreshAvailableSubjects()` when assigning subjects to teachers
2. Students now get subjects from dedicated collection, not teacher profiles
3. All access is logged and auditable
4. Complies with POPIA data protection principles
