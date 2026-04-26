import { useState } from "react";
import { CLIENTS, clientById } from "./data/clients";
import { INITIAL_TASKS } from "./data/tasks";
import { RITUALS } from "./data/rituals";
import { saveTasks, loadTasks, saveRitualsDone, loadRitualsDone } from "./lib/storage";

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
  serif: "'Playfair Display', Georgia, serif",
  sans: "'DM Sans', sans-serif",
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
  return new Date(s) < TODAY;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addOneMonth(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
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

function TaskCard({ task, expanded, onToggle, onStatusChange, onToggleRecurring, onChangeDue, onChangeTitle }) {
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
        style={{ padding: "11px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
            {task.priority === "urgent" && (
              <span style={{ fontSize: "8px", padding: "1px 6px", borderRadius: "3px", background: C.redFaint, color: C.red, fontWeight: "700", letterSpacing: "0.08em" }}>
                URGENT
              </span>
            )}
            {isRecurring && (
              <span title="Tâche mensuelle récurrente" style={{ fontSize: "8px", padding: "1px 6px", borderRadius: "3px", background: C.violetFaint, color: C.violet, fontWeight: "700", letterSpacing: "0.08em" }}>
                ↻ MENSUEL
              </span>
            )}
            <span style={{ fontSize: "13px", fontWeight: "600", color: C.navy, letterSpacing: "-0.01em" }}>
              {task.title}
            </span>
          </div>
          <div style={{ fontSize: "10px", color: C.muted, marginTop: "3px" }}>
            {cl.name} &middot; {task.project}
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
          <div style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, marginBottom: "9px" }}>Étapes</div>
          {task.steps.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "7px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "10px", color: cl.color, fontWeight: "700", flexShrink: 0, lineHeight: "1.6" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ fontSize: "12px", color: C.navy, lineHeight: "1.6" }}>{step}</span>
            </div>
          ))}
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
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("missions");
  const [filter, setFilter] = useState("all");
  const [tasks, setTasks] = useState(() => loadTasks(INITIAL_TASKS));
  const [expanded, setExpanded] = useState(null);
  const [ritualsDone, setRitualsDone] = useState(() => loadRitualsDone());
  const [ritualExpanded, setRitualExpanded] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [historyMonth, setHistoryMonth] = useState(ymKey(todayISO()));

  // Quick-add state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newProject, setNewProject] = useState("");
  const [newPriority, setNewPriority] = useState(null);
  const [addClient, setAddClient] = useState("vitamine-s");

  // Filtered tasks
  const activeTasks = tasks.filter(t =>
    t.status !== "done" && (filter === "all" || t.client === filter)
  );
  const doneTasks = tasks.filter(t =>
    t.status === "done" && (filter === "all" || t.client === filter)
  );
  const taskCount = { active: tasks.filter(t => t.status === "active").length, done: tasks.filter(t => t.status === "done").length };

  // Timeline — next 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(TODAY);
    d.setDate(TODAY.getDate() + i);
    return d;
  });

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

  function closeModal() {
    setShowModal(false);
    setNewTitle("");
    setNewDescription("");
    setNewDue("");
    setNewProject("");
    setNewPriority(null);
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
      steps: [],
    };
    setTasks(prev => {
      const updated = [newTask, ...prev];
      saveTasks(updated);
      return updated;
    });
    closeModal();
  }

  const navBtn = (id, label, icon) => (
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
      {label}
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
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; font-family: ${C.sans}; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
        .hover-bg:hover { background: ${C.bg} !important; }
        .hover-lift:hover { transform: translateY(-1px); opacity: 0.9; }
        .hover-lift { transition: transform 0.15s ease, opacity 0.15s ease; }
        input:focus { outline: 2px solid ${C.navy}40 !important; }
      `}</style>

      <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: C.sans, background: C.bg }}>

        {/* ── SIDEBAR ─────────────────────────────────────────────── */}
        <aside style={{ width: "210px", flexShrink: 0, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column" }}>
          {/* Brand */}
          <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${C.borderSoft}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: C.navy }} />
              <span style={{ fontFamily: C.serif, fontSize: "15px", fontWeight: "700", color: C.navy }}>Mira Systems</span>
            </div>
            <div style={{ fontSize: "9px", letterSpacing: "0.14em", color: C.muted, marginTop: "2px", paddingLeft: "14px" }}>
              GESTION CLIENT
            </div>
          </div>

          {/* Nav */}
          <div style={{ padding: "12px 8px 4px" }}>
            <div style={{ fontSize: "8px", letterSpacing: "0.14em", color: C.muted, padding: "0 6px", marginBottom: "5px", textTransform: "uppercase" }}>Vue</div>
            {navBtn("missions",   "Missions",          "◈")}
            {navBtn("rituels",    "Rituels — Anissa",  "↺")}
            {navBtn("timeline",   "Timeline 7 jours",  "▦")}
            {navBtn("historique", "Historique",        "❒")}
            {navBtn("archive",    "Archive",           "▣")}
          </div>

          <div style={{ padding: "10px 8px 4px" }}>
            <div style={{ fontSize: "8px", letterSpacing: "0.14em", color: C.muted, padding: "0 6px", marginBottom: "5px", textTransform: "uppercase" }}>Clients</div>
            {filterBtn("all", "Tous", <span style={{ fontSize: "8px", color: C.muted }}>●</span>)}
            {CLIENTS.map(cl => filterBtn(cl.id, cl.name,
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: cl.color, display: "inline-block", flexShrink: 0 }} />
            ))}
          </div>

          {/* Stats */}
          <div style={{ marginTop: "auto", borderTop: `1px solid ${C.borderSoft}`, padding: "14px 12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px" }}>
              {[
                { label: "Actives",  val: taskCount.active, color: C.blue },
                { label: "Livrées",  val: taskCount.done,   color: C.green },
                { label: "Clients",  val: CLIENTS.length,   color: C.navy },
                { label: "Rituels",  val: RITUALS.length,   color: "#9B5FC0" },
              ].map(s => (
                <div key={s.label} style={{ background: C.bg, borderRadius: "7px", padding: "9px 10px" }}>
                  <div style={{ fontFamily: C.serif, fontSize: "20px", fontWeight: "700", color: s.color, lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: "9px", color: C.muted, marginTop: "3px" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── MAIN ────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Header */}
          <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "14px 24px", display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontFamily: C.serif, fontSize: "19px", fontWeight: "700", color: C.navy, lineHeight: 1.2 }}>
                {{
                  missions: "Missions",
                  rituels: "Rituels quotidiens — Anissa",
                  timeline: "Timeline — 7 prochains jours",
                  historique: "Historique des tâches livrées",
                  archive: "Archive",
                }[view]}
              </h1>
              <p style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>
                {view === "missions"
                  ? `${activeTasks.length} mission${activeTasks.length !== 1 ? "s" : ""} en cours`
                  : view === "rituels"
                  ? `${ritualsDone.length} / ${RITUALS.length} complétés aujourd'hui`
                  : view === "timeline"
                  ? "Les 7 prochains jours"
                  : view === "historique"
                  ? `${doneTasks.length} tâche${doneTasks.length !== 1 ? "s" : ""} livrée${doneTasks.length !== 1 ? "s" : ""} au total`
                  : `${doneTasks.length} tâche${doneTasks.length !== 1 ? "s" : ""} archivée${doneTasks.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            {view === "missions" && (
              <button
                className="hover-lift"
                onClick={() => setShowModal(true)}
                style={{
                  display: "flex", alignItems: "center", gap: "7px",
                  padding: "9px 18px", borderRadius: "8px",
                  background: C.navy, color: "#fff",
                  border: "none", cursor: "pointer",
                  fontSize: "12px", fontWeight: "600", letterSpacing: "0.04em",
                }}
              >
                <span style={{ fontSize: "15px", lineHeight: 1 }}>+</span>
                Ajouter via IA
              </button>
            )}
          </header>

          {/* Scroll area */}
          <main style={{ flex: 1, overflow: "auto", padding: "22px 24px" }}>

            {/* ── MISSIONS ── */}
            {view === "missions" && (
              <div>
                {(["active", "review", "upcoming"] ).map(st => {
                  const group = activeTasks.filter(t => t.status === st);
                  if (!group.length) return null;
                  const s = STATUS[st];
                  return (
                    <div key={st} style={{ marginBottom: "26px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "11px" }}>
                        <StatusBadge status={st} />
                        <div style={{ flex: 1, height: "1px", background: C.borderSoft }} />
                        <span style={{ fontSize: "10px", color: C.muted }}>{group.length}</span>
                      </div>
                      {group.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          expanded={expanded === task.id}
                          onToggle={() => setExpanded(expanded === task.id ? null : task.id)}
                          onStatusChange={(s) => updateStatus(task.id, s)}
                          onToggleRecurring={() => updateRecurring(task.id)}
                          onChangeDue={(d) => updateDue(task.id, d)}
                          onChangeTitle={(t) => updateTitle(task.id, t)}
                        />
                      ))}
                    </div>
                  );
                })}

                {doneTasks.length > 0 && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "11px" }}>
                      <StatusBadge status="done" />
                      <div style={{ flex: 1, height: "1px", background: C.borderSoft }} />
                      <span style={{ fontSize: "10px", color: C.muted }}>{doneTasks.length}</span>
                    </div>
                    {doneTasks.map(task => {
                      const cl = clientById[task.client];
                      return (
                        <div
                          key={task.id}
                          className="hover-bg"
                          style={{
                            background: C.surface, opacity: 0.55,
                            border: `1px solid ${C.border}`, borderRadius: "8px",
                            borderLeft: `3px solid ${cl.color}`,
                            padding: "10px 16px", marginBottom: "5px",
                            display: "flex", alignItems: "center",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: "12px", color: C.muted, textDecoration: "line-through" }}>{task.title}</span>
                            <div style={{ fontSize: "10px", color: C.muted, marginTop: "2px" }}>{cl.name} · {fmtDate(task.due)}</div>
                          </div>
                          <button
                            onClick={() => updateStatus(task.id, "active")}
                            style={{ fontSize: "9px", color: C.muted, background: "none", border: `1px solid ${C.border}`, borderRadius: "4px", padding: "2px 7px", cursor: "pointer" }}
                          >
                            Rouvrir
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

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

            {/* ── TIMELINE ── */}
            {view === "timeline" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "10px", marginBottom: "18px" }}>
                  {days.map(day => {
                    const isToday = day.toDateString() === TODAY.toDateString();
                    const dayTasks = tasks.filter(t => t.due && new Date(t.due).toDateString() === day.toDateString());
                    return (
                      <div
                        key={day.toISOString()}
                        style={{
                          background: isToday ? C.navyFaint : C.surface,
                          border: `1px solid ${isToday ? C.navy + "28" : C.border}`,
                          borderRadius: "10px", padding: "12px 10px", minHeight: "180px",
                        }}
                      >
                        <div style={{ textAlign: "center", marginBottom: "12px" }}>
                          <div style={{ fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.12em", color: isToday ? C.blue : C.muted, fontWeight: "600" }}>
                            {day.toLocaleDateString("fr-FR", { weekday: "short" })}
                          </div>
                          <div style={{ fontFamily: C.serif, fontSize: "24px", fontWeight: "700", color: isToday ? C.blue : C.navy, lineHeight: 1.1 }}>
                            {day.getDate()}
                          </div>
                          <div style={{ fontSize: "9px", color: C.muted }}>{day.toLocaleDateString("fr-FR", { month: "short" })}</div>
                          {isToday && <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: C.blue, margin: "4px auto 0" }} />}
                        </div>
                        {dayTasks.length === 0
                          ? <div style={{ textAlign: "center", fontSize: "18px", color: C.borderSoft, marginTop: "10px" }}>·</div>
                          : dayTasks.map(task => {
                            const cl = clientById[task.client];
                            return (
                              <div key={task.id} style={{
                                background: C.surface, border: `1px solid ${C.border}`,
                                borderRadius: "6px", padding: "6px 8px", marginBottom: "5px",
                                borderLeft: `3px solid ${cl.color}`,
                              }}>
                                <div style={{ fontSize: "10px", fontWeight: "600", color: C.navy, lineHeight: "1.3", marginBottom: "3px" }}>{task.title}</div>
                                <div style={{ fontSize: "9px", color: C.muted }}>{cl.name}</div>
                                <div style={{ marginTop: "4px" }}><StatusBadge status={task.status} small /></div>
                              </div>
                            );
                          })
                        }
                      </div>
                    );
                  })}
                </div>

                {/* Tasks without date */}
                {tasks.filter(t => !t.due && t.status !== "done").length > 0 && (
                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "16px 18px" }}>
                    <div style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, marginBottom: "12px" }}>
                      Sans date assignée
                    </div>
                    {tasks.filter(t => !t.due && t.status !== "done").map(task => {
                      const cl = clientById[task.client];
                      return (
                        <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: `1px solid ${C.borderSoft}` }}>
                          <ClientDot id={task.client} />
                          <span style={{ fontSize: "12px", color: C.navy, flex: 1 }}>{task.title}</span>
                          <span style={{ fontSize: "10px", color: C.muted }}>{cl.name}</span>
                          <StatusBadge status={task.status} small />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── ARCHIVE ── */}
            {view === "archive" && (
              <div>
                {doneTasks.length === 0 ? (
                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "40px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: "13px", color: C.muted }}>Aucune tâche archivée pour le moment.</div>
                    <div style={{ fontSize: "11px", color: C.muted, marginTop: "6px" }}>Marque une tâche comme « Livré » pour la voir apparaître ici.</div>
                  </div>
                ) : (
                  (() => {
                    const sorted = [...doneTasks].sort((a, b) => {
                      const da = a.doneAt || a.due || "0";
                      const db = b.doneAt || b.due || "0";
                      return db.localeCompare(da);
                    });
                    const groups = {};
                    sorted.forEach(t => {
                      const key = ymKey(t.doneAt || t.due) || "sans-date";
                      (groups[key] = groups[key] || []).push(t);
                    });
                    const keys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
                    return keys.map(k => (
                      <div key={k} style={{ marginBottom: "26px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "11px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "600", color: C.navy, textTransform: "capitalize" }}>
                            {k === "sans-date" ? "Sans date" : fmtMonth(k)}
                          </span>
                          <div style={{ flex: 1, height: "1px", background: C.borderSoft }} />
                          <span style={{ fontSize: "10px", color: C.muted }}>{groups[k].length}</span>
                        </div>
                        {groups[k].map(task => {
                          const cl = clientById[task.client];
                          return (
                            <div key={task.id} className="hover-bg" style={{
                              background: C.surface, border: `1px solid ${C.border}`,
                              borderRadius: "8px", borderLeft: `3px solid ${cl.color}`,
                              padding: "10px 16px", marginBottom: "5px",
                              display: "flex", alignItems: "center", gap: "12px",
                            }}>
                              <span style={{ fontSize: "11px", color: C.green, fontWeight: "700" }}>✓</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: "12px", fontWeight: "600", color: C.navy }}>{task.title}</div>
                                <div style={{ fontSize: "10px", color: C.muted, marginTop: "2px" }}>
                                  {cl.name} · {task.project}
                                  {task.recurring === "monthly" && <span style={{ color: C.violet, marginLeft: "6px" }}>· ↻ mensuel</span>}
                                </div>
                              </div>
                              <span style={{ fontSize: "10px", color: C.muted, whiteSpace: "nowrap" }}>
                                {task.doneAt
                                  ? `Livré ${new Date(task.doneAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`
                                  : `Prévu ${fmtDate(task.due)}`}
                              </span>
                              <button
                                onClick={() => updateStatus(task.id, "active")}
                                style={{ fontSize: "9px", color: C.muted, background: "none", border: `1px solid ${C.border}`, borderRadius: "4px", padding: "3px 8px", cursor: "pointer" }}
                              >
                                Rouvrir
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ));
                  })()
                )}
              </div>
            )}

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
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                    <button onClick={() => shiftMonth(-1)} style={{ fontSize: "12px", padding: "6px 14px", borderRadius: "6px", border: `1px solid ${C.border}`, background: C.surface, color: C.navy, cursor: "pointer" }}>← Mois précédent</button>
                    <div style={{ fontFamily: C.serif, fontSize: "20px", fontWeight: "700", color: C.navy, textTransform: "capitalize" }}>{fmtMonth(historyMonth)}</div>
                    <button onClick={() => shiftMonth(1)} style={{ fontSize: "12px", padding: "6px 14px", borderRadius: "6px", border: `1px solid ${C.border}`, background: C.surface, color: C.navy, cursor: "pointer" }}>Mois suivant →</button>
                  </div>

                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "12px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", marginBottom: "8px" }}>
                      {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => (
                        <div key={d} style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, fontWeight: "600", textAlign: "center", padding: "4px 0" }}>{d}</div>
                      ))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
                      {cells.map((cell, i) => {
                        if (!cell) return <div key={i} style={{ minHeight: "90px" }} />;
                        const cellStr = `${cell.getFullYear()}-${String(cell.getMonth() + 1).padStart(2, "0")}-${String(cell.getDate()).padStart(2, "0")}`;
                        const dayTasks = doneTasks.filter(t => t.doneAt === cellStr && (filter === "all" || t.client === filter));
                        const isToday = cellStr === todayISO();
                        return (
                          <div key={i} style={{
                            background: isToday ? C.navyFaint : C.bg,
                            border: `1px solid ${isToday ? C.navy + "28" : C.borderSoft}`,
                            borderRadius: "8px", padding: "6px", minHeight: "90px",
                            display: "flex", flexDirection: "column", gap: "3px",
                          }}>
                            <div style={{ fontSize: "11px", fontWeight: "700", color: isToday ? C.blue : C.navy, marginBottom: "3px" }}>{cell.getDate()}</div>
                            {dayTasks.map(t => {
                              const cl = clientById[t.client];
                              return (
                                <div key={t.id} title={t.title} style={{
                                  fontSize: "9px", padding: "3px 5px", borderRadius: "3px",
                                  background: C.surface, borderLeft: `2px solid ${cl.color}`,
                                  color: C.navy, lineHeight: "1.3",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>
                                  {t.title}
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

              {/* Client selector */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted, display: "block", marginBottom: "7px" }}>
                  Client
                </label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {CLIENTS.map(cl => (
                    <button
                      key={cl.id}
                      onClick={() => setAddClient(cl.id)}
                      style={{
                        padding: "7px 16px", borderRadius: "7px",
                        border: `1px solid ${addClient === cl.id ? cl.color : C.border}`,
                        background: addClient === cl.id ? cl.color + "12" : "transparent",
                        color: addClient === cl.id ? cl.color : C.muted,
                        fontSize: "12px", fontWeight: "600", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: "7px",
                      }}
                    >
                      <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: cl.color, display: "inline-block" }} />
                      {cl.name}
                    </button>
                  ))}
                </div>
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
    </>
  );
}
