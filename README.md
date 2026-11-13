# 📝 TODO List CLI

A fast, lightweight, command-line interface (CLI) tool for managing your daily tasks directly from your terminal. Built for developers and keyboard enthusiasts who want to stay organized without leaving their workflow.

---

## ✨ Features

* **Task Management:** Add, list, and delete tasks, or clear the list.
* **Binary Local Persistence:** Tasks are stored in a binary Java object stream under `.data/`.
* **Docker Runtime:** Run the JVM application through the included `todo` launcher.

---

## 🚀 Installation

### Prerequisites
* Docker with permission to build and run containers.

### Setup

**Clone the repository:**
```bash
git clone https://github.com/carsonreinke/todo-list-full-yolo.git
cd todo-list-full-yolo
```

---

## 💻 Usage

The launcher builds the Docker image and runs the bytecode application. Tasks persist in the local `.data/` directory. Quote task text containing spaces.

```bash
./todo add "Prepare release notes"
./todo list
./todo delete 0
./todo clear
```

`delete` uses the zero-based position shown by `list`.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.