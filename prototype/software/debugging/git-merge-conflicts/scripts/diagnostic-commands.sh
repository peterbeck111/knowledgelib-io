# === Find conflicts ===
git status                              # shows files with UU (unmerged) status
git diff --name-only --diff-filter=U   # only conflicted filenames
git diff                                # full diff of all unresolved hunks
git log --merge --oneline --left-right # commits that contributed to conflicts

# === Inspect both sides ===
git show :1:file.js   # common ancestor (base)
git show :2:file.js   # ours (HEAD / current branch)
git show :3:file.js   # theirs (incoming branch)

# === Quick resolution ===
git checkout --ours file.js    # take current branch version
git checkout --theirs file.js  # take incoming branch version
git add file.js

# === After resolving ===
git diff --check               # verify no stray conflict markers
git status                     # confirm no more UU files

# === Abort ===
git merge --abort
git rebase --abort
git cherry-pick --abort

# === rerere ===
git rerere status              # show conflicts being tracked
git rerere diff                # show recorded resolutions
git rerere forget file.js      # forget a bad resolution
ls .git/rr-cache/              # browse all cached resolutions

# === Configuration ===
git config --global merge.conflictStyle diff3        # show base in markers
git config --global rerere.enabled true              # auto-record resolutions
git config --global rerere.autoupdate true           # auto-stage rerere fixes
git config --global merge.tool vscode                # set VS Code as merge tool
git config --global mergetool.keepBackup false       # suppress .orig files
