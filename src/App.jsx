import { useState, useEffect, useMemo, useRef } from "react";
import { CLIENTS, clientById } from "./data/clients";
import { INITIAL_TASKS } from "./data/tasks";
import { RITUALS } from "./data/rituals";
import { saveTasks, loadTasks, saveRitualsDone, loadRitualsDone, loadPrefs, savePrefs } from "./lib/storage";

// ─── Templates de tâches ────────────────────────────────────────────────────
const TASK_TEMPLATES = [
  {
    id: "tpl-audit-ghl",
    label: "Audit GHL",
    client: "anissa",
    project: "GHL Setup",
    title: "Audit GHL — [scope]",
    description: "Auditer une zone GHL et documenter les écarts.",
    steps: [
      "Lister tags / workflows / funnels existants",
      "Identifier les incohérences",
      "Documenter dans tableau action",
      "Proposer plan de remédiation",
    ],
  },
  {
    id: "tpl-workflow-ghl",
    label: "Workflow GHL",
    client: "anissa",
    project: "Workflows",
    title: "Workflow GHL — [nom]",
    description: "Construire un workflow GHL bout en bout.",
    steps: [
      "Définir trigger + conditions",
      "Lister actions et délais",
      "Construire dans GHL",
      "Tester avec contact test",
      "Mettre en prod et documenter",
    ],
  },
  {
    id: "tpl-stripe-link",
    label: "Lien Stripe",
    client: "anissa",
    project: "Stripe",
    title: "Lien Stripe — [produit]",
    description: "Créer ou maintenir un lien de paiement Stripe.",
    steps: [
      "Définir produit + prix + récurrence",
      "Créer le payment link Stripe",
      "Tester en mode sandbox",
      "Sauvegarder le lien dans la base Ressources",
    ],
  },
  {
    id: "tpl-data-migration",
    label: "Migration data",
    client: "anissa",
    project: "GHL Setup",
    title: "Migration data — [source → cible]",
    description: "Migrer une portion de données entre deux systèmes.",
    steps: [
      "Snapshot complet de la source",
      "Mapper les champs source → cible",
      "Importer en mode test",
      "Vérifier 5 enregistrements aléatoires",
      "Lancer l'import complet",
      "Documenter le run",
    ],
  },
];

// ─── CSV export helper ──────────────────────────────────────────────────────
function exportTasksToCSV(tasks) {
  const cols = ["id", "client", "status", "due", "project", "priority", "title", "description"];
  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const rows = [cols.join(",")];
  tasks.forEach((t) => rows.push(cols.map((c) => escape(t[c])).join(",")));
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mira-tasks-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg: "#FAFAF8",
  surface: "#FFFFFF",
  border: "#E2E0DB",
  borderSoft: "#F0EDE7",
  navy: "#1A1A2E",
  navyFaint: "#F0EFF9",
  blue: "#2D5BE3",
  blueFaint: "#EBF0FE",
  amber: "#B45309",
  amberFaint: "#FEF3C7",
  green: "#065F46",
  greenFaint: "#D1FAE5",
  red: "#B91C1C",
  redFaint: "#FEE2E2",
  violet: "#6D28D9",
  violetFaint: "#F5F3FF",
  muted: "#8A8880",
  serif: "'Poppins', sans-serif",
  sans: "'Poppins', sans-serif",
  shadow: "0 1px 2px rgba(26,26,46,0.04), 0 4px 12px rgba(26,26,46,0.04)",
  shadowLg: "0 8px 24px rgba(26,26,46,0.08), 0 2px 6px rgba(26,26,46,0.04)",
};

const STATUS = {
  active:   { label: "En cours", bg: C.blueFaint,   color: C.blue },
  review:   { label: "Révision", bg: C.amberFaint,  color: C.amber },
  upcoming: { label: "À venir",  bg: C.violetFaint, color: C.violet },
  done:     { label: "Livré",    bg: C.greenFaint,  color: C.green },
};


// ─── Helpers ─────────────────────────────────────────────────────────────────
const TODAY = new Date();

function fmtDate(s) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function isOverdue(s) {
  if (!s) return false;
  return s < todayISO();
}

function toLocalISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayISO() {
  return toLocalISO(new Date());
}

function addOneMonth(dateStr) {
  if (!dateStr) return null;
  const [y, m, day] = dateStr.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  d.setMonth(d.getMonth() + 1);
  return toLocalISO(d);
}

function ymKey(dateStr) {
  // "2026-04-26" → "2026-04"
  return dateStr ? dateStr.slice(0, 7) : "";
}

function fmtMonth(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ClientDot({ id, size = 8 }) {
  const cl = clientById[id];
  return <span style={{ width: size, height: size, borderRadius: "50%", background: cl?.color || C.muted, display: "inline-block", flexShrink: 0 }} />;
}

function StatusBadge({ status, small }) {
  const s = STATUS[status];
  return (
    <span style={{
      fontSize: small ? "8px" : "9px", padding: small ? "1px 6px" : "2px 9px",
      borderRadius: "20px", background: s.bg, color: s.color,
      fontWeight: "600", letterSpacing: "0.07em", whiteSpace: "nowrap",
    }}>
      {s.label.toUpperCase()}
    </span>
  );
}

function TaskChip({ task, isDragging, onDragStart, onDragEnd }) {
  const cl = clientById[task.client];
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
      title={`${task.title} — ${cl.name}${task.project ? " · " + task.project : ""}`}
      style={{
        fontSize: "9px", padding: "3px 6px", borderRadius: "3px",
        background: C.surface,
        borderLeft: `2px solid ${cl.color}`,
        color: C.navy, lineHeight: "1.3",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        cursor: "grab", opacity: isDragging ? 0.4 : 1,
        userSelect: "none",
        minWidth: 0, maxWidth: "100%",
      }}
    >
      {task.priority === "urgent" && <span style={{ color: C.red, fontWeight: "700", marginRight: "3px" }}>!</span>}
      {task.title}
    </div>
  );
}

