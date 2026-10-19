# Additional Screens: ASCII Reference

Everything here follows the same rules as the main tab: borderless, minimal, black line icons, spacing instead of boxes. `[unlocked]`, `[locked]` and `[gear]` are placeholders for the matching icon set.

## 1. First-run welcome
```
                         Welcome to Askfiles

              Answer a few simple questions and your
              note finds its place in your folders.

                  We found 14 folders in your vault.


                              Start ↵

                     You can change anything later.
```

## 2. Quick-jump results (typing in the search line)
```
      ‹ Back     Home                              [unlocked]  [gear]

                        What's today's job?

                  knowl▏

          Knowledge
          Knowledge › Physics
          Knowledge › Physics › Optics
          Resources › Knowledge base

                   ↑ ↓ to choose     ↵ to go there
```

## 3. List layout (instead of grid)
```
      ‹ Back     Home › Knowledge                  [unlocked]  [gear]

                What knowledge are we discussing?

          Physics                          24 notes
          Maths                            18 notes
          Chemistry                        9 notes
          Biology                          12 notes
          Save here
          + New

          Filter topics...
```

## 4. Card with icon, description and count (optional extras)
```
          ◆ Knowledge          ◆ Projects          ◆ Journal
          Things I'm learning  Work in progress    Daily writing
          12 folders           8 folders           30 notes
```
`◆` stands for a small line icon or emoji chosen per folder.

## 5. Note type picker (final step)
```
      ‹ Back     Home › Knowledge › Physics        [unlocked]  [gear]

                         Name your note

                  Quantum entanglement ▏

          Type
          Reference     Idea     Meeting     Log     Other ▾

                         Create note ↵
```

## 6. Success state
```
                           Note created

            Knowledge › Physics › Quantum entanglement

          Open note ↵        Create another here        Close
```

## 7. Error and warning states
Name already exists:
```
                  Quantum entanglement ▏

          A note with this name already exists here.
          Open it instead, or choose a different name.
                         Open existing      Rename
```
Name has characters Obsidian cannot use:
```
                  Physics: Quantum / Spin ▏

          Some characters can't be used in note names.
          Use "Physics - Quantum - Spin"?       [ Use this ]
```
Folder vanished while in use:
```
                       That folder has gone

          It may have been moved or renamed outside Askfiles.
                    Go back to Home      Rescan
```
Lock on and folder missing:
```
          This folder doesn't exist, and folder creation is locked.
                   Unlock to create it      Go back
```

## 8. Create new folder (lock off)
```
      ‹ Back     Home › Knowledge                  [unlocked]  [gear]

                         New folder
                   Add a new place inside Knowledge

                  Geophysics ▏

                         Create folder ↵
```

## 9. Mobile layout (narrow screen)
```
 ‹  Home › Knowledge     [unlocked] [gear]

   What knowledge are we
   discussing?
   Choose a topic

   Physics        Maths

   Chemistry      Biology

   Astronomy      Geology

   Save here      + New

   Filter topics...
```
Settings open as a bottom sheet on mobile:
```
 ─────────────────────────────
   Settings                 ✕

   Lock folder creation  ● On
   View                  Grid
   Card size             Comfortable
   Apply to      This folder ▾

   More settings →
 ─────────────────────────────
```

## 10. Plugin settings: Per-folder question wording (Manage →)
```
Per-folder question wording

Folder                    Title                                  Description
Home (top level)          Uses phrase library                    Uses phrase library
Knowledge                 What knowledge are we discussing?      Choose a topic
Projects                  Which project are we on?               Pick one, or save here
Journal                   (uses default)

+ Add folder wording                                  Reset all
```

## 11. Plugin settings: Templates (Manage →)
```
Templates

Template folder           Templates/

Note type                 Template                     Default
Reference                 Templates/Reference          ●
Idea                      Templates/Idea               ○
Meeting                   Templates/Meeting            ○
Log                       (none)                       ○

+ Add note type
```

## 12. Plugin settings: Properties
```
Properties

Write answers to note properties     ● On

Level                  Property name
Category               category
Domain                 domain
Subdomain              subdomain
Type                   type

Only levels that were answered are written. No empty fields.
```

## 13. Plugin settings: Keyboard shortcuts (Manage →)
```
Keyboard shortcuts

Move between cards          ← ↑ → ↓
Choose highlighted card     Enter
Go back one level           Escape  or  Backspace on empty filter
Focus the search line       /
Toggle the lock             L
Open settings panel         ,
Save here                   S

All shortcuts can be changed.
```

## 14. Right-click confirmation
```
          Hidden "Drafts"
          It won't appear in Askfiles.            Undo
```
