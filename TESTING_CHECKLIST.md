# DevTracker Testing Checklist

Use this checklist to manually verify all functionality before deployment.

## Authentication Tests

### Login Flow
- [ ] **Test 1:** Existing user login with correct credentials
  - Enter valid email and password
  - Expected: User is logged in and sees dashboard

- [ ] **Test 2:** Login with wrong password
  - Enter valid email with incorrect password
  - Expected: Error message "Invalid email or password"

- [ ] **Test 3:** Login with non-existent email
  - Enter email that doesn't exist in system
  - Expected: Error message "Invalid email or password" (same as wrong password for security)

- [ ] **Test 4:** Login rate limiting
  - Attempt 5+ failed logins rapidly
  - Expected: Error message about too many attempts, temporary lockout

### Magic Link Invite Flow
- [ ] **Test 5:** New user invite - complete flow
  - Admin sends invite to new email
  - User receives email with magic link
  - User clicks link and sees signup form
  - User enters email, name, and password
  - User clicks "Complete Sign Up"
  - Expected: User is logged in and sees dashboard

- [ ] **Test 6:** New user invite - expired link
  - Use an old/expired magic link (or wait 7+ days)
  - Expected: Error message "This sign-in link has expired or already been used"

- [ ] **Test 7:** New user invite - different device
  - Send invite, click link on different device (no localStorage)
  - Expected: User can manually enter email and complete signup

- [ ] **Test 8:** New user invite - already used link
  - Click a magic link that was already used
  - Expected: Error message about invalid/used link

- [ ] **Test 9:** New user invite - mismatched email
  - Try to complete signup with different email than invite
  - Expected: Sign-in should fail

### Password Reset Flow
- [ ] **Test 10:** Password reset - valid email
  - Click "Forgot Password" and enter valid email
  - Expected: Success message, email received

- [ ] **Test 11:** Password reset - complete flow
  - Click link in reset email
  - Set new password
  - Login with new password
  - Expected: User can login with new password

### Logout Flow
- [ ] **Test 12:** Logout clears session
  - Click "Sign Out"
  - Try to access protected route directly
  - Expected: Redirected to login page

### Session Persistence
- [ ] **Test 13:** Page refresh maintains login
  - Login and refresh page
  - Expected: User stays logged in

- [ ] **Test 14:** Browser back/forward during auth
  - Use browser navigation during login/signup
  - Expected: No errors, appropriate page shown

## User Management Tests

### Admin Functions
- [ ] **Test 15:** Admin can view all users
  - Login as admin, go to User Management
  - Expected: List of all users displayed

- [ ] **Test 16:** Admin can send invites
  - Click "Invite User", fill form, send
  - Expected: Invite created, email sent

- [ ] **Test 17:** Admin can change user roles
  - Edit a user and change their role
  - Expected: Role updated, reflected immediately

- [ ] **Test 18:** Admin can deactivate users
  - Deactivate a user account
  - Expected: User cannot login

### Permission Restrictions
- [ ] **Test 19:** Viewer cannot access User Management
  - Login as viewer, try to access /users
  - Expected: Access denied or menu item not visible

- [ ] **Test 20:** Editor cannot change user roles
  - Login as editor, check User Management access
  - Expected: Cannot access or limited functionality

## Permission Tests

### Role-Based Access
- [ ] **Test 21:** Viewer is read-only
  - Login as viewer
  - Expected: Cannot edit units, no edit buttons visible

- [ ] **Test 22:** Editor can edit units
  - Login as editor, try to edit a unit
  - Expected: Edit functionality works

- [ ] **Test 23:** Admin has full access
  - Login as admin
  - Expected: All features accessible

- [ ] **Test 24:** Permissions persist after refresh
  - Login, note permissions, refresh page
  - Expected: Same permissions after refresh

## Core Functionality Tests

### Dashboard
- [ ] **Test 25:** Dashboard loads correctly
  - Login and view dashboard
  - Expected: All developments shown with correct stats

- [ ] **Test 26:** Development list displays
  - Check all developments are listed
  - Expected: Name, unit count, status shown

### Unit Management
- [ ] **Test 27:** Unit modal opens correctly
  - Click on a unit to view details
  - Expected: Modal shows all unit information

- [ ] **Test 28:** Unit editing works
  - Edit unit fields and save
  - Expected: Changes saved successfully

- [ ] **Test 29:** Unit validation works
  - Try to save invalid data
  - Expected: Validation errors shown

### Data Import/Export
- [ ] **Test 30:** Export function works
  - Export units to Excel
  - Expected: Valid Excel file downloaded

- [ ] **Test 31:** Import function works
  - Modify exported Excel and import
  - Expected: Changes applied correctly

- [ ] **Test 32:** Import validation works
  - Try to import invalid data
  - Expected: Errors shown, invalid data rejected

### Reports
- [ ] **Test 33:** Reports generate correctly
  - Generate 12 Week Lookahead report
  - Expected: PDF generated with correct data

- [ ] **Test 34:** Sales Activity report works
  - Generate Sales Activity report
  - Expected: PDF generated with correct data

### Notes
- [ ] **Test 35:** Notes can be added
  - Add a note to a unit
  - Expected: Note saved and displayed

- [ ] **Test 36:** Notes can be viewed
  - View existing notes
  - Expected: All notes displayed with timestamps

### Audit Log
- [ ] **Test 37:** Audit log records changes
  - Make a change (edit unit, role change, etc.)
  - Check audit log
  - Expected: Action recorded with timestamp and user

## Error Handling Tests

- [ ] **Test 38:** Network error handling
  - Disable network, try to perform action
  - Expected: Appropriate error message shown

- [ ] **Test 39:** Session expiration handling
  - Wait for session to expire (or manually expire)
  - Try to perform action
  - Expected: Prompted to re-login

## Browser Compatibility

- [ ] **Test 40:** Chrome
- [ ] **Test 41:** Firefox
- [ ] **Test 42:** Safari
- [ ] **Test 43:** Edge

## Mobile Responsiveness

- [ ] **Test 44:** Dashboard on mobile
- [ ] **Test 45:** Unit modal on mobile
- [ ] **Test 46:** Login form on mobile

---

## Test Execution Log

| Test # | Date | Tester | Result | Notes |
|--------|------|--------|--------|-------|
|        |      |        |        |       |

## Known Issues

Document any known issues discovered during testing:

1.
2.
3.

## Sign-off

- [ ] All critical tests passed
- [ ] Known issues documented
- [ ] Ready for deployment

Tested by: _________________
Date: _________________
