# Titles and Descriptions Library

Every page has a **title** (the question) and a quieter **description** line. People sometimes want something different, so wording is a library they can extend.

## Concepts
- Each level has its own pool of phrases (top level, deeper levels, naming page).
- A phrase is a title plus an optional description.
- Pools contain variations on the same question, so the choices beneath always still make sense.
- Ships with a good starter set so it feels alive on first use.

## Modes
- **Fixed:** always the same phrase.
- **Random:** a different phrase each visit.
- **Rotate:** cycles through in order.
- Titles and descriptions can be paired (consistent tone) or mixed freely. A setting chooses.

## Controls
- Add a new phrase, choose its level.
- Edit or disable a phrase without deleting it.
- Per-folder override, for example Knowledge always asks "What knowledge are we discussing?".
- Import and export the library.
- Restore the starter set.

## Starter examples
Top level:
- What's today's job? / Pick where this note belongs
- What are we working on? / Choose a starting point
- Where does this belong? / Start with the big picture

Deeper level:
- What knowledge are we discussing? / Choose a topic, or save it at this level
- Which area shall we dive into? / Pick one, or stop here

Naming:
- Name your note / Give it a title you'll recognise
- What shall we call it? / Keep it short and clear

## ASCII: phrase library screen (proposed, lives on the plugin settings page)
```
Phrase Library

Mode                  ● Random   ○ Rotate   ○ Fixed
Titles and descriptions    ● Paired   ○ Mixed


Level                                          Filter phrases...

  ▾ Top level
       ●  What's today's job?               Pick where this note belongs
       ●  What are we working on?           Choose a starting point
       ○  Where does this belong?           Start with the big picture      (off)
  ▾ Deeper levels
       ●  What knowledge are we discussing? Choose a topic, or save it...
       ●  Which area shall we dive into?    Pick one, or stop here
  ▸ Naming page


+ Add phrase       Import      Export      Restore starter set
```

## ASCII: add or edit a phrase
```
Add phrase

Title            What are we exploring today?
Description      Choose a place to begin
Level            Top level ▾
Only for folder  (optional)  Knowledge ▾

                 [ Save ]  [ Cancel ]
```
