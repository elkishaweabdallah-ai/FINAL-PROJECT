# SPA StudyBuddy (Web-1 Final Project)

## University / Course
- الجامعة الإسلامية – غزة
- كلية تكنولوجيا المعلومات
- برمجة ويب 1 عميل — SDEV 2105
- الفصل الأول 2025/2026
- المعيد: محمد زقالم
- المشروع النهائي: SPA StudyBuddy (Student Planner + Habit Tracker + Resources)

## Project Description
StudyBuddy is a Single Page Application (SPA) that helps students:
- Organize Tasks / Assignments
- Track Weekly Habits (Sat–Fri)
- Save learning Resources
- View a Dashboard showing progress

## Features
### SPA Navigation
- One HTML file (index.html)
- Navigation using JavaScript only (no page reload)
- Active link state
- Mobile hamburger menu + desktop navbar

### Dashboard
- Summary cards: soon due tasks, completed tasks, habit streak
- “Today” section (due today or within 2 days)
- Progress bar (completed/total * 100)
- Quick Add Task

### Tasks (CRUD + Filter + Sort)
- Add / Edit / Delete (with confirmation)
- Complete / Uncomplete
- Validation with clear error messages
- Filter by status and category
- Sort by due date or priority
- Stored in localStorage

### Habits (Weekly Tracker)
- Add habit (name + goal 1–7 days/week)
- Toggle daily progress (Sat–Fri)
- Shows X / goal
- Weekly summary (achieved goals)
- Stored in localStorage
- Weekly reset when a new week starts

### Resources (Async + Favorites)
- Loads items from resources.json using fetch()
- Loading and error states
- Search + category filter
- Favorites (star) stored in localStorage

### Settings / About
- Light/Dark theme toggle stored in localStorage
- Reset all data with confirmation
- About section includes student name

## How to Run
1) Put all project files in one folder.
2) Run using a local server (recommended):
   - VS Code → Install “Live Server”
   - Right click `index.html` → “Open with Live Server”
3) The app will open in the browser and resources will load correctly.

> Note: fetch() may not work correctly if you open index.html directly without a server.

## Required Files
- index.html
- style.css
- js/ (app.js + other modules)
- resources.json
- README.md

## Screenshots
(Add screenshots here)
- Dashboard
- Tasks
- Habits
- Resources
- Settings

## Student
- Name: محمد نعيم عزمي خلف
- ID: 120220835