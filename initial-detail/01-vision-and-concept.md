# Vision and Concept

## The problem
Creating a note in Obsidian means deciding where it lives, what it is called and what shape it takes, usually through a file dialog or by remembering paths. People with well-organised folders already hold a lot of meaning in their structure, but the tools to create notes do not use it.

## The idea
Turn the existing folder structure into a guided conversation. The person answers one simple question at a time. Every answer reveals the next question, based on the folders that exist beneath the choice just made. The last step is naming the note.

Example journey:
- "What's today's job?" -> Knowledge
- "What knowledge are we discussing?" -> Physics
- "Name your note" -> Quantum entanglement

## Folders as the database
- The vault's folders and subfolders provide every list of choices.
- Nothing needs to be kept in sync, because the folders are the source of truth.
- A typical hierarchy is Category > Domain > Subdomain, optionally with a Type.
- Depth varies. Some branches stop early, others go deeper. The plugin must handle uneven depth gracefully.

## Why it should feel special
- Questions are phrased as human intent ("What's today's job?"), not as file-system chores.
- One question per page keeps the experience calm and focused.
- The folder trail is always visible, so the person knows where the note will land.
- Clickable cards in rows and columns make choosing fast, on mouse, keyboard and touch.
- Everything is minimal, borderless and smooth.

## Audience
Anyone who captures notes often and already organises with folders: students, researchers, professionals, writers. Works on desktop and mobile versions of Obsidian.

## Name
**Askfiles**. The name describes the behaviour: the plugin asks, then files. Before publishing, the name should be re-checked against the Obsidian community plugin list, GitHub and Obsidian's current naming guidelines, because it has only been spot-checked.
