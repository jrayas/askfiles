# Folder Scan, Include and Exclude

## Principles
- On load the plugin scans the whole vault and builds the folder tree, so it works immediately with no setup.
- Default is "include all". People then carve out what they do not want.
- Dot-folders and Obsidian's own folders are hidden by default.
- New folders created outside the plugin appear automatically, with a manual rescan as a fallback.
- Rules survive folder renames and moves.

## Rule scopes
Each rule has an action (Exclude or Include) and a scope:
1. This folder and everything inside it
2. Only the subfolders (hide the children, keep the folder visible)
3. Only this folder (hide it, keep what is inside visible)

## Precedence
The deeper, more specific rule wins. Example: exclude Archive, but include Archive > 2024, so only 2024 appears.

## Scan modes
- **Include all, then exclude:** suits most people.
- **Include only chosen:** only ticked folders appear. Suits people who want the wizard limited to a few areas.

## ASCII: main folder screen
```
Folders

Scan mode             ● Include all     ○ Include only chosen
Auto-rescan           ● On              [ Rescan now ]

Hidden by default     .obsidian, other dot-folders


Vault tree                                     Filter folders...

  ☑  ▾ Knowledge
       ☑  Physics
       ☑  Maths
       ☑  Chemistry
       ☐  Drafts                               hidden
  ☑  ▾ Projects
       ☑  Client A
       ☑  Client B
  ☐  ▾ Archive                                 hidden
       ☑  2024                                 included (exception)
       ☐  2023                                 hidden
       ☐  2022                                 hidden
  ☐  ▸ Attachments                             hidden
  ☑  ▸ Journal
  ☑  ▸ Areas


This will hide 7 folders                       [ Save ]  [ Reset ]
```

## ASCII: scope menu
```
Archive

  ● This folder and everything inside
  ○ Only the subfolders (keep this folder visible)
  ○ Only this folder (keep what's inside visible)

  Action              Exclude  ▾
                      [ Apply ]
```

## ASCII: rules summary
```
Rules

  Archive             Exclude    Folder + subfolders      ✕
  Attachments         Exclude    Folder + subfolders      ✕
  Knowledge › Drafts  Exclude    Only this folder         ✕
  Archive › 2024      Include    Folder + subfolders      ✕

  The deeper rule wins.                    + Add rule
```

## ASCII: include-only-chosen mode
```
Scan mode             ○ Include all     ● Include only chosen

  ☐  Knowledge
  ☑  Projects
  ☐  Journal

  Nothing is shown except ticked folders.
```

## Behaviour notes
- Ticking a parent ticks its children, and individual children can be unticked. This creates exception rules automatically.
- Right-hand labels (hidden, included) show the outcome at a glance.
- Ticks and the rules list always stay in sync.
- A live count warns before saving ("This will hide 7 folders").
- Right-clicking a card in the main tab offers quick hide actions.
- Excluding hides existing folders. The lock stops creation. They are independent and the interface should say so.
