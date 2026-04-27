// ─── Storage lib — Mira Systems ─────────────────────────────────────────────
// Sauvegarde et restaure les données dans localStorage.
// Chaque fois qu'une mission est ajoutée, modifiée ou supprimée,
// appeler saveTasks(tasks) pour persister l'état.

const KEYS = {
  TASKS: "mira_tasks",
  RITUALS_DONE: "mira_rituals_done",
  RITUALS_DATE: "mira_rituals_date",
  PREFS: "mira_prefs",
};

// ── Preferences (theme, density, view, etc.) ─────────────────────────────────

const DEFAULT_PREFS = {
  theme: "light",        // "light" | "dark"
  density: "comfy",      // "comfy" | "compact"
  groupByProject: false, // missions view
  sidebarCollapsed: true, // mobile-hidden by default; CSS media query controls desktop
};

export function loadPrefs() {
  try {
    const raw = localStorage.getItem(KEYS.PREFS);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(KEYS.PREFS, JSON.stringify(prefs));
  } catch (e) {
    console.warn("[Mira] Impossible de sauvegarder les préférences :", e);
  }
}

// ── Tasks ────────────────────────────────────────────────────────────────────

export function saveTasks(tasks) {
  try {
    localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
  } catch (e) {
    console.warn("[Mira] Impossible de sauvegarder les tâches :", e);
  }
}

export function loadTasks(fallback, validClientIds = null) {
  try {
    const raw = localStorage.getItem(KEYS.TASKS);
    if (!raw) return fallback;
    let stored = JSON.parse(raw);
    if (!Array.isArray(stored)) return fallback;
    // Drop tasks whose client no longer exists (cleanup after client removal).
    if (validClientIds) {
      const before = stored.length;
      stored = stored.filter((t) => validClientIds.includes(t.client));
      if (stored.length !== before) {
        localStorage.setItem(KEYS.TASKS, JSON.stringify(stored));
      }
    }
    // Merge: new initial tasks added in code show up without wiping local edits.
    const ids = new Set(stored.map((t) => t.id));
    const missing = (fallback || []).filter((t) => !ids.has(t.id));
    if (missing.length === 0) return stored;
    const merged = [...stored, ...missing];
    localStorage.setItem(KEYS.TASKS, JSON.stringify(merged));
    return merged;
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
