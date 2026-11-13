# 📝 TODO List CLI

A fast, lightweight, command-line interface (CLI) tool for managing your daily tasks directly from your terminal. Built for developers and keyboard enthusiasts who want to stay organized without leaving their workflow.

---

## ✨ Features

* **Zero-Friction Task Management:** Add, list, complete, and delete tasks in milliseconds.
* **Local Persistence:** Automatically saves your tasks locally so your list persists across terminal sessions.
* **Priority & Tagging Support:** Categorize tasks by project or urgency.
* **Clean Formatting:** Color-coded terminal output for quick readability.

---

## 🚀 Installation

### Prerequisites
* Ensure you have the required runtime installed (e.g., Node.js, Python, Go, or Rust—*update based on your stack*).

### Setup

**Clone the repository:**
```bash
git clone https://github.com/carsonreinke/todo-list-full-yolo.git
cd todo-list-full-yolo
```

---

## 💻 Usage & Controls

Launch the interactive interface simply by running:

```bash
todo
```

### ⌨️ Keyboard Shortcuts

Once inside the interactive session, use the following keys to manage your list:

| Key | Action |
| :--- | :--- |
| `↑` / `k` | Move cursor up |
| `↓` / `j` | Move cursor down |
| `Space` / `Enter` | Toggle task completion status (`[ ]` / `[x]`) |
| `a` or `n` | Add a new task (opens inline input prompt) |
| `e` | Edit the currently selected task |
| `d` or `Backspace` | Delete the currently selected task |
| `p` | Cycle task priority (Low → Medium → High) |
| `/` | Filter / search tasks in real time |
| `Tab` | Switch views (`All` / `Pending` / `Completed`) |
| `c` | Clear all completed tasks |
| `q` or `Esc` | Save and quit the application |

---

## 🖥️ Interactive Walkthrough

Here is what a typical session looks like in your terminal:

### 1. Launching the App (`$ todo`)
The TUI renders your current task list, highlights the active selection (`>`), and displays a footer bar with available shortcuts.

```text
┌──────────────────────────────────────────────────────────┐
│ 📝 TODO LIST                         [All] Pending Done  │
├──────────────────────────────────────────────────────────┤
│ > [ ] [HIGH] Fix authentication bug in login flow        │
│   [x] [MED]  Update project dependencies                 │
│   [ ] [LOW]  Write unit tests for task store             │
│   [ ] [MED]  Refactor ANSI color helper                  │
├──────────────────────────────────────────────────────────┤
│ 3 pending • 1 completed                                  │
│ ↑/↓: Move • Space: Toggle • a: Add • e: Edit • q: Quit   │
└──────────────────────────────────────────────────────────┘
```

### 2. Toggling a Task (`Space`)
With the first item selected, pressing `Space` immediately marks it complete and updates the status counter:

```text
┌──────────────────────────────────────────────────────────┐
│ 📝 TODO LIST                         [All] Pending Done  │
├──────────────────────────────────────────────────────────┤
│ > [x] [HIGH] Fix authentication bug in login flow        │
│   [x] [MED]  Update project dependencies                 │
│   [ ] [LOW]  Write unit tests for task store             │
│   [ ] [MED]  Refactor ANSI color helper                  │
├──────────────────────────────────────────────────────────┤
│ 2 pending • 2 completed                                  │
│ ↑/↓: Move • Space: Toggle • a: Add • e: Edit • q: Quit   │
└──────────────────────────────────────────────────────────┘
```

### 3. Adding a New Task (`a`)
Pressing `a` switches the footer into **Input Mode**, allowing you to type a new task directly inline and hit `Enter` to save:

```text
┌──────────────────────────────────────────────────────────┐
│ 📝 TODO LIST                         [All] Pending Done  │
├──────────────────────────────────────────────────────────┤
│ > [x] [HIGH] Fix authentication bug in login flow        │
│   [x] [MED]  Update project dependencies                 │
│   [ ] [LOW]  Write unit tests for task store             │
│   [ ] [MED]  Refactor ANSI color helper                  │
├──────────────────────────────────────────────────────────┤
│ New task: Prepare release notes for v1.2█                │
│ Enter: Save • Esc: Cancel                                │
└──────────────────────────────────────────────────────────┘
```

### 4. Filtering Views (`Tab`)
Pressing `Tab` cycles the view filter to **Pending**, hiding completed items so you can focus on what's left:

```text
┌──────────────────────────────────────────────────────────┐
│ 📝 TODO LIST                         All [Pending] Done  │
├──────────────────────────────────────────────────────────┤
│ > [ ] [LOW]  Write unit tests for task store             │
│   [ ] [MED]  Refactor ANSI color helper                  │
│   [ ] [MED]  Prepare release notes for v1.2              │
├──────────────────────────────────────────────────────────┤
│ Showing 3 pending tasks                                  │
│ ↑/↓: Move • Space: Toggle • a: Add • Tab: View • q: Quit │
└──────────────────────────────────────────────────────────┘
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.