import { createInitialState } from "./state.js";
import { loadState, saveState, resetAll } from "./storage.js";
import {
  setYear, applyTheme, showView, closeMobileNav,
  renderDashboard, renderTasks, renderHabits, renderResources,
  validateTaskForm, validateQuickForm, validateHabitForm, clearErrors
} from "./ui.js";

const DEFAULT_ROUTE = "dashboard";

let state = hydrate();
let taskControls = { status: "all", category: "all", sortBy: "dueDate" };
let resourcesView = { search: "", category: "all", favOnly: false };

// Boot
setYear();
initTheme();
initNav();
initForms();
initControls();
initHabitsWeeklyLogic();
initResources();
renderAll();

// ---------- State ----------
function hydrate() {
  const saved = loadState();
  if (saved && typeof saved === "object") return saved;
  const fresh = createInitialState();
  // Default week start (Sat-based week)
  fresh.settings.weekStartISO = computeWeekStartISO(new Date());
  return fresh;
}

function commit() {
  saveState(state);
  renderAll();
}

// ---------- Theme ----------
function initTheme() {
  const theme = state?.settings?.theme || "dark";
  applyTheme(theme);
}

// ---------- Navigation (SPA, no reload) ----------
function initNav() {
  const burger = document.getElementById("burgerBtn");
  const nav = document.getElementById("mainNav");

  burger.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
  });

  document.querySelectorAll(".nav-link").forEach(a => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const route = a.dataset.route;
      navigate(route);
      closeMobileNav();
    });
  });

  window.addEventListener("hashchange", () => {
    const route = (location.hash || "").replace("#", "") || DEFAULT_ROUTE;
    navigate(route, { pushHash:false });
  });

  // First load route
  const route = (location.hash || "").replace("#", "") || DEFAULT_ROUTE;
  navigate(route, { pushHash:false });
}

function navigate(route, opts = { pushHash:true }) {
  const routes = ["dashboard","tasks","habits","resources","settings"];
  const safeRoute = routes.includes(route) ? route : DEFAULT_ROUTE;

  showView(safeRoute);
  if (opts.pushHash) location.hash = safeRoute;
}

// ---------- Forms ----------
function initForms() {
  // Quick add from dashboard
  const quickForm = document.getElementById("quickTaskForm");
  quickForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("quickTitle").value;
    const dueDate = document.getElementById("quickDue").value;

    if (!validateQuickForm({ title, dueDate }, quickForm)) return;

    addTask({
      title,
      dueDate,
      priority: "Medium",
      category: "Study",
      description: ""
    });

    quickForm.reset();
    clearErrors(quickForm);
    navigate("tasks");
  });

  // Full tasks form
  const taskForm = document.getElementById("taskForm");
  taskForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = getTaskFormData();
    if (!validateTaskForm(data, taskForm)) return;

    if (state.editingTaskId) {
      updateTask(state.editingTaskId, data);
    } else {
      addTask(data);
    }

    taskForm.reset();
    clearErrors(taskForm);
    exitTaskEditMode();
  });

  document.getElementById("taskClearBtn").addEventListener("click", () => {
    taskForm.reset();
    clearErrors(taskForm);
  });

  document.getElementById("taskCancelEditBtn").addEventListener("click", () => {
    taskForm.reset();
    clearErrors(taskForm);
    exitTaskEditMode();
  });

  // Tasks list delegation
  document.getElementById("tasksList").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const card = e.target.closest("[data-id]");
    const id = card?.dataset?.id;
    if (!id) return;

    const action = btn.dataset.action;
    if (action === "toggle") toggleTaskComplete(id);
    if (action === "edit") enterTaskEditMode(id);
    if (action === "delete") deleteTask(id);
  });

  // Habits form
  const habitForm = document.getElementById("habitForm");
  habitForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("habitName").value;
    const goal = document.getElementById("habitGoal").value;

    if (!validateHabitForm({ name, goal }, habitForm)) return;

    addHabit({ name, goal: Number(goal) });
    habitForm.reset();
    clearErrors(habitForm);
  });

  document.getElementById("habitClearBtn").addEventListener("click", () => {
    habitForm.reset();
    clearErrors(habitForm);
  });

  // Habits delegation (toggle days + delete)
  document.getElementById("habitsList").addEventListener("click", (e) => {
    const habitCard = e.target.closest(".habit-card[data-id]");
    if (!habitCard) return;

    const id = habitCard.dataset.id;

    const dayBtn = e.target.closest("button.daybtn");
    if (dayBtn) {
      const day = Number(dayBtn.dataset.day);
      toggleHabitDay(id, day);
      return;
    }

    const delBtn = e.target.closest("button[data-action='deleteHabit']");
    if (delBtn) {
      deleteHabit(id);
    }
  });

  // Settings
  document.getElementById("themeToggleBtn").addEventListener("click", () => {
    const next = (state.settings.theme === "light") ? "dark" : "light";
    state.settings.theme = next;
    applyTheme(next);
    commit();
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    const ok = confirm("Are you sure you want to reset ALL data? This cannot be undone.");
    if (!ok) return;
    resetAll();
    state = createInitialState();
    state.settings.weekStartISO = computeWeekStartISO(new Date());
    state.settings.theme = "dark";
    applyTheme("dark");
    // reload resources after reset
    initResources(true);
    commit();
    navigate("dashboard");
  });

  // Student name in About
  // عدّلها باسمك
  document.getElementById("studentName").textContent = "MOHAMED";
}

