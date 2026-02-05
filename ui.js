import { DAY_LABELS, PRIORITY_RANK } from "./state.js";

export function setYear() {
  document.getElementById("year").textContent = new Date().getFullYear();
}

export function applyTheme(theme) {
  document.body.classList.toggle("light", theme === "light");
}

export function clearErrors(form) {
  form.querySelectorAll(".error").forEach(e => e.textContent = "");
  form.querySelectorAll(".input-error,.select-error,.textarea-error").forEach(el => {
    el.classList.remove("input-error","select-error","textarea-error");
  });
}

export function setFieldError(inputEl, msg) {
  const id = inputEl.id;
  const err = inputEl.closest(".field")?.querySelector(`[data-err="${id}"]`);
  if (err) err.textContent = msg;

  if (inputEl.tagName === "SELECT") inputEl.classList.add("select-error");
  else if (inputEl.tagName === "TEXTAREA") inputEl.classList.add("textarea-error");
  else inputEl.classList.add("input-error");
}

export function validateTaskForm({ title, dueDate, priority, category }, formEl) {
  clearErrors(formEl);
  let ok = true;

  if (!title || title.trim().length < 2) {
    setFieldError(formEl.querySelector("#taskTitle"), "Title is required (min 2 chars).");
    ok = false;
  }
  if (!dueDate) {
    setFieldError(formEl.querySelector("#taskDue"), "Due date is required.");
    ok = false;
  }
  if (!priority) {
    setFieldError(formEl.querySelector("#taskPriority"), "Select a priority.");
    ok = false;
  }
  if (!category) {
    setFieldError(formEl.querySelector("#taskCategory"), "Select a category.");
    ok = false;
  }
  return ok;
}

export function validateQuickForm({ title, dueDate }, formEl) {
  clearErrors(formEl);
  let ok = true;

  if (!title || title.trim().length < 2) {
    setFieldError(formEl.querySelector("#quickTitle"), "Title required.");
    ok = false;
  }
  if (!dueDate) {
    setFieldError(formEl.querySelector("#quickDue"), "Due date required.");
    ok = false;
  }
  return ok;
}

export function validateHabitForm({ name, goal }, formEl) {
  clearErrors(formEl);
  let ok = true;

  if (!name || name.trim().length < 2) {
    setFieldError(formEl.querySelector("#habitName"), "Habit name is required.");
    ok = false;
  }
  const g = Number(goal);
  if (!Number.isFinite(g) || g < 1 || g > 7) {
    setFieldError(formEl.querySelector("#habitGoal"), "Goal must be between 1 and 7.");
    ok = false;
  }
  return ok;
}

/* --------- SPA navigation --------- */
export function showView(routeId) {
  document.querySelectorAll(".view").forEach(v => v.hidden = true);
  const target = document.getElementById(routeId);
  if (target) target.hidden = false;

  document.querySelectorAll(".nav-link").forEach(a => {
    a.classList.toggle("active", a.dataset.route === routeId);
  });
}

export function closeMobileNav() {
  const nav = document.getElementById("mainNav");
  const btn = document.getElementById("burgerBtn");
  nav.classList.remove("open");
  btn.setAttribute("aria-expanded", "false");
}