function TaskCard({ task, expanded, onToggle, onStatusChange, onToggleRecurring, onChangeDue, onChangeTitle, onCheck, onDelete, onChangeNotes, onToggleStep, density = "comfy" }) {
  const cl = clientById[task.client];
  const isRecurring = task.recurring === "monthly";
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: "8px",
      marginBottom: "6px",
      overflow: "hidden",
      borderLeft: `3px solid ${cl.color}`,
    }}>
      {/* Row */}
      <div
        onClick={onToggle}
        className="task-row"
        style={{ padding: "11px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}
      >
        {onCheck && (
          <div
            onClick={(e) => { e.stopPropagation(); onCheck(); }}
            title="Marquer comme livré"
            className="task-check"
            style={{
              width: "20px", height: "20px", borderRadius: "5px",
              border: `1.5px solid ${cl.color}55`,
              background: C.surface, flexShrink: 0,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "border-color 0.12s, background 0.12s, transform 0.12s",
            }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
            {task.priority === "urgent" && (
              <span title="Urgent" style={{ width: "5px", height: "5px", borderRadius: "50%", background: C.red, display: "inline-block", flexShrink: 0 }} />
            )}
            <span className="task-title" style={{ fontSize: "13px", fontWeight: "600", color: C.navy, letterSpacing: "-0.01em" }}>
              {task.title}
            </span>
            {isRecurring && (
              <span title="Mensuel récurrent" style={{ fontSize: "10px", color: C.violet }}>↻</span>
            )}
          </div>
          <div className="task-meta" style={{ fontSize: "10px", color: C.muted, marginTop: "3px" }}>
            {task.project}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <span style={{ fontSize: "11px", color: isOverdue(task.due) ? C.red : C.muted, fontWeight: isOverdue(task.due) ? "600" : "400" }}>
            {fmtDate(task.due)}
          </span>
          <span style={{ fontSize: "9px", color: C.muted, display: "inline-block", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.borderSoft}`, padding: "14px 16px", background: "#FDFCFB" }}>
          {onChangeTitle && (
            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, marginBottom: "5px" }}>Titre</div>
              <input
                type="text"
                value={task.title}
                onChange={(e) => onChangeTitle(e.target.value)}
                style={{
                  width: "100%", fontSize: "13px", fontWeight: "600",
                  padding: "7px 10px", borderRadius: "6px",
                  border: `1px solid ${C.border}`, background: C.surface,
                  color: C.navy, fontFamily: C.sans,
                }}
              />
            </div>
          )}
          <p style={{ fontSize: "12px", color: "#4A4845", lineHeight: "1.7", marginBottom: "14px", fontStyle: "italic" }}>
            {task.description}
          </p>
          {task.steps && task.steps.length > 0 && (() => {
            const stepsDone = Array.isArray(task.stepsDone) ? task.stepsDone : [];
            const total = task.steps.length;
            const doneCount = stepsDone.length;
            return (
              <div style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "9px" }}>
                  <div style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted }}>
                    Étapes
                  </div>
                  <div style={{ fontSize: "9px", color: C.muted }}>
                    {doneCount} / {total}
                  </div>
                </div>
                {total > 0 && (
                  <div style={{ height: "2px", background: C.borderSoft, borderRadius: "2px", marginBottom: "9px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(doneCount / total) * 100}%`, background: cl.color, transition: "width 0.3s" }} />
                  </div>
                )}
                {task.steps.map((step, i) => {
                  const done = stepsDone.includes(i);
                  return (
                    <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "7px", alignItems: "flex-start" }}>
                      <div
                        onClick={(e) => { e.stopPropagation(); onToggleStep && onToggleStep(i); }}
                        style={{
                          width: "14px", height: "14px", borderRadius: "3px",
                          border: `1.5px solid ${done ? cl.color : C.border}`,
                          background: done ? cl.color : "transparent",
                          flexShrink: 0, marginTop: "2px",
                          cursor: onToggleStep ? "pointer" : "default",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        {done && <span style={{ fontSize: "9px", color: "#fff", fontWeight: "700", lineHeight: 1 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: "12px", color: done ? C.muted : C.navy, lineHeight: "1.6", textDecoration: done ? "line-through" : "none" }}>{step}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          {onChangeNotes && (
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, marginBottom: "5px" }}>Notes</div>
              <textarea
                value={task.notes || ""}
                onChange={(e) => onChangeNotes(e.target.value)}
                placeholder="Notes libres, blocages, infos client…"
                rows={2}
                style={{
                  width: "100%", fontSize: "12px",
                  padding: "7px 10px", borderRadius: "6px",
                  border: `1px solid ${C.border}`, background: C.surface,
                  color: C.navy, fontFamily: C.sans, resize: "vertical",
                  outline: "none",
                }}
              />
            </div>
          )}
          <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: `1px solid ${C.borderSoft}`, display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "9px", color: C.muted, letterSpacing: "0.08em", alignSelf: "center", marginRight: "4px" }}>STATUT :</span>
            {Object.entries(STATUS).map(([key, val]) => (
              <button
                key={key}
                onClick={() => onStatusChange(key)}
                style={{
                  fontSize: "9px", padding: "3px 10px", borderRadius: "20px",
                  border: `1px solid ${task.status === key ? val.color : C.border}`,
                  background: task.status === key ? val.bg : "transparent",
                  color: task.status === key ? val.color : C.muted,
                  cursor: "pointer", letterSpacing: "0.05em", fontWeight: task.status === key ? "600" : "400",
                }}
              >
                {val.label}
              </button>
            ))}
          </div>
          {onChangeDue && (
            <div style={{ marginTop: "10px", display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "9px", color: C.muted, letterSpacing: "0.08em" }}>DATE PRÉVUE :</span>
              <input
                type="date"
                value={task.due || ""}
                onChange={(e) => onChangeDue(e.target.value || null)}
                style={{
                  fontSize: "11px", padding: "4px 8px", borderRadius: "6px",
                  border: `1px solid ${C.border}`, background: C.surface,
                  color: C.navy, fontFamily: C.sans, cursor: "pointer",
                }}
              />
              {task.due && (
                <button
                  onClick={() => onChangeDue(null)}
                  title="Retirer la date"
                  style={{
                    fontSize: "9px", color: C.muted, background: "none",
                    border: `1px solid ${C.border}`, borderRadius: "4px",
                    padding: "3px 8px", cursor: "pointer",
                  }}
                >
                  Sans date
                </button>
              )}
            </div>
          )}
          {onToggleRecurring && (
            <div style={{ marginTop: "10px", display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "9px", color: C.muted, letterSpacing: "0.08em" }}>RÉCURRENCE :</span>
              <button
                onClick={onToggleRecurring}
                style={{
                  fontSize: "9px", padding: "3px 10px", borderRadius: "20px",
                  border: `1px solid ${isRecurring ? C.violet : C.border}`,
                  background: isRecurring ? C.violetFaint : "transparent",
                  color: isRecurring ? C.violet : C.muted,
                  cursor: "pointer", letterSpacing: "0.05em", fontWeight: isRecurring ? "600" : "400",
                }}
              >
                {isRecurring ? "↻ Mensuel (cliquer pour désactiver)" : "Marquer comme mensuel"}
              </button>
            </div>
          )}
          {task.doneAt && task.status === "done" && (
            <div style={{ marginTop: "8px", fontSize: "9px", color: C.muted, letterSpacing: "0.05em" }}>
              ✓ Livré le {new Date(task.doneAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          )}
          {onDelete && (
            <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: `1px solid ${C.borderSoft}`, display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Supprimer "${task.title}" ?`)) onDelete();
                }}
                style={{
                  fontSize: "9px", letterSpacing: "0.08em",
                  color: C.red, background: "none",
                  border: `1px solid ${C.redFaint}`,
                  borderRadius: "4px", padding: "4px 10px",
                  cursor: "pointer",
                }}
              >
                ✕ Supprimer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("aujourd-hui");
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // all|active|review|upcoming|urgent|overdue
  const [tasks, setTasks] = useState(() => loadTasks(INITIAL_TASKS, CLIENTS.map(c => c.id)));
  const [expanded, setExpanded] = useState(null);
  const [ritualsDone, setRitualsDone] = useState(() => loadRitualsDone());
  const [ritualExpanded, setRitualExpanded] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [historyMonth, setHistoryMonth] = useState(ymKey(todayISO()));
  const [calendarMonth, setCalendarMonth] = useState(ymKey(todayISO()));
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [undo, setUndo] = useState(null); // { snapshot, label }
  const [prefs, setPrefs] = useState(() => loadPrefs());
  const undoTimerRef = useRef(null);

  // Persist prefs whenever they change
  useEffect(() => { savePrefs(prefs); }, [prefs]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      const isInput = ["INPUT", "TEXTAREA"].includes(e.target.tagName) || e.target.isContentEditable;
      // Cmd/Ctrl+K → search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (isInput) return;
      // / → search
      if (e.key === "/") { e.preventDefault(); setSearchOpen(true); return; }
      // n → new task
      if (e.key === "n") { e.preventDefault(); setShowModal(true); return; }
      // esc → close any modal
      if (e.key === "Escape") {
        if (searchOpen) setSearchOpen(false);
        if (showModal) setShowModal(false);
        if (expanded) setExpanded(null);
        return;
      }
      // g h / g k / g a → navigate
      // (skipped — keep simple)
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen, showModal, expanded]);

  // Quick-add state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newProject, setNewProject] = useState("");
  const [newPriority, setNewPriority] = useState(null);
  const [addClient, setAddClient] = useState("anissa");
  const [newSteps, setNewSteps] = useState([]);

  // Derived counts (overdue, urgent, today, week)
  const counts = useMemo(() => {
    const today = todayISO();
    const overdue = tasks.filter(t => t.status !== "done" && t.due && t.due < today).length;
    const urgent = tasks.filter(t => t.status !== "done" && t.priority === "urgent").length;
    const todayCount = tasks.filter(t => t.status !== "done" && t.due === today).length;
    const week = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      const limit = d.toISOString().slice(0, 10);
      return tasks.filter(t => t.status !== "done" && t.due && t.due >= today && t.due <= limit).length;
    })();
    return { overdue, urgent, today: todayCount, week };
  }, [tasks]);

  // Done tasks (used by historique)
  const doneTasks = tasks.filter(t =>
    t.status === "done" && (filter === "all" || t.client === filter)
  );

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return tasks.filter(t =>
      (t.title || "").toLowerCase().includes(q) ||
      (t.project || "").toLowerCase().includes(q) ||
      (t.description || "").toLowerCase().includes(q) ||
      (t.notes || "").toLowerCase().includes(q) ||
      (clientById[t.client]?.name || "").toLowerCase().includes(q)
    ).slice(0, 30);
  }, [searchQuery, tasks]);

  function updateStatus(id, status) {
    setTasks(prev => {
      const today = todayISO();
      const target = prev.find(t => t.id === id);
      const wasDone = target && target.status === "done";
      const isDone = status === "done";

      let updated = prev.map(t => {
        if (t.id !== id) return t;
        return {
          ...t,
          status,
          doneAt: isDone ? (t.doneAt || today) : null,
        };
      });

      // Auto-clone monthly recurring task when newly marked done
      if (!wasDone && isDone && target && target.recurring === "monthly") {
        const baseDue = target.due || today;
        const nextDue = addOneMonth(baseDue);
        const baseId = target.id.replace(/-r\d{6}$/, "");
        const newId = `${baseId}-r${ymKey(nextDue).replace("-", "")}`;
        const alreadyExists = prev.some(t => t.id === newId);
        if (!alreadyExists) {
          const clone = {
            ...target,
            id: newId,
            status: "upcoming",
            due: nextDue,
            doneAt: null,
            recurring: "monthly",
          };
          updated = [...updated, clone];
        }
      }

      saveTasks(updated);
      return updated;
    });
    setExpanded(null);
  }

  function updateRecurring(id) {
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id !== id) return t;
        return { ...t, recurring: t.recurring === "monthly" ? null : "monthly" };
      });
      saveTasks(updated);
      return updated;
    });
  }

  function updateDue(id, due) {
    setTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, due } : t);
      saveTasks(updated);
      return updated;
    });
  }

  function updateTitle(id, title) {
    setTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, title } : t);
      saveTasks(updated);
      return updated;
    });
  }

  function updateNotes(id, notes) {
    setTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, notes } : t);
      saveTasks(updated);
      return updated;
    });
  }

  function toggleStep(id, idx) {
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id !== id) return t;
        const cur = Array.isArray(t.stepsDone) ? t.stepsDone : [];
        const next = cur.includes(idx) ? cur.filter(i => i !== idx) : [...cur, idx];
        return { ...t, stepsDone: next };
      });
      saveTasks(updated);
      return updated;
    });
  }

  function deleteTask(id) {
    setTasks(prev => {
      const snapshot = prev;
      const updated = prev.filter(t => t.id !== id);
      saveTasks(updated);
      const target = prev.find(t => t.id === id);
      pushUndo(snapshot, `Tâche supprimée : ${target?.title || ""}`);
      return updated;
    });
    setExpanded(null);
  }

  function pushUndo(snapshot, label) {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndo({ snapshot, label });
    undoTimerRef.current = setTimeout(() => setUndo(null), 6000);
  }

  function applyUndo() {
    if (!undo) return;
    setTasks(undo.snapshot);
    saveTasks(undo.snapshot);
    setUndo(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  }

  // Wrap updateStatus to push undo when marking done
  function updateStatusWithUndo(id, status) {
    if (status === "done") {
      const snapshot = tasks;
      const target = tasks.find(t => t.id === id);
      pushUndo(snapshot, `Livré : ${target?.title || ""}`);
    }
    updateStatus(id, status);
  }

  function closeModal() {
    setShowModal(false);
    setNewTitle("");
    setNewDescription("");
    setNewDue("");
    setNewProject("");
    setNewPriority(null);
    setNewSteps([]);
  }

  function saveTask() {
    if (!newTitle.trim()) return;
    const newTask = {
      id: `task-${Date.now()}`,
      client: addClient,
      status: "upcoming",
      due: newDue || null,
      project: newProject.trim() || "Divers",
      priority: newPriority,
      title: newTitle.trim(),
      description: newDescription.trim(),
      steps: newSteps,
      stepsDone: [],
      notes: "",
    };
    setTasks(prev => {
      const updated = [newTask, ...prev];
      saveTasks(updated);
      return updated;
    });
    closeModal();
  }

  const navBtn = (id, label, icon, badge) => (
    <button
      key={id}
      onClick={() => setView(id)}
      style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "8px 11px", borderRadius: "6px", border: "none",
        background: view === id ? C.navyFaint : "transparent",
        color: view === id ? C.navy : C.muted,
        fontSize: "12px", fontWeight: view === id ? "600" : "400",
        letterSpacing: "0.02em", cursor: "pointer", width: "100%", textAlign: "left",
      }}
    >
      <span style={{ fontSize: "11px", opacity: 0.6 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && badge.value > 0 && (
        <span style={{
          fontSize: "9px", padding: "1px 6px", borderRadius: "10px",
          background: badge.color || C.navyFaint,
          color: badge.fg || C.navy,
          fontWeight: "700", minWidth: "16px", textAlign: "center",
        }}>
          {badge.value}
        </span>
      )}
    </button>
  );

  const filterBtn = (id, label, dot) => (
    <button
      key={id}
      onClick={() => setFilter(id)}
      style={{
        display: "flex", alignItems: "center", gap: "7px",
        padding: "7px 11px", borderRadius: "6px", border: "none",
        background: filter === id ? C.navyFaint : "transparent",
        color: filter === id ? C.navy : C.muted,
        fontSize: "12px", fontWeight: filter === id ? "600" : "400",
        cursor: "pointer", width: "100%", textAlign: "left",
        marginBottom: "1px",
      }}
    >
      {dot}
      {label}
    </button>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; font-family: ${C.sans}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; border: 2px solid ${C.bg}; }
        ::-webkit-scrollbar-thumb:hover { background: ${C.muted}; }
        .hover-bg:hover { background: ${C.bg} !important; }
        .hover-lift { transition: transform 0.18s cubic-bezier(.4,0,.2,1), box-shadow 0.18s, opacity 0.18s; }
        .hover-lift:hover { transform: translateY(-1px); box-shadow: ${C.shadowLg}; }
        .hover-card { transition: border-color 0.15s, box-shadow 0.15s; }
        .hover-card:hover { border-color: ${C.borderSoft}; box-shadow: ${C.shadow}; }
        input:focus, textarea:focus { outline: 2px solid ${C.navy}30 !important; outline-offset: 1px; }
        .task-check:hover { border-color: ${C.green} !important; background: ${C.greenFaint} !important; }
        .task-check:hover::after { content: "✓"; font-size: 11px; color: ${C.green}; font-weight: 700; }
        .cal-cell { transition: background 0.12s, border-color 0.12s, transform 0.12s; }
        .cal-cell:hover:not(.empty) { border-color: ${C.border} !important; }
        .cal-cell:hover .cell-add-btn { opacity: 1 !important; }
        .cell-add-btn:hover { background: ${C.navy} !important; color: #fff !important; }
        .density-compact .task-row { padding: 6px 14px !important; gap: 9px !important; }
        .density-compact .task-row .task-meta { display: none; }
        .density-compact .task-row .task-title { font-size: 12px !important; }
        .density-compact main { padding: 14px 18px !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.25s ease-out; }
        @media (max-width: 720px) {
          aside.sidebar { position: fixed; left: 0; top: 0; bottom: 0; z-index: 100; transform: translateX(-100%); transition: transform 0.2s; }
          aside.sidebar.open { transform: translateX(0); }
          .mobile-burger { display: inline-flex !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      <div className={prefs.density === "compact" ? "density-compact" : ""} style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: C.sans, background: C.bg }}>

        {/* ── SIDEBAR ─────────────────────────────────────────────── */}
        <aside className={`sidebar ${prefs.sidebarCollapsed ? "" : "open"}`} style={{ width: "210px", flexShrink: 0, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column" }}>
          {/* Brand */}
          <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${C.borderSoft}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: C.navy }} />
              <span style={{ fontFamily: C.serif, fontSize: "15px", fontWeight: "700", color: C.navy }}>Mira Systems</span>
            </div>
            <div style={{ fontSize: "9px", letterSpacing: "0.14em", color: C.muted, marginTop: "2px", paddingLeft: "14px" }}>
              AUTOMATISATION & TECH
            </div>
          </div>

          {/* Nav */}
          <div style={{ padding: "16px 8px 4px" }}>
            {navBtn("aujourd-hui","Aujourd'hui",       "★", counts.overdue > 0 ? { value: counts.overdue, color: C.redFaint, fg: C.red } : counts.today > 0 ? { value: counts.today, color: C.navyFaint, fg: C.navy } : null)}
            {navBtn("calendrier", "Calendrier",        "▤")}
            {navBtn("historique", "Historique",        "❒")}
            {navBtn("rituels",    "Rituels",           "↺")}
          </div>

          {/* Footer — search shortcut + settings */}
          <div style={{ marginTop: "auto", borderTop: `1px solid ${C.borderSoft}`, padding: "12px" }}>
            <button
              onClick={() => setSearchOpen(true)}
              title="Rechercher (⌘K)"
              style={{
                width: "100%", fontSize: "11px", padding: "8px 10px", borderRadius: "6px",
                border: `1px solid ${C.border}`, background: "transparent",
                color: C.muted, cursor: "pointer", textAlign: "left",
                display: "flex", alignItems: "center", gap: "8px",
              }}
            >
              <span style={{ opacity: 0.6 }}>⌕</span>
              <span style={{ flex: 1 }}>Rechercher</span>
              <span style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "3px", background: C.bg, color: C.muted, letterSpacing: "0.05em" }}>⌘K</span>
            </button>
            <div style={{ display: "flex", gap: "5px", marginTop: "6px" }}>
              <button
                onClick={() => setPrefs(p => ({ ...p, density: p.density === "compact" ? "comfy" : "compact" }))}
                title={`Densité : ${prefs.density === "compact" ? "compact" : "confort"}`}
                style={{
                  flex: 1, fontSize: "10px", padding: "5px 8px", borderRadius: "5px",
                  border: `1px solid ${C.border}`, background: "transparent",
                  color: C.muted, cursor: "pointer",
                }}
              >
                {prefs.density === "compact" ? "Compact" : "Confort"}
              </button>
              <button
                onClick={() => exportTasksToCSV(tasks)}
                title="Export CSV"
                style={{
                  flex: 1, fontSize: "10px", padding: "5px 8px", borderRadius: "5px",
                  border: `1px solid ${C.border}`, background: "transparent",
                  color: C.muted, cursor: "pointer",
                }}
              >
                Export CSV
              </button>
            </div>
          </div>
        </aside>

        {/* ── MAIN ────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Header */}
          <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "14px 24px", display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
            <button
              className="mobile-burger"
              onClick={() => setPrefs(p => ({ ...p, sidebarCollapsed: !p.sidebarCollapsed }))}
              style={{
                display: "none", alignItems: "center", justifyContent: "center",
                width: "32px", height: "32px", borderRadius: "6px",
                border: `1px solid ${C.border}`, background: "transparent",
                cursor: "pointer", fontSize: "14px", color: C.navy,
                padding: 0, lineHeight: 1,
              }}
              title="Menu"
            >
              ☰
            </button>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontFamily: C.serif, fontSize: "20px", fontWeight: "600", color: C.navy, lineHeight: 1.2, letterSpacing: "-0.01em" }}>
                {{
                  "aujourd-hui": "Aujourd'hui",
                  rituels: "Rituels quotidiens — Anissa",
                  calendrier: "Calendrier",
                  historique: "Historique",
                }[view]}
              </h1>
            </div>
            {view === "aujourd-hui" && (
              <button
                className="hover-lift"
                onClick={() => setShowModal(true)}
                style={{
                  display: "flex", alignItems: "center", gap: "7px",
                  padding: "9px 18px", borderRadius: "8px",
                  background: C.navy, color: "#fff",
                  border: "none", cursor: "pointer",
                  fontSize: "12px", fontWeight: "600", letterSpacing: "0.04em",
                  boxShadow: C.shadow,
                }}
              >
                <span style={{ fontSize: "15px", lineHeight: 1 }}>+</span>
                Nouvelle tâche
              </button>
            )}
          </header>

          {/* Scroll area */}
          <main style={{ flex: 1, overflow: "auto", padding: "22px 24px" }}>

            {/* ── AUJOURD'HUI (vue principale — toutes les tâches) ── */}
            {view === "aujourd-hui" && (() => {
              const today = todayISO();
              const inWeek = (() => {
                const d = new Date();
                d.setDate(d.getDate() + 7);
                return toLocalISO(d);
              })();
              const matchClient = (t) => filter === "all" || t.client === filter;
              const matchStatusFilter = (t) => {
                if (statusFilter === "all") return true;
                if (statusFilter === "urgent") return t.priority === "urgent";
                if (statusFilter === "overdue") return t.due && t.due < today;
                return t.status === statusFilter;
              };
              const visible = tasks.filter(t => t.status !== "done" && matchClient(t) && matchStatusFilter(t));

              const overdue   = visible.filter(t => t.due && t.due < today);
              const dueToday  = visible.filter(t => t.due === today);
              const week      = visible.filter(t => t.due && t.due > today && t.due <= inWeek);
              const later     = visible.filter(t => t.due && t.due > inWeek);
              const undated   = visible.filter(t => !t.due);

              const renderTask = (task) => (
                <div key={task.id} className="fade-in">
                  <TaskCard
                    task={task}
                    expanded={expanded === task.id}
                    onToggle={() => setExpanded(expanded === task.id ? null : task.id)}
                    onStatusChange={(s) => updateStatusWithUndo(task.id, s)}
                    onToggleRecurring={() => updateRecurring(task.id)}
                    onChangeDue={(d) => updateDue(task.id, d)}
                    onChangeTitle={(t) => updateTitle(task.id, t)}
                    onChangeNotes={(n) => updateNotes(task.id, n)}
                    onToggleStep={(i) => toggleStep(task.id, i)}
                    onCheck={() => updateStatusWithUndo(task.id, "done")}
                    onDelete={() => deleteTask(task.id)}
                    density={prefs.density}
                  />
                </div>
              );

              const sections = [
                { key: "overdue",  title: "En retard",      color: C.red,    faint: C.redFaint,    items: overdue },
                { key: "today",    title: "Aujourd'hui",    color: C.blue,   faint: C.blueFaint,   items: dueToday },
                { key: "week",     title: "Cette semaine",  color: C.violet, faint: C.violetFaint, items: week },
                { key: "later",    title: "À venir",        color: C.amber,  faint: C.amberFaint,  items: later },
                { key: "undated",  title: "Sans date",      color: C.muted,  faint: C.borderSoft,  items: undated },
              ];

              return (
                <div>
                  {/* Hero stats */}
                  <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
                    {[
                      { label: "En retard",   val: overdue.length,   color: overdue.length > 0 ? C.red : C.muted, sub: overdue.length === 0 ? "rien à rattraper" : "à traiter en priorité" },
                      { label: "Aujourd'hui", val: dueToday.length,  color: C.blue,   sub: "tâches du jour" },
                      { label: "Cette semaine", val: week.length,    color: C.violet, sub: "7 prochains jours" },
                      { label: "Total actif", val: visible.length,   color: C.navy,   sub: "tâches ouvertes" },
                    ].map(s => (
                      <div key={s.label} className="hover-card" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "18px 20px", boxShadow: C.shadow }}>
                        <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, marginBottom: "8px", fontWeight: "500" }}>{s.label}</div>
                        <div style={{ fontFamily: C.serif, fontSize: "36px", fontWeight: "600", color: s.color, lineHeight: 1, letterSpacing: "-0.02em" }}>{s.val}</div>
                        <div style={{ fontSize: "10px", color: C.muted, marginTop: "6px" }}>{s.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Filter chips */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "20px", flexWrap: "wrap" }}>
                    {[
                      { id: "all",      label: "Toutes" },
                      { id: "urgent",   label: "Urgent",   color: C.red,    faint: C.redFaint },
                      { id: "overdue",  label: "En retard", color: C.red,   faint: C.redFaint },
                      { id: "active",   label: "En cours", color: C.blue,   faint: C.blueFaint },
                      { id: "review",   label: "Révision", color: C.amber,  faint: C.amberFaint },
                      { id: "upcoming", label: "À venir",  color: C.violet, faint: C.violetFaint },
                    ].map(p => {
                      const sel = statusFilter === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setStatusFilter(p.id)}
                          style={{
                            fontSize: "11px", padding: "6px 13px", borderRadius: "20px",
                            border: `1px solid ${sel ? (p.color || C.navy) : C.border}`,
                            background: sel ? (p.faint || C.navyFaint) : C.surface,
                            color: sel ? (p.color || C.navy) : C.muted,
                            cursor: "pointer", letterSpacing: "0.02em",
                            fontWeight: sel ? "600" : "400",
                            transition: "all 0.15s",
                          }}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>

                  {sections.map(s => (
                    s.items.length === 0 ? null : (
                      <div key={s.key} style={{ marginBottom: "28px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                          <span style={{ fontSize: "10px", padding: "3px 11px", borderRadius: "20px", background: s.faint, color: s.color, fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                            {s.title}
                          </span>
                          <div style={{ flex: 1, height: "1px", background: C.borderSoft }} />
                          <span style={{ fontSize: "11px", color: C.muted, fontWeight: "500" }}>{s.items.length}</span>
                        </div>
                        {s.items.map(renderTask)}
                      </div>
                    )
                  ))}

                  {visible.length === 0 && (
                    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "56px 32px", textAlign: "center", boxShadow: C.shadow }}>
                      <div style={{ fontFamily: C.serif, fontSize: "22px", color: C.navy, marginBottom: "8px", fontWeight: "500" }}>Tout est traité.</div>
                      <div style={{ fontSize: "13px", color: C.muted }}>Aucune mission ouverte sur ce filtre. Profite.</div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── RITUELS ── */}
            {view === "rituels" && (
              <div>
                {/* Header card */}
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "16px 20px", marginBottom: "18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: C.serif, fontSize: "15px", fontWeight: "700", color: C.navy }}>Anissa Lalahoum</div>
                    <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>5 rituels · réinitialisation à minuit</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: C.serif, fontSize: "30px", fontWeight: "700", color: "#9B5FC0", lineHeight: 1 }}>
                      {ritualsDone.length}<span style={{ fontSize: "16px", color: C.muted }}>/{RITUALS.length}</span>
                    </div>
                    <div style={{ fontSize: "9px", color: C.muted, marginTop: "2px" }}>complétés</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: "2px", background: C.borderSoft, borderRadius: "2px", marginBottom: "18px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(ritualsDone.length / RITUALS.length) * 100}%`, background: "#9B5FC0", borderRadius: "2px", transition: "width 0.4s ease" }} />
                </div>

                {RITUALS.map(r => {
                  const done = ritualsDone.includes(r.id);
                  const isEx = ritualExpanded === r.id;
                  return (
                    <div
                      key={r.id}
                      style={{
                        background: done ? "#FAFDF9" : C.surface,
                        border: `1px solid ${done ? "#BBF7D0" : C.border}`,
                        borderRadius: "8px", marginBottom: "6px",
                        overflow: "hidden",
                        borderLeft: `3px solid ${done ? C.green : "#9B5FC0"}`,
                      }}
                    >
                      <div
                        onClick={() => setRitualExpanded(isEx ? null : r.id)}
                        style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
                      >
                        <div
                          onClick={e => {
                            e.stopPropagation();
                            setRitualsDone(prev => {
                              const updated = done ? prev.filter(x => x !== r.id) : [...prev, r.id];
                              saveRitualsDone(updated);
                              return updated;
                            });
                          }}
                          style={{
                            width: "19px", height: "19px", borderRadius: "50%", flexShrink: 0,
                            border: `1.5px solid ${done ? C.green : "#9B5FC0"}`,
                            background: done ? C.greenFaint : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                          }}
                        >
                          {done && <span style={{ fontSize: "11px", color: C.green }}>✓</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "13px", fontWeight: "600", color: done ? C.muted : C.navy, textDecoration: done ? "line-through" : "none" }}>
                            {r.title}
                          </div>
                          <div style={{ fontSize: "10px", color: C.muted, marginTop: "2px" }}>{r.desc}</div>
                        </div>
                        <span style={{ fontSize: "9px", color: C.muted, display: "inline-block", transform: isEx ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
                      </div>
                      {isEx && (
                        <div style={{ borderTop: `1px solid ${C.borderSoft}`, padding: "12px 16px", background: "#FDFCFB" }}>
                          {r.steps.map((step, i) => (
                            <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "7px" }}>
                              <span style={{ fontSize: "10px", color: "#9B5FC0", fontWeight: "700", flexShrink: 0, lineHeight: "1.6" }}>
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <span style={{ fontSize: "12px", color: C.navy, lineHeight: "1.6" }}>{step}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── CALENDRIER (mensuel, drag & drop) ── */}
            {view === "calendrier" && (() => {
              const [yy, mm] = calendarMonth.split("-").map(Number);
              const firstDay = new Date(yy, mm - 1, 1);
              const lastDay = new Date(yy, mm, 0);
              const daysInMonth = lastDay.getDate();
              const startWeekday = (firstDay.getDay() + 6) % 7;
              const cells = [];
              for (let i = 0; i < startWeekday; i++) cells.push(null);
              for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(yy, mm - 1, d));
              while (cells.length % 7 !== 0) cells.push(null);

              function shiftCalMonth(delta) {
                const d = new Date(yy, mm - 1 + delta, 1);
                setCalendarMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
              }

              function onDragStart(e, taskId) {
                e.dataTransfer.setData("text/plain", taskId);
                e.dataTransfer.effectAllowed = "move";
                // Defer state update so the browser's drag image is captured BEFORE
                // re-render dims the source chip — fixes "ghost is faded" jank.
                requestAnimationFrame(() => setDraggingId(taskId));
              }
              function onDragEnd() {
                setDraggingId(null);
                setDragOverDate(null);
              }
              function onDragOverCell(e, dateStr) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverDate !== dateStr) setDragOverDate(dateStr);
              }
              function onDropCell(e, dateStr) {
                e.preventDefault();
                const taskId = e.dataTransfer.getData("text/plain");
                if (taskId) updateDue(taskId, dateStr);
                setDraggingId(null);
                setDragOverDate(null);
              }
              function quickAddOnDate(dateStr) {
                setNewDue(dateStr);
                setShowModal(true);
              }
              function jumpToToday() {
                setCalendarMonth(ymKey(todayISO()));
              }

              const calendarTasks = tasks.filter(t =>
                t.status !== "done" && (filter === "all" || t.client === filter)
              );
              const undated = calendarTasks.filter(t => !t.due);
              const todayKey = ymKey(todayISO());

              return (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", gap: "12px" }}>
                    <button onClick={() => shiftCalMonth(-1)} className="hover-card" style={{ fontSize: "12px", padding: "8px 16px", borderRadius: "8px", border: `1px solid ${C.border}`, background: C.surface, color: C.navy, cursor: "pointer", fontWeight: "500" }}>← Mois précédent</button>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ fontFamily: C.serif, fontSize: "22px", fontWeight: "600", color: C.navy, textTransform: "capitalize", letterSpacing: "-0.01em" }}>{fmtMonth(calendarMonth)}</div>
                      <button
                        onClick={jumpToToday}
                        disabled={calendarMonth === todayKey}
                        style={{
                          fontSize: "10px", padding: "5px 12px", borderRadius: "20px",
                          border: `1px solid ${calendarMonth === todayKey ? C.borderSoft : C.navy}`,
                          background: calendarMonth === todayKey ? "transparent" : C.navyFaint,
                          color: calendarMonth === todayKey ? C.muted : C.navy,
                          cursor: calendarMonth === todayKey ? "default" : "pointer",
                          fontWeight: "600", letterSpacing: "0.04em",
                          transition: "all 0.15s",
                        }}
                      >
                        Aujourd'hui
                      </button>
                    </div>
                    <button onClick={() => shiftCalMonth(1)} className="hover-card" style={{ fontSize: "12px", padding: "8px 16px", borderRadius: "8px", border: `1px solid ${C.border}`, background: C.surface, color: C.navy, cursor: "pointer", fontWeight: "500" }}>Mois suivant →</button>
                  </div>

                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "16px", boxShadow: C.shadow }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", marginBottom: "10px" }}>
                      {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d, i) => (
                        <div key={d} style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: i >= 5 ? C.muted : C.navy, fontWeight: "600", textAlign: "center", padding: "6px 0" }}>{d}</div>
                      ))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
                      {cells.map((cell, i) => {
                        const colIdx = i % 7;
                        const isWeekend = colIdx >= 5;
                        if (!cell) return <div key={i} className="cal-cell empty" style={{ minHeight: "108px", background: "transparent" }} />;
                        const cellStr = toLocalISO(cell);
                        const dayTasks = calendarTasks.filter(t => t.due === cellStr);
                        const isToday = cellStr === todayISO();
                        const isPast = cellStr < todayISO();
                        const isOver = dragOverDate === cellStr;
                        const overflow = dayTasks.length > 4 ? dayTasks.length - 4 : 0;
                        const visibleTasks = overflow > 0 ? dayTasks.slice(0, 4) : dayTasks;
                        return (
                          <div
                            key={i}
                            className="cal-cell"
                            onDragOver={(e) => onDragOverCell(e, cellStr)}
                            onDrop={(e) => onDropCell(e, cellStr)}
                            style={{
                              background: isOver ? C.blueFaint : isToday ? C.navyFaint : isWeekend ? C.bg : C.surface,
                              border: `1px solid ${isOver ? C.blue : isToday ? C.navy + "44" : C.borderSoft}`,
                              borderRadius: "8px", padding: "6px 7px", minHeight: "108px",
                              display: "flex", flexDirection: "column", gap: "3px",
                              position: "relative",
                              opacity: isPast && !isToday ? 0.7 : 1,
                              minWidth: 0, overflow: "hidden",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <span style={{ fontSize: "12px", fontWeight: isToday ? "700" : "500", color: isToday ? C.blue : isWeekend ? C.muted : C.navy }}>{cell.getDate()}</span>
                                {isToday && <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: C.blue }} />}
                              </div>
                              <button
                                onClick={() => quickAddOnDate(cellStr)}
                                title="Ajouter une tâche ce jour"
                                style={{
                                  opacity: 0, fontSize: "11px", lineHeight: 1,
                                  width: "16px", height: "16px", borderRadius: "4px",
                                  border: "none", background: C.borderSoft, color: C.muted,
                                  cursor: "pointer", padding: 0,
                                  transition: "opacity 0.12s, background 0.12s, color 0.12s",
                                }}
                                className="cell-add-btn"
                              >+</button>
                            </div>
                            {visibleTasks.map(t => (
                              <TaskChip
                                key={t.id}
                                task={t}
                                isDragging={draggingId === t.id}
                                onDragStart={onDragStart}
                                onDragEnd={onDragEnd}
                              />
                            ))}
                            {overflow > 0 && (
                              <div style={{ fontSize: "9px", color: C.muted, fontWeight: "500", paddingLeft: "4px", marginTop: "2px" }}>+ {overflow} de plus</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sans date — drop zone to remove the due date */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const taskId = e.dataTransfer.getData("text/plain");
                      if (taskId) updateDue(taskId, null);
                      setDraggingId(null);
                      setDragOverDate(null);
                    }}
                    style={{
                      marginTop: "20px", background: C.surface,
                      border: `1px dashed ${C.border}`, borderRadius: "12px",
                      padding: "16px 18px",
                    }}
                  >
                    <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted, marginBottom: "12px", fontWeight: "500" }}>
                      Sans date — {undated.length} tâche{undated.length !== 1 ? "s" : ""} <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: "400", marginLeft: "6px", color: C.muted, fontSize: "10px" }}>(glisse vers un jour, ou dépose ici pour retirer la date)</span>
                    </div>
                    {undated.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {undated.map(t => (
                          <TaskChip
                            key={t.id}
                            task={t}
                            isDragging={draggingId === t.id}
                            onDragStart={onDragStart}
                            onDragEnd={onDragEnd}
                          />
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: "11px", color: C.muted, fontStyle: "italic" }}>Aucune tâche sans date.</div>
                    )}
                  </div>

                  <div style={{ marginTop: "12px", fontSize: "11px", color: C.muted, textAlign: "center" }}>
                    {calendarTasks.length - undated.length} tâche{calendarTasks.length - undated.length !== 1 ? "s" : ""} planifiée{calendarTasks.length - undated.length !== 1 ? "s" : ""}
                    {filter !== "all" && ` · filtre client : ${clientById[filter]?.name}`}
                  </div>
                </div>
              );
            })()}

            {/* ── HISTORIQUE (calendrier mensuel) ── */}
            {view === "historique" && (() => {
              const [yy, mm] = historyMonth.split("-").map(Number);
              const firstDay = new Date(yy, mm - 1, 1);
              const lastDay = new Date(yy, mm, 0);
              const daysInMonth = lastDay.getDate();
              // Monday=0, Sunday=6 (FR convention)
              const startWeekday = (firstDay.getDay() + 6) % 7;
              const cells = [];
              for (let i = 0; i < startWeekday; i++) cells.push(null);
              for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(yy, mm - 1, d));
              while (cells.length % 7 !== 0) cells.push(null);

              function shiftMonth(delta) {
                const d = new Date(yy, mm - 1 + delta, 1);
                setHistoryMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
              }

              const monthTasks = doneTasks.filter(t => ymKey(t.doneAt) === historyMonth);

              return (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                    <button onClick={() => shiftMonth(-1)} className="hover-card" style={{ fontSize: "12px", padding: "8px 16px", borderRadius: "8px", border: `1px solid ${C.border}`, background: C.surface, color: C.navy, cursor: "pointer", fontWeight: "500" }}>← Mois précédent</button>
                    <div style={{ fontFamily: C.serif, fontSize: "22px", fontWeight: "600", color: C.navy, textTransform: "capitalize", letterSpacing: "-0.01em" }}>{fmtMonth(historyMonth)}</div>
                    <button onClick={() => shiftMonth(1)} className="hover-card" style={{ fontSize: "12px", padding: "8px 16px", borderRadius: "8px", border: `1px solid ${C.border}`, background: C.surface, color: C.navy, cursor: "pointer", fontWeight: "500" }}>Mois suivant →</button>
                  </div>

                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "16px", boxShadow: C.shadow }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", marginBottom: "10px" }}>
                      {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d, i) => (
                        <div key={d} style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: i >= 5 ? C.muted : C.navy, fontWeight: "600", textAlign: "center", padding: "6px 0" }}>{d}</div>
                      ))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
                      {cells.map((cell, i) => {
                        const colIdx = i % 7;
                        const isWeekend = colIdx >= 5;
                        if (!cell) return <div key={i} style={{ minHeight: "92px", background: "transparent" }} />;
                        const cellStr = toLocalISO(cell);
                        const dayTasks = doneTasks.filter(t => t.doneAt === cellStr && (filter === "all" || t.client === filter));
                        const isToday = cellStr === todayISO();
                        return (
                          <div key={i} style={{
                            background: isToday ? C.navyFaint : isWeekend ? C.bg : C.surface,
                            border: `1px solid ${isToday ? C.navy + "44" : C.borderSoft}`,
                            borderRadius: "8px", padding: "6px 7px", minHeight: "92px",
                            display: "flex", flexDirection: "column", gap: "3px",
                            minWidth: 0, overflow: "hidden",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "3px" }}>
                              <span style={{ fontSize: "12px", fontWeight: isToday ? "700" : "500", color: isToday ? C.blue : isWeekend ? C.muted : C.navy }}>{cell.getDate()}</span>
                              {isToday && <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: C.blue }} />}
                            </div>
                            {dayTasks.map(t => {
                              const cl = clientById[t.client];
                              return (
                                <div key={t.id} title={t.title} style={{
                                  fontSize: "9px", padding: "3px 6px", borderRadius: "3px",
                                  background: C.greenFaint + "60", borderLeft: `2px solid ${cl.color}`,
                                  color: C.navy, lineHeight: "1.3",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>
                                  ✓ {t.title}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ marginTop: "14px", fontSize: "11px", color: C.muted, textAlign: "center" }}>
                    {monthTasks.length} tâche{monthTasks.length !== 1 ? "s" : ""} livrée{monthTasks.length !== 1 ? "s" : ""} ce mois-ci
                    {filter !== "all" && ` · filtre client : ${clientById[filter]?.name}`}
                  </div>
                </div>
              );
            })()}
          </main>
        </div>
      </div>

      {/* ── QUICK ADD MODAL ──────────────────────────────────────── */}
      {showModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(26,26,46,0.38)", backdropFilter: "blur(5px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 200, padding: "20px",
          }}
        >
          <div style={{
            background: C.surface, borderRadius: "14px",
            border: `1px solid ${C.border}`,
            width: "100%", maxWidth: "540px",
            boxShadow: "0 24px 64px rgba(26,26,46,0.18)",
            overflow: "hidden",
          }}>
            {/* Modal header */}
            <div style={{ padding: "18px 22px 16px", borderBottom: `1px solid ${C.borderSoft}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontFamily: C.serif, fontSize: "17px", fontWeight: "700", color: C.navy }}>Nouvelle mission</div>
                <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>Renseigne les infos puis sauvegarde.</div>
              </div>
              <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "15px", color: C.muted, padding: "2px" }}>✕</button>
            </div>

            <div style={{ padding: "20px 22px" }}>
              {/* Templates */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, display: "block", marginBottom: "7px" }}>
                  Templates
                </label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {TASK_TEMPLATES.map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => {
                        setNewTitle(tpl.title);
                        setNewDescription(tpl.description);
                        setNewProject(tpl.project);
                        setAddClient(tpl.client);
                        setNewSteps(tpl.steps || []);
                      }}
                      style={{
                        fontSize: "10px", padding: "5px 11px", borderRadius: "20px",
                        border: `1px solid ${C.border}`, background: "transparent",
                        color: C.muted, cursor: "pointer", letterSpacing: "0.04em",
                      }}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, display: "block", marginBottom: "7px" }}>
                  Titre *
                </label>
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="ex: Newsletter mensuelle Vitamine S"
                  style={{
                    width: "100%", padding: "10px 14px",
                    border: `1px solid ${C.border}`, borderRadius: "8px",
                    fontSize: "13px", color: C.navy, background: C.bg,
                    outline: "none", fontFamily: C.sans,
                  }}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, display: "block", marginBottom: "7px" }}>
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="1 à 2 phrases sur l'objectif et le livrable"
                  rows={2}
                  style={{
                    width: "100%", padding: "10px 14px",
                    border: `1px solid ${C.border}`, borderRadius: "8px",
                    fontSize: "13px", color: C.navy, background: C.bg,
                    outline: "none", fontFamily: C.sans, resize: "vertical",
                  }}
                />
              </div>

              {/* Project + Date row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, display: "block", marginBottom: "7px" }}>
                    Projet
                  </label>
                  <input
                    value={newProject}
                    onChange={e => setNewProject(e.target.value)}
                    placeholder="ex: Workflows"
                    style={{
                      width: "100%", padding: "10px 14px",
                      border: `1px solid ${C.border}`, borderRadius: "8px",
                      fontSize: "13px", color: C.navy, background: C.bg,
                      outline: "none", fontFamily: C.sans,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, display: "block", marginBottom: "7px" }}>
                    Date prévue
                  </label>
                  <input
                    type="date"
                    value={newDue}
                    onChange={e => setNewDue(e.target.value)}
                    style={{
                      width: "100%", padding: "9px 14px",
                      border: `1px solid ${C.border}`, borderRadius: "8px",
                      fontSize: "13px", color: C.navy, background: C.bg,
                      outline: "none", fontFamily: C.sans,
                    }}
                  />
                </div>
              </div>

              {/* Priority */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, display: "block", marginBottom: "7px" }}>
                  Priorité
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => setNewPriority(null)}
                    style={{
                      padding: "7px 16px", borderRadius: "7px",
                      border: `1px solid ${newPriority === null ? C.navy : C.border}`,
                      background: newPriority === null ? C.navyFaint : "transparent",
                      color: newPriority === null ? C.navy : C.muted,
                      fontSize: "12px", fontWeight: "600", cursor: "pointer",
                    }}
                  >
                    Normale
                  </button>
                  <button
                    onClick={() => setNewPriority("urgent")}
                    style={{
                      padding: "7px 16px", borderRadius: "7px",
                      border: `1px solid ${newPriority === "urgent" ? C.red : C.border}`,
                      background: newPriority === "urgent" ? C.redFaint : "transparent",
                      color: newPriority === "urgent" ? C.red : C.muted,
                      fontSize: "12px", fontWeight: "600", cursor: "pointer",
                    }}
                  >
                    Urgent
                  </button>
                </div>
              </div>

              {/* Save button */}
              <button
                className="hover-lift"
                onClick={saveTask}
                disabled={!newTitle.trim()}
                style={{
                  width: "100%", padding: "11px",
                  background: !newTitle.trim() ? "#E8E6E0" : C.navy,
                  color: !newTitle.trim() ? C.muted : "#fff",
                  border: "none", borderRadius: "8px",
                  fontSize: "13px", fontWeight: "600", letterSpacing: "0.04em",
                  cursor: !newTitle.trim() ? "default" : "pointer",
                }}
              >
                Créer la mission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SEARCH MODAL (Cmd+K) ─────────────────────────────────── */}
      {searchOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setSearchOpen(false); }}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(26,26,46,0.38)", backdropFilter: "blur(5px)",
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            zIndex: 250, padding: "80px 20px 20px",
          }}
        >
          <div style={{
            background: C.surface, borderRadius: "12px",
            border: `1px solid ${C.border}`,
            width: "100%", maxWidth: "560px",
            boxShadow: "0 24px 64px rgba(26,26,46,0.18)",
            overflow: "hidden",
          }}>
            <div style={{ borderBottom: `1px solid ${C.borderSoft}`, padding: "14px 18px" }}>
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une tâche, client, projet, note…"
                style={{
                  width: "100%", fontSize: "14px", padding: "6px 0",
                  border: "none", outline: "none", background: "transparent",
                  color: C.navy, fontFamily: C.sans,
                }}
              />
            </div>
            <div style={{ maxHeight: "60vh", overflow: "auto", padding: "8px 0" }}>
              {!searchQuery.trim() ? (
                <div style={{ padding: "24px", textAlign: "center", fontSize: "12px", color: C.muted }}>
                  Tape pour chercher · ⌘K depuis n'importe où · Esc pour fermer
                </div>
              ) : searchResults.length === 0 ? (
                <div style={{ padding: "24px", textAlign: "center", fontSize: "12px", color: C.muted }}>
                  Aucun résultat pour « {searchQuery} »
                </div>
              ) : searchResults.map(t => {
                const cl = clientById[t.client];
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery("");
                      setView("aujourd-hui");
                      setExpanded(t.id);
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "9px 18px", cursor: "pointer",
                      borderLeft: `3px solid ${cl.color}`,
                    }}
                    className="hover-bg"
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "12px", fontWeight: "600", color: C.navy, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {t.title}
                      </div>
                      <div style={{ fontSize: "10px", color: C.muted, marginTop: "2px" }}>
                        {cl.name} · {t.project}
                        {t.due && <span style={{ marginLeft: "6px" }}>· {fmtDate(t.due)}</span>}
                      </div>
                    </div>
                    <StatusBadge status={t.status} small />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── UNDO TOAST ─────────────────────────────────────────── */}
      {undo && (
        <div style={{
          position: "fixed", bottom: "24px", left: "50%",
          transform: "translateX(-50%)", zIndex: 300,
          background: C.navy, color: "#fff",
          padding: "10px 14px 10px 18px", borderRadius: "8px",
          display: "flex", alignItems: "center", gap: "14px",
          boxShadow: "0 12px 32px rgba(26,26,46,0.32)",
          fontSize: "12px", maxWidth: "90vw",
        }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{undo.label}</span>
          <button
            onClick={applyUndo}
            style={{
              fontSize: "11px", padding: "5px 12px", borderRadius: "5px",
              border: "none", background: "#fff", color: C.navy,
              cursor: "pointer", fontWeight: "600", letterSpacing: "0.04em",
            }}
          >
            Annuler
          </button>
          <button
            onClick={() => setUndo(null)}
            style={{
              fontSize: "13px", background: "none", border: "none",
              color: "#fff", opacity: 0.6, cursor: "pointer",
              padding: "0 4px", lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
