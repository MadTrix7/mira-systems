// ─── Storage lib — Mira Systems ─────────────────────────────────────────────
// Sauvegarde et restaure les données dans localStorage.
// Chaque fois qu'une mission est ajoutée, modifiée ou supprimée,
// appeler saveTasks(tasks) pour persister l'état.

const KEYS = {
  TASKS: "mira_tasks",
  RITUALS_DONE: "mira_rituals_done",
  RITUALS_DATE: "mira_rituals_date",
};

// ── Tasks ────────────────────────────────────────────────────────────────────

export function saveTasks(tasks) {
  try {
    localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
  } catch (e) {
    console.warn("[Mira] Impossible de sauvegarder les tâches :", e);
  }
}

export function loadTasks(fallback) {
  try {
    const raw = localStorage.getItem(KEYS.TASKS);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// ── Rituals — reset automatique à minuit ─────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10); // "2026-04-24"
}

export function saveRitualsDone(ids) {
  try {
    localStorage.setItem(KEYS.RITUALS_DONE, JSON.stringify(ids));
    localStorage.setItem(KEYS.RITUALS_DATE, todayStr());
  } catch (e) {
    console.warn("[Mira] Impossible de sauvegarder les rituels :", e);
  }
}

export function loadRitualsDone() {
  try {
    const savedDate = localStorage.getItem(KEYS.RITUALS_DATE);
    if (savedDate !== todayStr()) {
      // Nouveau jour → reset automatique
      localStorage.removeItem(KEYS.RITUALS_DONE);
      localStorage.removeItem(KEYS.RITUALS_DATE);
      return [];
    }
    const raw = localStorage.getItem(KEYS.RITUALS_DONE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ── Utilitaires ──────────────────────────────────────────────────────────────

export function clearAll() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}