function getTaskFormData() {
  return {
    title: document.getElementById("taskTitle").value,
    description: document.getElementById("taskDesc").value,
    dueDate: document.getElementById("taskDue").value,
    priority: document.getElementById("taskPriority").value,
    category: document.getElementById("taskCategory").value
  };
}

// ---------- Controls (filter/sort) ----------
function initControls() {
  document.getElementById("filterStatus").addEventListener("change", (e) => {
    taskControls.status = e.target.value;
    renderAll();
  });
  document.getElementById("filterCategory").addEventListener("change", (e) => {
    taskControls.category = e.target.value;
    renderAll();
  });
  document.getElementById("sortBy").addEventListener("change", (e) => {
    taskControls.sortBy = e.target.value;
    renderAll();
  });

  document.getElementById("seedBtn").addEventListener("click", () => {
    seedTasks();
  });

  // Resources controls
  document.getElementById("resSearch").addEventListener("input", (e) => {
    resourcesView.search = e.target.value;
    renderAll();
  });
  document.getElementById("resCategory").addEventListener("change", (e) => {
    resourcesView.category = e.target.value;
    renderAll();
  });
  document.getElementById("showFavOnlyBtn").addEventListener("click", () => {
    resourcesView.favOnly = !resourcesView.favOnly;
    renderAll();
  });

  // Resources list delegation for favorites
  document.getElementById("resourcesList").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action='toggleFav']");
    if (!btn) return;
    const card = e.target.closest(".res-card[data-id]");
    if (!card) return;
    const id = Number(card.dataset.id);
    toggleFavorite(id);
  });
}

// ---------- Weekly habits logic ----------
function initHabitsWeeklyLogic() {
  // Reset week start if changed
  const currentWeekStart = computeWeekStartISO(new Date());
  if (state.settings.weekStartISO !== currentWeekStart) {
    state.settings.weekStartISO = currentWeekStart;
    // reset all habits progress at new week
    state.habits = state.habits.map(h => ({ ...h, progress: new Array(7).fill(false) }));
    commit();
  }
}

