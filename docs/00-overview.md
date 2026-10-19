# Askfiles — Developer & Architecture Overview

## 1. What Askfiles Is

**Askfiles** ("ask, then file") is a guided, question-by-question note creation plugin for Obsidian. Instead of presenting a traditional file-path picker or forcing the user to remember folder hierarchies, Askfiles treats the **vault's existing folder tree as a conversational database**.

### Example User Journey
1. **Level 0 (Top Level)**: *"What's today's job?"* → User clicks **Knowledge**
2. **Level 1 (Subfolder)**: *"What knowledge are we discussing?"* → User clicks **Physics**
3. **Final Step (Naming & Type)**: *"Name your note"* → User enters `Quantum entanglement`, picks note type `Reference`, and presses `Enter`.
4. **Result**: Creates `Knowledge/Physics/Quantum entanglement.md`, populates frontmatter properties (`category: Knowledge`, `domain: Physics`, `type: Reference`) and optional template content, and either opens the note immediately or shows the confirmation screen.

---

## 2. Core Product Pillars

| Pillar | Description | Brief Reference |
|---|---|---|
| **Folders as Database** | Choices at each step are generated live from the vault's folders. No external database is required. | [01-vision-and-concept.md](../initial-detail/01-vision-and-concept.md) |
| **Optional Depth ("Save here")** | Uneven folder trees work naturally. Users can stop at any folder via **Save here** or continue deeper until a leaf folder is reached. | [02-features.md](../initial-detail/02-features.md) |
| **Borderless, Calm UI** | Minimalist layout structured by whitespace, alignment, and typography. Adapts seamlessly to light/dark themes and desktop/mobile screens. | [04-main-tab-ascii.md](../initial-detail/04-main-tab-ascii.md), [09-design-principles.md](../initial-detail/09-design-principles.md) |
| **Monochrome Corner Icons & Lock** | Top-right bar always shows a matching line-icon set: **Padlock** (open = unlocked, closed = locked, by shape only) and **Gear** (opens live-preview slide-in panel). When locked, `+ New` folder creation is disabled everywhere. | [04-main-tab-ascii.md](../initial-detail/04-main-tab-ascii.md), [05-in-tab-settings-ascii.md](../initial-detail/05-in-tab-settings-ascii.md) |
| **Phrase Library** | Questions (titles) and subtitles (descriptions) come from level-based pools (`top`, `deeper`, `naming`) with `fixed`, `random`, or `rotate` selection modes and per-folder overrides. | [08-phrase-library.md](../initial-detail/08-phrase-library.md) |
| **Folder Include/Exclude Engine** | Supports `include-all` and `include-chosen` scan modes, 3 rule scopes (`folder-and-children`, `children-only`, `folder-only`), deepest-rule-wins precedence, and automatic path updates on folder rename/move. | [07-folder-include-exclude.md](../initial-detail/07-folder-include-exclude.md) |
| **Frontmatter & Templates** | Writes answered hierarchy levels (`category`, `domain`, `subdomain`, etc.) and optional `type` to YAML frontmatter via `fileManager.processFrontMatter`, and applies an optional template file per note type. | [02-features.md](../initial-detail/02-features.md), [11-additional-screens-ascii.md](../initial-detail/11-additional-screens-ascii.md) |

---

## 3. Documentation Index

1. **[00-overview.md](./00-overview.md)** — High-level summary, product pillars, and documentation index.
2. **[01-architecture.md](./01-architecture.md)** — Module breakdown, directory layout, state flow, and Obsidian API integration patterns.
3. **[02-data-model-and-settings.md](./02-data-model-and-settings.md)** — Complete TypeScript schemas for settings, rules, phrases, templates, and view state.
4. **[03-folder-engine-and-rules.md](./03-folder-engine-and-rules.md)** — Algorithms for vault scanning, rule scope resolution, deepest-rule-wins evaluation, tree-picker state, and rename survival.
5. **[04-ui-and-interaction-spec.md](./04-ui-and-interaction-spec.md)** — Screen-by-screen UI components, custom SVG line icons, keyboard navigation matrix, gear drawer, and settings sub-screens.
6. **[05-open-questions-decisions.md](./05-open-questions-decisions.md)** — Concrete design and technical decisions resolving `initial-detail/10-open-questions.md`.
7. **[06-implementation-plan.md](./06-implementation-plan.md)** — Step-by-step phased implementation and verification plan.
