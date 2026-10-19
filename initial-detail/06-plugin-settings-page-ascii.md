# Plugin Settings Page: ASCII Reference

This is the settings page for **Askfiles**. Sub-screens marked "Manage →" are drawn in `11-additional-screens-ascii.md`.

This is the plugin's page inside Obsidian's normal settings window. It holds set-once, structural options. Rule of thumb: if the person would change it mid-flow it lives in the gear panel; if they would set it once and forget it, it lives here.

```
Askfiles Settings

General
Root folder                      /
Excluded folders                 Archive, Attachments   (see Folders)
Default note type                Reference
Open after creating              ● On

Questions
Starting question                Phrase library
Per-folder question wording      Manage →

Phrase Library
Add / edit / disable titles and descriptions     Manage →
Import / export library

Templates
Template per note type           Manage →
Template folder                  Templates/

Properties
Write category, domain, subdomain to note properties     ● On
Property names                   category, domain, subdomain

Folders
Scan mode                        ● Include all   ○ Include only chosen
Rules and tree picker            Manage →

Behaviour
Remember last choice             ○ Off
Quick-jump search                ● On
Hide empty folders               ○ Off
Keyboard shortcuts               Manage →

Advanced
Reset everything
Debug logging                    ○ Off
```

## Notes
- Each option lives in one place only, except the lock which appears in both the gear panel and the top bar.
- Structural choices (excluded folders, property names) sit here because changing them carelessly can affect existing notes.
- The page should also point to the in-tab gear for layout options.
- Hide empty folders is off by default, because a new empty folder is often exactly where a note should go.
