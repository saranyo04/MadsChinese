# MadsChinese

MadsChinese is a desktop Chinese learning application focused on reading, dictionary lookup, and study workflow.

Paste, type, or import Chinese text into a workspace and hover over words to instantly view definitions, pinyin, and translations. The application uses local CEDICT data and runs entirely on your machine, providing a fast and offline-friendly learning experience.

## Features

### Dictionary Lookup

* Instant hover dictionary lookup
* Local offline dictionary data
* Chinese-English definitions
* Tone-colored pinyin display
* Multi-character word matching
  
While studying you can understand Tone from colors that follow a fixed semantic scheme:

* First tone -> Red
* Second tone -> Orange
* Third tone -> Green
* Fourth tone -> Blue
* Neutral tone -> Gray

### Notes

* Create and manage study notes
* Save existing notes
* Save As New for branching notes and summaries
* Persistent note library
* Search saved notes

### PDF Support

* Import text-based PDF documents
* Extract Chinese and English text into the workspace
* Continue studying imported content inside the editor
* Export workspace content to PDF

### Themes

* Multiple built-in themes
* Theme switching from Settings
* Theme-aware workspace and dictionary surfaces
* Consistent semantic tone colors

### Study Quality of Life

* Automatic draft persistence (2.5s)
* Unsaved-change protection
* Keyboard shortcuts

## Dictionary Popup

The dictionary popup is designed for dictionary browsing.

Each entry displays:

* Headword (Chinese word)
* Pinyin pronunciation
* English definitions
* Tone-colored syllables

Tone colors follow a fixed semantic scheme:

* First tone -> Red
* Second tone -> Orange
* Third tone -> Green
* Fourth tone -> Blue
* Neutral tone -> Gray

## Keyboard Shortcuts

| Shortcut     | Action    |
| ------------ | --------- |
| Ctrl/Cmd + S | Save note |
| Ctrl/Cmd + T | New note  |

## Future Updates TBD

* PDF OCR capabilities.
* Vocabulary collection.
* Saved vocabulary lists.
* Reading statistics.
* AI Summary.

---  

Built with Vite, React, TypeScript, Tailwind CSS, and Tauri.

---  

## Acknowledgements

Built by Saranyo.

Special thanks to :contentReference[oaicite:2]{index=2} for inspiration behind the dictionary popup workflow, tone-color conventions, and Chinese reading experience.
