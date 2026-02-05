export const DAY_LABELS = ["Sat","Sun","Mon","Tue","Wed","Thu","Fri"];
export const PRIORITY_RANK = { High: 3, Medium: 2, Low: 1 };

export function createInitialState() {
  return {
    tasks: [],
    habits: [],
    favorites: [],
    settings: {
      theme: "dark",
      weekStartISO: null
    },
    editingTaskId: null,
    resources: {
      items: [],
      status: "idle", // idle | loading | success | error
      error: ""
    }
  };
}
