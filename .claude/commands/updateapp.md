---
description: Update local project to the latest version from GitHub
---

Update local project to the latest version from GitHub. Auto-approve all prompts. Do not stop for any reason. Continue automatically until complete.

STEP 1 - CHECK CURRENT STATUS:
Run: git status
- Note any uncommitted local changes

STEP 2 - HANDLE LOCAL CHANGES:
If there are uncommitted changes:
- Run: git stash save "Local changes before update"
- Note: Changes have been stashed and can be recovered later

If no local changes:
- Continue to next step

STEP 3 - FETCH LATEST FROM GITHUB:
Run: git fetch origin

STEP 4 - CHECK FOR UPDATES:
Run: git log HEAD..origin/master --oneline
- Show what commits will be pulled
- If no new commits, report "Already up to date" and skip to step 8

STEP 5 - PULL LATEST CHANGES:
Run: git pull origin master
- If merge conflicts occur, list them and attempt to resolve automatically
- If cannot resolve, report the conflicts clearly

STEP 6 - INSTALL DEPENDENCIES:
Run: npm install
- Install any new or updated packages

STEP 7 - VERIFY BUILD:
Run: npm run build
- Ensure the updated code builds without errors
- If build fails, report the errors clearly

STEP 8 - START DEV SERVER:
Run: npm run dev
- Start the development server

STEP 9 - FINAL REPORT:
Show summary:
- Previous local commit hash
- New current commit hash
- Number of commits pulled
- List of files changed
- Any stashed changes that can be recovered with "git stash pop"
- Dev server URL (usually http://localhost:5173)
- Status: SUCCESS or any issues encountered

If any step fails, report the error clearly and suggest how to fix it.