/* --------- Dashboard --------- */
export function renderDashboard(state) {
  const tasks = state.tasks;
  const now = startOfDay(new Date());

  const completed = tasks.filter(t => t.completed).length;

  const soon = tasks.filter(t => {
    const d = startOfDay(new Date(t.dueDate));
    const diffDays = Math.floor((d - now) / (1000*60*60*24));
    return !t.completed && diffDays >= 0 && diffDays <= 2;
  }).length;

  // Habit streak (simple: total "true" in this week across all habits)
  const streak = state.habits.reduce((sum, h) => sum + h.progress.filter(Boolean).length, 0);

  document.getElementById("dashSoon").textContent = String(soon);
  document.getElementById("dashCompleted").textContent = String(completed);
  document.getElementById("dashStreak").textContent = String(streak);

  // Today list: due today or within 2 days
  const todayList = document.getElementById("todayList");
  const todayItems = tasks
    .filter(t => {
      const d = startOfDay(new Date(t.dueDate));
      const diffDays = Math.floor((d - now) / (1000*60*60*24));
      return diffDays >= 0 && diffDays <= 2;
    })
    .sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));

  document.getElementById("todayCount").textContent = `${todayItems.length} items`;
  todayList.innerHTML = todayItems.length ? "" : `<div class="item"><div><p class="item-title">No upcoming tasks 🎉</p><p class="item-meta">Add some tasks to see them here.</p></div></div>`;

  for (const t of todayItems) {
    todayList.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div>
          <p class="item-title">${escapeHtml(t.title)} ${t.completed ? "✅" : ""}</p>
          <p class="item-meta">
            Due: <strong>${formatDate(t.dueDate)}</strong> •
            <span class="badge ${t.priority.toLowerCase()}">${t.priority}</span> •
            ${escapeHtml(t.category)}
          </p>
        </div>
      </div>
    `);
  }

  // Progress
  const total = tasks.length || 0;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  document.getElementById("progressText").textContent = `${pct}%`;
  document.getElementById("progressBar").style.width = `${pct}%`;
}

/* --------- Tasks --------- */
export function renderTasks(state, controls) {
  const list = document.getElementById("tasksList");

  const filtered = applyTaskFilters(state.tasks, controls);
  const sorted = applyTaskSort(filtered, controls.sortBy);

  document.getElementById("taskCountPill").textContent = `${sorted.length} tasks`;
  list.innerHTML = "";

  if (!sorted.length) {
    list.innerHTML = `<div class="task-card"><p class="muted">No tasks found. Add a task above.</p></div>`;
    return;
  }

  for (const t of sorted) {
    list.insertAdjacentHTML("beforeend", `
      <article class="task-card ${t.completed ? "completed" : ""}" data-id="${t.id}">
        <div class="task-row">
          <h4>${escapeHtml(t.title)}</h4>
          <span class="badge ${t.priority.toLowerCase()}">${t.priority}</span>
        </div>
        <p class="muted" style="margin:6px 0 0;">
          Due: <strong>${formatDate(t.dueDate)}</strong> • Category: <strong>${escapeHtml(t.category)}</strong>
        </p>
        ${t.description ? `<p class="muted" style="margin:6px 0 0;">${escapeHtml(t.description)}</p>` : ""}

        <div class="task-actions">
          <button class="btn" data-action="toggle">
            ${t.completed ? '<i class="fa-regular fa-circle-xmark"></i> Uncomplete' : '<i class="fa-regular fa-circle-check"></i> Complete'}
          </button>
          <button class="btn" data-action="edit"><i class="fa-solid fa-pen"></i> Edit</button>
          <button class="btn danger" data-action="delete"><i class="fa-solid fa-trash"></i> Delete</button>
        </div>
      </article>
    `);
  }
}

function applyTaskFilters(tasks, controls) {
  let out = [...tasks];

  if (controls.status === "active") out = out.filter(t => !t.completed);
  if (controls.status === "completed") out = out.filter(t => t.completed);

  if (controls.category !== "all") out = out.filter(t => t.category === controls.category);

  return out;
}

function applyTaskSort(tasks, sortBy) {
  const out = [...tasks];

  if (sortBy === "priority") {
    out.sort((a,b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);
  } else {
    out.sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
  }

  return out;
}

/* --------- Habits --------- */
export function renderHabits(state, weekStartISO) {
  document.getElementById("weekStartLabel").textContent = weekStartISO;

  const list = document.getElementById("habitsList");
  document.getElementById("habitCountPill").textContent = `${state.habits.length} habits`;
  list.innerHTML = "";

  // summary: achieved = habits where trueCount >= goal
  const achieved = state.habits.filter(h => h.progress.filter(Boolean).length >= h.goal).length;
  document.getElementById("habitSummary").textContent = `${achieved} / ${state.habits.length} achieved`;

  if (!state.habits.length) {
    list.innerHTML = `<div class="habit-card"><p class="muted">No habits yet. Add one above.</p></div>`;
    return;
  }

  for (const h of state.habits) {
    const x = h.progress.filter(Boolean).length;
    list.insertAdjacentHTML("beforeend", `
      <article class="habit-card" data-id="${h.id}">
        <div class="task-row">
          <h4>${escapeHtml(h.name)}</h4>
          <span class="pill">${x} / ${h.goal}</span>
        </div>

        <div class="week" role="group" aria-label="Weekly progress">
          ${DAY_LABELS.map((d, idx) => `
            <button class="daybtn ${h.progress[idx] ? "on" : ""}" data-day="${idx}" type="button">
              ${d}
            </button>
          `).join("")}
        </div>

        <div class="task-actions">
          <button class="btn danger" data-action="deleteHabit"><i class="fa-solid fa-trash"></i> Delete</button>
        </div>
      </article>
    `);
  }
}

/* --------- Resources --------- */
export function renderResources(state, view) {
  const status = document.getElementById("resStatus");
  const list = document.getElementById("resourcesList");
  const countPill = document.getElementById("resCountPill");

  if (state.resources.status === "loading") {
    status.textContent = "Loading resources...";
    list.innerHTML = "";
    countPill.textContent = "—";
    return;
  }

  if (state.resources.status === "error") {
    status.textContent = `Error: ${state.resources.error}`;
    list.innerHTML = "";
    countPill.textContent = "0";
    return;
  }

  status.textContent = "";
  const all = state.resources.items;

  let items = all.filter(r => {
    const q = view.search.trim().toLowerCase();
    const matchesSearch = !q || (r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
    const matchesCat = view.category === "all" || r.category === view.category;
    const isFav = state.favorites.includes(r.id);
    const matchesFav = !view.favOnly || isFav;
    return matchesSearch && matchesCat && matchesFav;
  });

  countPill.textContent = String(items.length);
  list.innerHTML = "";

  if (!items.length) {
    list.innerHTML = `<div class="res-card"><p class="muted">No matching resources.</p></div>`;
    return;
  }

  for (const r of items) {
    const fav = state.favorites.includes(r.id);
    list.insertAdjacentHTML("beforeend", `
      <article class="res-card" data-id="${r.id}">
        <div class="res-top">
          <h4>${escapeHtml(r.title)}</h4>
          <button class="star ${fav ? "" : "off"}" data-action="toggleFav" aria-label="Toggle favorite" type="button">
            <i class="${fav ? "fa-solid" : "fa-regular"} fa-star"></i>
          </button>
        </div>
        <p class="muted" style="margin:0 0 6px;">Category: <strong>${escapeHtml(r.category)}</strong></p>
        <p class="muted" style="margin:0 0 10px;">${escapeHtml(r.description)}</p>
        <a href="${r.link}" target="_blank" rel="noopener noreferrer">
          Open link <i class="fa-solid fa-arrow-up-right-from-square"></i>
        </a>
      </article>
    `);
  }
}

/* --------- Helpers --------- */
export function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year:"numeric", month:"short", day:"2-digit" });
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  return d;
}

export function escapeHtml(str) {
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
