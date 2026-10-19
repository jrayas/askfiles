# Main Tab: ASCII Reference

Borderless and minimal. Spacing and alignment do the work that boxes would do.

**Icon legend:** `[unlocked]`, `[locked]` and `[gear]` are plain-text placeholders for three matching black line icons: an open padlock, a closed padlock and a gear. They are drawn as a set, not as emoji.

## Page 1: the starting question
```
                                                      [unlocked]  [gear]


                        What's today's job?
                    Pick where this note belongs


          Knowledge          Projects          Journal
          12 folders         8 folders         30 notes


          Areas              Resources         + New


                  Search or type a path...
```

## Page 2: a deeper level, with scrolling
```
      ‹ Back     Home › Knowledge                     [unlocked]  [gear]


                What knowledge are we discussing?
              Choose a topic, or save it at this level


          Physics       Maths        Chemistry     Biology

          Astronomy     Geology      Save here     + New

          Zoology       Botany       Ecology       Optics

                         scroll for more ↓


                    Filter topics...
```

## Page 3: naming the note
```
      ‹ Back     Home › Knowledge › Physics           [unlocked]  [gear]


                         Name your note
                   Give it a title you'll recognise


                  Quantum entanglement ▏


          Type      Reference ▾


                         Create note ↵
```

## Same level with the lock on
The "+ New" option is gone and the padlock is closed.
```
      ‹ Back     Home › Knowledge                     [locked]  [gear]


                What knowledge are we discussing?
                     Choose a topic


          Physics       Maths        Chemistry     Biology

          Astronomy     Geology      Save here


                    Filter topics...
```

## Empty level (no subfolders)
```
      ‹ Back     Home › Journal                       [unlocked]  [gear]


                         Nothing deeper here
                      Save your note in Journal


                          Continue ↵      + New folder
```

## Right-click on a card
```
          Knowledge          Projects          Journal
                                │
                                ├ Hide this folder
                                ├ Hide its subfolders
                                └ Open in plugin settings
```

## Corner icons
Lock first, then gear, always in the top-right corner and in the same position on every page.

- **One matching set.** The open padlock, closed padlock and gear are line icons from the same family, with the same size, stroke weight and corner style, so the lock looks like a sibling of the gear.
- **Black, theme-aware.** Both icons are black in light themes and white in dark themes, by inheriting the theme's text colour. No bright red or green, and no colour emoji.
- **State shown by shape.** Closed padlock means locked. Open padlock means unlocked. The colour never changes.
- **Quiet until needed.** Both are slightly dimmed and darken on hover, with equal spacing between them.
- **Clickable.** Clicking the padlock toggles the lock. Clicking the gear opens the in-tab settings panel.

```
Unlocked      Home › Knowledge                       [unlocked]  [gear]
Locked        Home › Knowledge                       [locked]    [gear]
```

## Behaviour notes
- Titles and descriptions come from the phrase library.
- "Save here" is a card at every level.
- The search line at the bottom is the quick path.
- The breadcrumb is clickable at every part.
- Layout (grid or list, columns, card size) follows the settings.