// ---------- Resources fetch (async) ----------
async function initResources(force = false) {
  if (!force && state.resources.items?.length) return;

  state.resources.status = "loading";
  state.resources.error = "";
  renderAll();

  try {
    const res = await fetch("./resources.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.resources.items = Array.isArray(data) ? data : [];
    state.resources.status = "success";
  } catch (err) {
    state.resources.status = "error";
    state.resources.error = err?.message || "Failed to load resources.json";
  }
  commit();
}

// ---------- CRUD Tasks ----------
function addTask({ title, description, dueDate, priority, category }) {
  const task = {
    id: crypto.randomUUID(),
    title: title.trim(),
    description: (description || "").trim(),
    dueDate,
    priority,
    category,
    completed: false
  };
  state.tasks.unshift(task);
  commit();
}

function toggleTaskComplete(id) {
  state.tasks = state.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
  commit();
}

function enterTaskEditMode(id) {
  const t = state.tasks.find(x => x.id === id);
  if (!t) return;

  state.editingTaskId = id;

  document.getElementById("taskTitle").value = t.title;
  document.getElementById("taskDesc").value = t.description || "";
  document.getElementById("taskDue").value = t.dueDate;
  document.getElementById("taskPriority").value = t.priority;
  document.getElementById("taskCategory").value = t.category;

  document.getElementById("taskSubmitBtn").textContent = "Save";
  document.getElementById("taskCancelEditBtn").hidden = false;
  document.getElementById("editPill").hidden = false;
  document.getElementById("taskFormTitle").textContent = "Edit Task";
}

function exitTaskEditMode() {
  state.editingTaskId = null;
  document.getElementById("taskSubmitBtn").textContent = "Add Task";
  document.getElementById("taskCancelEditBtn").hidden = true;
  document.getElementById("editPill").hidden = true;
  document.getElementById("taskFormTitle").textContent = "Add Task";
}

function updateTask(id, data) {
  state.tasks = state.tasks.map(t => {
    if (t.id !== id) return t;
    return {
      ...t,
      title: data.title.trim(),
      description: (data.description || "").trim(),
      dueDate: data.dueDate,
      priority: data.priority,
      category: data.category
    };
  });
  commit();
}

function deleteTask(id) {
  const ok = confirm("Delete this task?");
  if (!ok) return;
  state.tasks = state.tasks.filter(t => t.id !== id);
  if (state.editingTaskId === id) exitTaskEditMode();
  commit();
}

function seedTasks() {
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0,10);

  const samples = [
    { title:"Finish Web project layout", dueDate: iso(addDays(today, 1)), priority:"High", category:"Assignment", description:"Make sure SPA navigation works." },
    { title:"Study JavaScript events", dueDate: iso(addDays(today, 2)), priority:"Medium", category:"Study", description:"Delegation + forms validation." },
    { title:"Prepare quiz notes", dueDate: iso(addDays(today, 5)), priority:"Low", category:"Personal", description:"Short review." }
  ];

  for (const s of samples) addTask({ ...s });
}

// ---------- CRUD Habits ----------
function addHabit({ name, goal }) {
  const habit = {
    id: crypto.randomUUID(),
    name: name.trim(),
    goal,
    progress: new Array(7).fill(false) // Sat–Fri
  };
  state.habits.unshift(habit);
  commit();
}

function toggleHabitDay(id, dayIndex) {
  state.habits = state.habits.map(h => {
    if (h.id !== id) return h;
    const p = [...h.progress];
    p[dayIndex] = !p[dayIndex];
    return { ...h, progress: p };
  });
  commit();
}

function deleteHabit(id) {
  const ok = confirm("Delete this habit?");
  if (!ok) return;
  state.habits = state.habits.filter(h => h.id !== id);
  commit();
}

// ---------- Favorites ----------
function toggleFavorite(id) {
  const has = state.favorites.includes(id);
  state.favorites = has ? state.favorites.filter(x => x !== id) : [...state.favorites, id];
  commit();
}

// ---------- Render ----------
function renderAll() {
  // Keep theme applied
  applyTheme(state.settings.theme || "dark");

  renderDashboard(state);
  renderTasks(state, taskControls);
  renderHabits(state, state.settings.weekStartISO);
  renderResources(state, resourcesView);
}

// ---------- Utils ----------
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Week starts Saturday (Sat–Fri) as in sheet.
 * Return ISO string YYYY-MM-DD.
 */
function computeWeekStartISO(date) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  const day = d.getDay(); // Sun=0 ... Sat=6
  // Want Saturday as start:
  // offset from today back to Saturday
  // For Sun(0) => go back 1 day? actually Saturday is 6, so go back 1 day from Sun to Sat.
  // formula:
  const offset = (day - 6 + 7) % 7; 
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0,10);
}
