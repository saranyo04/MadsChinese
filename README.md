# MadsChinese

v0.1.0

MadsChinese is a desktop application for learning Chinese through reading.

Paste, type, or import Chinese text into the workspace and hover over words to instantly view pinyin and English definitions. Everything runs locally on your machine for a fast, offline-friendly study experience.
Make notes and save them for later. Import/Export PDF with chinese selectable characters.

## Features

### Dictionary Lookup

* Instant hover dictionary lookup
* Offline Chinese-English dictionary
* Pinyin with tone colors
* Multi-character word matching

Tone colors follow a fixed scheme:

* First tone → Red
* Second tone → Orange
* Third tone → Green
* Fourth tone → Blue
* Neutral tone → Gray

### Notes

* Create and save study notes
* Search saved notes
* Persistent note library

### PDF Support

* Import text-based PDF documents
* Extract Chinese and English text into the workspace
* Continue studying imported content
* Export workspace content to PDF

### Themes

* Multiple built-in themes
* Theme-aware workspace and dictionary popup
* Consistent tone colors across themes

### Quality of Life

* Unsaved-change protection
* Keyboard shortcuts

## Keyboard Shortcuts

| Shortcut     | Action    |
| ------------ | --------- |
| Ctrl/Cmd + S | Save note |
| Ctrl/Cmd + T | New note  |

## Future Updates

* PDF OCR support
* Vocabulary collection
* Saved vocabulary lists
* Reading statistics
* AI summaries

---

Built with Vite, React, TypeScript, Tailwind CSS, and Tauri.

---

## Acknowledgements

Built by Saranyo.

Special thanks to [Zhongwen Browser Extension](https://github.com/cschiller/zhongwen) for inspiration behind the dictionary popup workflow, tone-color conventions, and Chinese reading experience.

Chinese dictionary data is derived from CC-CEDICT, © CC-CEDICT contributors, and is licensed under CC BY-SA 4.0.

https://www.mdbg.net/chinese/dictionary?page=cc-cedict
