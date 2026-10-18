import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  Orbit,
  LayoutDashboard,
  Route,
  Network,
  Code2,
  Play,
  Bookmark,
  ArrowUpRight,
  ArrowRight,
  Search,
  Check,
  ChevronRight,
  X,
  BookOpen,
  Terminal,
  Download,
  Save,
  Layers,
  CircleHelp,
  Menu,
  CheckCircle2,
  Clock,
  Zap,
  Trophy,
  ExternalLink,
  Sun,
  Moon,
} from "lucide-react";
import initialCatalog from "./catalog.json";
import "./styles.css";
import { AuthGate, auth, authHeaders, logout } from "./auth";
const nav = [
  ["Overview", LayoutDashboard],
  ["Learning paths", Route],
  ["High-level design", Network],
  ["Low-level design", Layers],
  ["Java playground", Code2],
  ["Video library", Play],
  ["Bookmarks", Bookmark],
];
const empty = { completed: false, bookmarked: false, notes: "", code: "" };
function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function App({ user }) {
  const stateKey = `sv-state:${auth.app.options.projectId}:${user.uid}`;
  const pendingKey = `sv-pending:${auth.app.options.projectId}:${user.uid}`;
  const [theme, setTheme] = useState(() => {
    const saved = read("sv-theme", null);
    return saved === "light" || saved === "dark"
      ? saved
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      theme === "dark" ? "#11161f" : "#f7f8fb",
    );
    try {
      localStorage.setItem("sv-theme", JSON.stringify(theme));
    } catch {
      // The toggle still works when browser storage is unavailable.
    }
  }, [theme]);
  const [page, setPage] = useState("Overview"),
    [catalog, setCatalog] = useState(initialCatalog),
    [state, setState] = useState(() => read(stateKey, {})),
    [status, setStatus] = useState("Connecting"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All"),
    [selected, setSelected] = useState(null),
    [toast, setToast] = useState(""),
    [mobile, setMobile] = useState(false);
  const [ready, setReady] = useState(false);
  const pending = React.useRef(read(pendingKey, {}));
  const current = React.useRef(state);
  current.current = state;
  const writeQueue = React.useRef(Promise.resolve());
  const putState = async (id, value) => {
    const result = await fetch("/api/state/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...await authHeaders(user) },
      body: JSON.stringify(value),
      signal: AbortSignal.timeout(5000),
    });
    if (!result.ok) throw Error("Save failed");
  };
  const notify = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 3500);
  };
  useEffect(() => {
    let active = true;
    async function connect() {
      try {
        const [a, b] = await Promise.all([
          fetch("/api/catalog", { signal: AbortSignal.timeout(4000) }),
          fetch("/api/state", {
            headers: { ...await authHeaders(user) },
            signal: AbortSignal.timeout(4000),
          }),
        ]);
        if (!a.ok || !b.ok) throw Error();
        const [data, saved] = await Promise.all([a.json(), b.json()]);
        if (active) {
          setCatalog(data);
          const merged = {
            ...Object.fromEntries(saved.map((s) => [s.id, s])),
            ...pending.current,
          };
          setState(merged);
          current.current = merged;
          for (const [id, value] of Object.entries(pending.current)) {
            if (!active) return;
            await putState(id, value);
            delete pending.current[id];
            localStorage.setItem(pendingKey, JSON.stringify(pending.current));
          }
          if (active) setStatus("PostgreSQL connected");
        }
      } catch {
        if (active) setStatus("Local preview · saved in this browser");
      } finally {
        if (active) setReady(true);
      }
    }
    connect();
    return () => {
      active = false;
    };
  }, [user]);
  useEffect(() => {
    localStorage.setItem(stateKey, JSON.stringify(state));
  }, [state, stateKey]);
  const save = async (id, patch) => {
    const next = { ...empty, ...current.current[id], ...patch };
    current.current = { ...current.current, [id]: next };
    setState(current.current);
    pending.current[id] = next;
    localStorage.setItem(pendingKey, JSON.stringify(pending.current));
    if (status === "PostgreSQL connected") {
      writeQueue.current = writeQueue.current.then(async () => {
        try {
          await putState(id, next);
          if (pending.current[id] === next) {
            delete pending.current[id];
            localStorage.setItem(pendingKey, JSON.stringify(pending.current));
          }
        } catch {
          setStatus("Local preview · saved in this browser");
          notify("Server unavailable. Changes saved locally; reload to sync.");
        }
      });
      await writeQueue.current;
    }
  };
  const go = (p) => {
    setPage(p);
    setFilter("All");
    setQuery("");
    setMobile(false);
  };
  const completed = catalog.lessons.filter(
    (l) => state[l.id]?.completed,
  ).length;
  const solved = catalog.challenges.filter(
    (l) => state[l.id]?.completed,
  ).length;
  const next =
    catalog.lessons.find((l) => !state[l.id]?.completed) || catalog.lessons[0];
  const open = (item) => setSelected(item);
  const lessonCard = (l) => (
    <article className="lesson-card" key={l.id}>
      <button
        className={`lesson-art ${l.track.toLowerCase()}`}
        onClick={() => open(l)}
        aria-label={`Open ${l.title}`}
      >
        <div className="art-grid" />
        <span className="art-tag">
          {l.track} / {l.category}
        </span>
        <div className="diagram">
          <span>
            <Network size={27} />
          </span>
          <i />
          <span>
            {l.track === "HLD" ? <Layers size={27} /> : <Code2 size={27} />}
          </span>
          <i />
          <span>
            <Terminal size={27} />
          </span>
        </div>
        <span className="play-circle">
          <Play size={15} fill="currentColor" />
        </span>
      </button>
      <div className="lesson-body">
        <div className="eyebrow">
          <span className={l.track === "HLD" ? "blue" : "purple"}>
            {l.track === "HLD" ? "HIGH-LEVEL DESIGN" : "LOW-LEVEL DESIGN"}
          </span>
          <button
            className={`icon-button ${state[l.id]?.bookmarked ? "marked" : ""}`}
            aria-label={`Bookmark ${l.title}`}
            disabled={!ready}
            onClick={() => save(l.id, { bookmarked: !state[l.id]?.bookmarked })}
          >
            <Bookmark
              size={16}
              fill={state[l.id]?.bookmarked ? "currentColor" : "none"}
            />
          </button>
        </div>
        <button className="card-title" onClick={() => open(l)}>
          {l.title}
        </button>
        <p>{l.description}</p>
        <div className="card-bottom">
          <span>
            <Clock size={13} /> {l.minutes} min study
          </span>
          <span className="difficulty">
            {state[l.id]?.completed ? "✓ Completed" : l.level}
          </span>
        </div>
      </div>
    </article>
  );
  return (
    <div className="app">
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("Overview");
          }}
        >
          <span className="brand-icon">
            <Orbit size={27} />
          </span>
          System<span>Verse</span>
          <small>LEARN. DESIGN. BUILD.</small>
        </a>
        <div className="nav-label">YOUR WORKSPACE</div>
        <nav>
          {nav.map(([name, Icon], i) => (
            <button
              key={name}
              onClick={() => go(name)}
              className={page === name ? "active" : ""}
            >
              <Icon size={18} />
              {name}
              {i === 4 && <span className="java-badge">JAVA</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="growth">
            <span className="growth-icon">
              <Zap size={19} />
            </span>
            <strong>Small steps. Big systems.</strong>
            <p>A little practice every day goes a long way.</p>
            <button onClick={() => go("Learning paths")}>
              Explore your roadmap <ArrowUpRight size={14} />
            </button>
          </div>
          <button className="help" onClick={() => setSelected({ help: true })}>
            <CircleHelp size={17} /> How SystemVerse works{" "}
            <ArrowUpRight size={14} />
          </button>
          <div className="profile">
            <span>Y</span>
            <div>
              <strong>{user.displayName || user.email || user.phoneNumber || "Your workspace"}</strong>
              <button onClick={() => logout().catch(() => notify("Unable to sign out. Please try again."))}>Sign out</button>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header>
          <div className="breadcrumb">
            <button
              className="mobile-toggle icon-button"
              aria-label="Toggle navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={22} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{page}</strong>
          </div>
          <div className="header-right">
            <span className="header-motto">
              <span className="live-dot" /> A little better, every day
            </span>
            <span className="avatar">Y</span>
            <button
              className="theme-toggle"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          </div>
        </header>
        <main>
          <div className="page-top">
            <div>
              <div className="overline">YOUR NEXT CHAPTER STARTS HERE</div>
              <h1>
                {page === "Overview" ? "Build your systems thinking." : page}
              </h1>
              <p>
                {page === "Overview"
                  ? "From the big picture to the smallest class. Learn, practice, and connect the dots."
                  : page === "Java playground"
                    ? "Turn design decisions into working Java. Choose a challenge and make it your own."
                    : "Understand the ideas. Explore the tradeoffs. Put your knowledge into practice."}
              </p>
            </div>
            <span className="workspace-badge">
              <span /> PERSONAL LEARNING SPACE
            </span>
          </div>
          {page === "Overview" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <div className="hero-label">
                    <span /> BUILT FOR CURIOUS ENGINEERS
                  </div>
                  <h2>
                    Great systems start
                    <br />
                    with <em>great fundamentals.</em>
                  </h2>
                  <p>
                    Master high-level architecture. Write thoughtful Java.
                    <br />
                    One concept, one design, one breakthrough at a time.
                  </p>
                  <div className="hero-actions">
                    <button className="primary" onClick={() => open(next)}>
                      {completed ? "Continue learning" : "Start your journey"}
                      <ArrowRight size={16} />
                    </button>
                    <button
                      className="hero-secondary"
                      onClick={() => go("Learning paths")}
                    >
                      Explore learning paths <ArrowUpRight size={15} />
                    </button>
                  </div>
                  <div className="hero-features">
                    <span>
                      <CheckCircle2 size={13} /> Structured learning
                    </span>
                    <span>
                      <CheckCircle2 size={13} /> Hands-on Java
                    </span>
                    <span>
                      <CheckCircle2 size={13} /> At your own pace
                    </span>
                  </div>
                </div>
                <div className="system-visual" aria-hidden="true">
                  <div className="orbit-ring one" />
                  <div className="orbit-ring two" />
                  <div className="visual-chip client">
                    <span className="chip-icon">
                      <Terminal size={21} />
                    </span>
                    <span>
                      Client<small>WHERE IT BEGINS</small>
                    </span>
                  </div>
                  <div className="visual-chip gateway">
                    <span className="chip-icon">
                      <Network size={24} />
                    </span>
                    <span>
                      API Gateway<small>CONNECT THE DOTS</small>
                    </span>
                  </div>
                  <div className="visual-chip service">
                    <span className="chip-icon">
                      <Code2 size={22} />
                    </span>
                    <span>
                      Services<small>MAKE IT WORK</small>
                    </span>
                  </div>
                  <div className="visual-chip database">
                    <span className="chip-icon">
                      <Layers size={21} />
                    </span>
                    <span>
                      Database<small>BUILT TO LAST</small>
                    </span>
                  </div>
                  <svg viewBox="0 0 440 320">
                    <path d="M120 75 L230 135 L335 85 M230 135 L125 250 M230 135 L325 255" />
                    <circle cx="230" cy="135" r="5" />
                  </svg>
                  <span className="floating-label">
                    &lt; design. build. evolve. /&gt;
                  </span>
                </div>
              </section>
              <section className="stats">
                <Stat
                  icon={BookOpen}
                  number={`${completed} / ${catalog.lessons.length}`}
                  label="Lessons completed"
                  color="blue"
                />
                <Stat
                  icon={Code2}
                  number={`${solved} / ${catalog.challenges.length}`}
                  label="Java challenges solved"
                  color="purple"
                />
                <Stat
                  icon={Bookmark}
                  number={
                    Object.values(state).filter((s) => s.bookmarked).length
                  }
                  label="Saved for later"
                  color="orange"
                />
                <Stat
                  icon={Trophy}
                  number={`${Math.round((completed / catalog.lessons.length) * 100)}%`}
                  label="Learning path progress"
                  color="green"
                />
              </section>
              <section>
                <div className="section-heading">
                  <div>
                    <h2>Two paths. One stronger engineer.</h2>
                    <p>Zoom out to architect. Zoom in to implement.</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => go("Learning paths")}
                  >
                    View learning paths <ArrowRight size={15} />
                  </button>
                </div>
                <div className="path-grid">
                  <Path
                    track="HLD"
                    icon={Network}
                    title="High-level design"
                    subtitle="Think in systems."
                    description="Explore architecture, scalability, databases, and the tradeoffs behind real-world systems."
                    onClick={() => go("High-level design")}
                    count={
                      catalog.lessons.filter((l) => l.track === "HLD").length
                    }
                  />
                  <Path
                    track="LLD"
                    icon={Code2}
                    title="Low-level design"
                    subtitle="Build with intention."
                    description="Master object-oriented thinking, design patterns, and clean implementations in Java."
                    onClick={() => go("Low-level design")}
                    count={
                      catalog.lessons.filter((l) => l.track === "LLD").length
                    }
                  />
                </div>
              </section>
              <section>
                <div className="section-heading">
                  <div>
                    <h2>
                      {completed
                        ? "Keep your momentum"
                        : "A good place to begin"}
                    </h2>
                    <p>
                      Foundational ideas you’ll come back to again and again.
                    </p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => go("Video library")}
                  >
                    Browse all lessons <ArrowRight size={15} />
                  </button>
                </div>
                <div className="lesson-grid">
                  {[
                    catalog.lessons[0],
                    catalog.lessons[1],
                    catalog.lessons[7],
                  ].map(lessonCard)}
                </div>
              </section>
              <div className="practice-banner">
                <div className="terminal-icon">
                  <Terminal />
                </div>
                <div>
                  <h3>Less watching. More building.</h3>
                  <p>
                    Take a real-world design challenge into your Java workspace.
                  </p>
                </div>
                <button onClick={() => go("Java playground")}>
                  Open playground <ArrowUpRight size={17} />
                </button>
              </div>
            </>
          )}
          {page === "Learning paths" && (
            <div className="roadmaps">
              {["HLD", "LLD"].map((track) => (
                <section className="roadmap" key={track}>
                  <div className="roadmap-title">
                    <span className={`path-icon ${track.toLowerCase()}`}>
                      {track === "HLD" ? <Network /> : <Code2 />}
                    </span>
                    <div>
                      <h2>
                        {track === "HLD"
                          ? "High-level design"
                          : "Low-level design in Java"}
                      </h2>
                      <p>
                        Six deliberate steps from fundamentals to design review.
                      </p>
                    </div>
                  </div>
                  {catalog.lessons
                    .filter((l) => l.track === track)
                    .map((l, i) => (
                      <button
                        className="roadmap-step"
                        key={l.id}
                        onClick={() => open(l)}
                      >
                        <span className={state[l.id]?.completed ? "done" : ""}>
                          {state[l.id]?.completed ? (
                            <Check size={18} />
                          ) : (
                            String(i + 1).padStart(2, "0")
                          )}
                        </span>
                        <div>
                          <strong>{l.title}</strong>
                          <small>
                            {l.category} · {l.minutes} min study
                          </small>
                        </div>
                        <ChevronRight size={17} />
                      </button>
                    ))}
                </section>
              ))}
            </div>
          )}
          {[
            "High-level design",
            "Low-level design",
            "Video library",
            "Bookmarks",
            "Java playground",
          ].includes(page) && (
            <>
              <div className="filter-bar">
                <div className="filter-tabs">
                  {(page === "Java playground"
                    ? ["All", "Beginner", "Intermediate", "Advanced"]
                    : ["All", "HLD", "LLD"]
                  ).map((f) => (
                    <button
                      key={f}
                      className={filter === f ? "selected" : ""}
                      onClick={() => setFilter(f)}
                    >
                      {f === "All"
                        ? "All " +
                          (page === "Java playground"
                            ? "challenges"
                            : "lessons")
                        : f}
                    </button>
                  ))}
                </div>
                <label className="search">
                  <Search size={16} />
                  <input
                    placeholder="Search topics, concepts…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
              </div>
              {page === "Java playground" ? (
                <div className="challenge-grid">
                  {catalog.challenges
                    .filter(
                      (c) =>
                        (filter === "All" || c.level === filter) &&
                        `${c.title} ${c.pattern}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                    )
                    .map((c, i) => (
                      <article className="challenge" key={c.id}>
                        <div className="challenge-top">
                          <span className="challenge-number">0{i + 1}</span>
                          <span className="difficulty">{c.level}</span>
                        </div>
                        <h2>{c.title}</h2>
                        <p>{c.description}</p>
                        <span className="pattern">{c.pattern}</span>
                        <button onClick={() => open(c)}>
                          {state[c.id]?.completed
                            ? "Review solution"
                            : "Start designing"}
                          <ArrowRight size={16} />
                        </button>
                      </article>
                    ))}
                </div>
              ) : (
                <div className="lesson-grid">
                  {catalog.lessons
                    .filter(
                      (l) =>
                        (page !== "High-level design" || l.track === "HLD") &&
                        (page !== "Low-level design" || l.track === "LLD") &&
                        (page !== "Bookmarks" || state[l.id]?.bookmarked) &&
                        (filter === "All" || l.track === filter) &&
                        `${l.title} ${l.description} ${l.category}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                    )
                    .map(lessonCard)}
                </div>
              )}
              {(page === "Java playground"
                ? catalog.challenges.filter(
                    (c) =>
                      (filter === "All" || c.level === filter) &&
                      `${c.title} ${c.pattern}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                  )
                : catalog.lessons.filter(
                    (l) =>
                      (page !== "High-level design" || l.track === "HLD") &&
                      (page !== "Low-level design" || l.track === "LLD") &&
                      (page !== "Bookmarks" || state[l.id]?.bookmarked) &&
                      (filter === "All" || l.track === filter) &&
                      `${l.title} ${l.description} ${l.category}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                  )
              ).length === 0 && (
                <div className="empty">
                  <BookOpen size={35} />
                  <h3>
                    {page === "Bookmarks"
                      ? "Your next discoveries belong here."
                      : "No matching topics yet."}
                  </h3>
                  <p>
                    {page === "Bookmarks"
                      ? "Bookmark a lesson to keep it close for later."
                      : "Try a different search or filter."}
                  </p>
                  <button
                    className="primary"
                    onClick={() => {
                      setFilter("All");
                      setQuery("");
                      if (page === "Bookmarks") go("Video library");
                    }}
                  >
                    {page === "Bookmarks" ? "Explore lessons" : "Clear filters"}
                  </button>
                </div>
              )}
            </>
          )}
          <footer>
            <span>
              <Orbit size={15} /> SystemVerse{" "}
              <span className="footer-divider">/</span> A space to become a
              better engineer.
            </span>
            <span
              className={status === "PostgreSQL connected" ? "connected" : ""}
            >
              <span className="status-dot" />
              {status}
            </span>
          </footer>
        </main>
      </div>
      {selected && (
        <Detail
          key={selected.id || "help"}
          item={selected}
          state={state[selected.id] || empty}
          save={save}
          close={() => setSelected(null)}
          notify={notify}
          ready={ready}
        />
      )}
      {toast && (
        <div role="status" className="toast">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
function Stat({ icon: Icon, number, label, color }) {
  return (
    <div className="stat">
      <span className={`stat-icon ${color}`}>
        <Icon size={20} />
      </span>
      <div>
        <strong>{number}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
function Path({
  track,
  icon: Icon,
  title,
  subtitle,
  description,
  onClick,
  count,
}) {
  return (
    <button className={`path-card ${track.toLowerCase()}`} onClick={onClick}>
      <div className="path-top">
        <span className="path-icon">
          <Icon size={24} />
        </span>
        <span className="path-tag">
          {track === "HLD" ? "THE BIG PICTURE" : "THE BUILDING BLOCKS"}
        </span>
        <ArrowUpRight size={19} />
      </div>
      <h3>
        {title} <span>{subtitle}</span>
      </h3>
      <p>{description}</p>
      <div className="path-bottom">
        <span>
          <BookOpen size={14} />
          {count} lessons
        </span>
        <span>
          <Play size={13} />
          Video tutorials
        </span>
        {track === "LLD" && (
          <span>
            <Code2 size={14} />
            Java practice
          </span>
        )}
        <span className="path-arrow">
          <ArrowRight size={18} />
        </span>
      </div>
    </button>
  );
}
function Detail({ item, state, save, close, notify, ready }) {
  const [code, setCode] = useState(state.code || item.starter || ""),
    [notes, setNotes] = useState(state.notes || ""),
    [hints, setHints] = useState(false);
  const ref = React.useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    const handler = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const items = ref.current?.querySelectorAll(
          "button,a,input,textarea,iframe",
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  const persist = async (patch = {}) => {
    await save(item.id, { notes, code, ...patch });
    notify("Saved to your workspace");
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([code], { type: "text/x-java-source" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "Main.java";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="modal-backdrop">
      <div
        ref={ref}
        tabIndex={-1}
        className={`modal ${item.starter ? "practice-modal" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={item.title || "How SystemVerse works"}
      >
        <div className="modal-top">
          <span>
            <Orbit size={18} /> SYSTEMVERSE /{" "}
            {item.help
              ? "YOUR WORKSPACE"
              : item.starter
                ? "JAVA PLAYGROUND"
                : item.track + " LEARNING PATH"}
          </span>
          <button
            onClick={close}
            className="icon-button"
            aria-label="Close dialog"
          >
            <X />
          </button>
        </div>
        {item.help ? (
          <div className="modal-content">
            <h2>Your space to learn and build.</h2>
            <p>
              Follow the HLD and LLD roadmaps, watch companion tutorials, and
              write your own solutions to Java design challenges.
            </p>
            <h3>Progress with your account</h3>
            <p>
              Your progress, notes, bookmarks, and saved code belong to your signed-in
              account. Changes are cached separately for each account in this browser.
              If the server is unavailable, reload when connected to sync pending changes.
              Sign out when using a shared device.
            </p>
            <h3>Java practice</h3>
            <p>
              Write and save Java in the editor, use the requirements and hints
              to review your design, then download Main.java and run it with
              Java 21 or newer using <code>java Main.java</code>. Code execution
              happens on your machine.
            </p>
            <h3>Video lessons</h3>
            <p>
              Videos are embedded from their original creators. Some lessons
              share a longer companion course. If an embed is unavailable, use
              the “Watch on YouTube” link.
            </p>
          </div>
        ) : (
          <>
            <div className="modal-content">
              <div className="eyebrow">
                <span className="purple">{item.category || item.pattern}</span>
                <span>{item.level}</span>
              </div>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
            </div>
            {item.starter ? (
              <div className="practice-layout">
                <div className="requirements">
                  <h3>Design requirements</h3>
                  <ol>
                    {item.requirements.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ol>
                  <button
                    className="text-button"
                    onClick={() => setHints(!hints)}
                  >
                    {hints ? "Hide" : "Reveal"} design hints{" "}
                    <ChevronRight size={15} />
                  </button>
                  {hints && (
                    <ul>
                      {item.hints.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  )}
                  <div className="run-instructions">
                    <Terminal size={18} />
                    <strong>Run on your machine</strong>
                    <p>Download your solution and use Java 21+:</p>
                    <code>java Main.java</code>
                    <p>
                      Add checks to main to test your requirements. Completion
                      is self-assessed.
                    </p>
                  </div>
                </div>
                <div className="editor">
                  <div className="editor-bar">
                    <span>
                      <Code2 size={15} /> Main.java
                    </span>
                    <span>Java 21</span>
                  </div>
                  <textarea
                    aria-label="Java source code"
                    maxLength={100000}
                    spellCheck="false"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Tab") {
                        e.preventDefault();
                        const t = e.target;
                        const start = t.selectionStart;
                        setCode(
                          code.slice(0, start) +
                            "    " +
                            code.slice(t.selectionEnd),
                        );
                        requestAnimationFrame(() => {
                          t.selectionStart = t.selectionEnd = start + 4;
                        });
                      }
                    }}
                  />
                  <div className="editor-footer">
                    <span>{code.split("\n").length} lines · UTF-8</span>
                    <button onClick={download}>
                      <Download size={14} /> Download .java
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="lesson-detail">
                <div className="video-frame">
                  <iframe
                    title={item.title + " video tutorial"}
                    src={`https://www.youtube-nocookie.com/embed/${item.video}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
                <div className="video-attribution">
                  <span>
                    {item.creator} · {item.videoNote}
                  </span>
                  <a
                    href={`https://www.youtube.com/watch?v=${item.video}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Watch on YouTube <ExternalLink size={13} />
                  </a>
                </div>
                <h3>Ideas to take with you</h3>
                <ul>
                  {item.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
                <div className="reflection">
                  <strong>Put it into practice</strong>
                  <p>{item.exercise}</p>
                </div>
              </div>
            )}
            <div className="notes-section">
              <label htmlFor="notes">
                Your {item.starter ? "design decisions" : "learning notes"}
              </label>
              <textarea
                id="notes"
                value={notes}
                maxLength={20000}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Capture an insight, a tradeoff, or a question to explore…"
              />
            </div>
            <div className="modal-actions">
              <button
                className="secondary"
                disabled={!ready}
                onClick={() => persist()}
              >
                <Save size={16} /> Save {item.starter ? "solution" : "notes"}
              </button>
              <button
                className="primary"
                disabled={!ready}
                onClick={() => persist({ completed: !state.completed })}
              >
                <CheckCircle2 size={16} />
                {state.completed ? "Mark incomplete" : "Mark complete"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<AuthGate>{user => <App key={user.uid} user={user} />}</AuthGate>);
