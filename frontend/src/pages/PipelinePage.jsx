import React, { useState, useEffect, useRef } from "react";
import { githubApi, aiApi, deployApi } from "../utils/api";
import RenderWakeup from "../components/RenderWakeup";

const STAGES = [
  { id: "INITIALIZING", icon: "🔧", label: "Init" },
  { id: "CLONING", icon: "📥", label: "Clone" },
  { id: "DETECTING", icon: "🔍", label: "Detect" },
  { id: "APPLYING_MODS", icon: "🤖", label: "AI Mods" },
  { id: "BUILDING", icon: "🏗️", label: "Build" },
  { id: "DEPLOYING", icon: "🚀", label: "Deploy" },
  { id: "HEALTH_CHECK", icon: "❤️", label: "Health" },
  { id: "DONE", icon: "✅", label: "Done" },
];

const LANG_COLORS = {
  JavaScript: "#f7df1e",
  TypeScript: "#3178c6",
  Python: "#3776ab",
  Java: "#ed8b00",
  Go: "#00add8",
  Ruby: "#cc342d",
  PHP: "#777bb4",
  "C++": "#00599c",
  Rust: "#dea584",
  HTML: "#e34f26",
  CSS: "#1572b6",
};

const getStars = (n) => {
  if (!n) return "0";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return n.toString();
};

export default function PipelinePage() {
  const [tab, setTab] = useState("github");

  // GitHub
  const [repoUrl, setRepoUrl] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [repoInfo, setRepoInfo] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [loadingRepo, setLoadingRepo] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // AI - NEW: natural language, no file needed
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [appliedMods, setAppliedMods] = useState([]);

  // Deploy
  const [renderKey, setRenderKey] = useState("");
  const [deployId, setDeployId] = useState(null);
  const [depStatus, setDepStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loadingDeploy, setLoadingDeploy] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [error, setError] = useState("");
  const logsRef = useRef(null);

  useEffect(() => {
    logsRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    if (
      !deployId ||
      depStatus?.status === "SUCCESS" ||
      depStatus?.status === "FAILED"
    )
      return;
    const iv = setInterval(async () => {
      try {
        const [sr, lr] = await Promise.all([
          deployApi.getStatus(deployId),
          deployApi.getLogs(deployId),
        ]);
        setDepStatus(sr.data);
        setLogs(lr.data.logs || []);
        if (sr.data.status === "SUCCESS" || sr.data.status === "FAILED") {
          clearInterval(iv);
          setTab("deploy");
        }
      } catch {}
    }, 3000);
    return () => clearInterval(iv);
  }, [deployId, depStatus?.status]);

  const fetchRepo = async () => {
    if (!repoUrl.trim()) return;
    setError("");
    setLoadingRepo(true);
    setRepoInfo(null);
    setAiSuggestions([]);
    setAppliedMods([]);
    try {
      const { data } = await githubApi.getRepo(repoUrl);
      setRepoInfo(data.repo);
      // Auto-fetch AI suggestions based on repo
      const sugRes = await aiApi.analyze({
        repoName: data.repo.name,
        language: data.repo.language,
        description: data.repo.description,
        stack: data.repo.stack,
      });
      setAiSuggestions(sugRes.data.suggestions || []);
    } catch (e) {
      setError(
        e.response?.data?.error ||
          "Failed to fetch repo. Check URL and GitHub token.",
      );
    } finally {
      setLoadingRepo(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQ.trim()) return;
    setLoadingSearch(true);
    setSearchResults([]);
    try {
      const { data } = await githubApi.searchRepos(searchQ);
      setSearchResults(data.results || []);
    } catch (e) {
      setError(e.response?.data?.error || "Search failed");
    } finally {
      setLoadingSearch(false);
    }
  };

  const applyAI = async (instruction) => {
    if (!instruction.trim()) return;
    setLoadingAi(true);
    try {
      const { data } = await aiApi.modifyCode({
        instruction,
        repoUrl,
      });
      setAiResult(data);
      const mod = { instruction, summary: data.summary, intent: data.intent, modifiedCode: data.modifiedCode, filename: data.filename };
      setAppliedMods((prev) => [...prev, mod]);
      setAiInstruction("");
    } catch (e) {
      setError(e.response?.data?.error || "AI modification failed");
    } finally {
      setLoadingAi(false);
    }
  };

  const handleDeploy = async () => {
    if (!repoInfo) {
      setError("Please fetch a repository first");
      return;
    }
    setLoadingDeploy(true);
    setError("");
    setLogs([]);
    try {
      const { data } = await deployApi.trigger({
        repoUrl,
        repoName: repoInfo.name,
        branch: repoInfo.defaultBranch || "main",
        modifications: appliedMods,
        renderApiKey: renderKey || undefined,
      });
      setDeployId(data.deployment.id);
      setDepStatus(data.deployment);
      setTab("deploy");
    } catch (e) {
      setError("Deploy failed: " + (e.response?.data?.error || e.message));
    } finally {
      setLoadingDeploy(false);
    }
  };

  const handleDownload = async () => {
    if (!repoInfo) {
      setError("Please fetch a repository first");
      return;
    }
    setLoadingDownload(true);
    setError("");
    try {
      const response = await deployApi.download({
        repoUrl,
        modifications: appliedMods
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const repoNameStr = repoInfo.name || repoUrl.split("/").pop().replace(".git", "");
      link.setAttribute("download", `modified-${repoNameStr}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      let errMsg = e.message;
      if (e.response && e.response.data && e.response.data instanceof Blob) {
         try {
           const text = await e.response.data.text();
           const json = JSON.parse(text);
           errMsg = json.error || errMsg;
         } catch(err) {}
      }
      setError("Download failed: " + errMsg);
    } finally {
      setLoadingDownload(false);
    }
  };

  const stageIdx = depStatus
    ? STAGES.findIndex((s) => s.id === depStatus.stage)
    : -1;
  const langColor = LANG_COLORS[repoInfo?.language] || "#58a6ff";

  return (
    <div>
      <div className="flex between center mb3">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>
            <i className="bi bi-rocket me-2 blue"></i>Deployment Pipeline
          </h1>
          <p className="sm s2">Fetch → Analyze → AI Modify → Deploy</p>
        </div>
        {repoInfo && (
          <button
            className="btn btn-success"
            onClick={handleDeploy}
            disabled={loadingDeploy}
          >
            {loadingDeploy ? (
              <>
                <span className="spin"></span> Starting...
              </>
            ) : (
              <>
                <i className="bi bi-rocket-takeoff"></i> Deploy Now
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error mb2">
          <i className="bi bi-exclamation-triangle"></i>
          <div style={{ flex: 1 }}>{error}</div>
          <button
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
            }}
            onClick={() => setError("")}
          >
            <i className="bi bi-x"></i>
          </button>
        </div>
      )}

      {/* Pipeline stages */}
      <div className="card mb3">
        <div className="card-head">
          <i className="bi bi-diagram-3"></i> Pipeline Stages
          {depStatus && (
            <span
              className={`badge ms-2 ${depStatus.status === "SUCCESS" ? "badge-success" : depStatus.status === "RUNNING" ? "badge-running" : "badge-pending"}`}
            >
              {depStatus.status === "RUNNING" && <span className="dot"></span>}
              {depStatus.status}
            </span>
          )}
          {appliedMods.length > 0 && (
            <span className="badge badge-info ms-2">
              <i className="bi bi-cpu"></i> {appliedMods.length} AI mod
              {appliedMods.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="card-body">
          <div className="pipeline">
            {STAGES.map((s, i) => {
              const done = stageIdx > i || depStatus?.status === "SUCCESS";
              const active = stageIdx === i && depStatus?.status === "RUNNING";
              return (
                <div className="ps" key={s.id}>
                  <div
                    className={`pc ${done ? "done" : active ? "active" : "pending"}`}
                  >
                    {done ? "✓" : s.icon}
                  </div>
                  <div className="pl">{s.label}</div>
                </div>
              );
            })}
          </div>
          {depStatus && depStatus.status !== "SUCCESS" && (
            <div className="progress-bar mt2">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.round(((stageIdx + 1) / STAGES.length) * 100)}%`,
                }}
              ></div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="tabs">
          {[
            { id: "github", icon: "bi-github", label: "GitHub" },
            { id: "ai", icon: "bi-cpu", label: "AI Modifier" },
            { id: "deploy", icon: "bi-terminal", label: "Logs & Deploy" },
          ].map((t) => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <i className={`bi ${t.icon}`}></i> {t.label}
              {t.id === "ai" && appliedMods.length > 0 && (
                <span
                  style={{
                    background: "var(--purple)",
                    color: "#fff",
                    borderRadius: 10,
                    padding: "0 5px",
                    fontSize: 10,
                    marginLeft: 4,
                  }}
                >
                  {appliedMods.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── GITHUB TAB ── */}
        {tab === "github" && (
          <div className="card-body">
            {/* Search */}
            <div className="mb3">
              <label className="label">
                <i className="bi bi-search me-1"></i>Search GitHub Repositories
              </label>
              <div className="flex gap2">
                <input
                  className="inp"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search repos e.g. express todo app, react portfolio..."
                />
                <button
                  className="btn btn-ghost"
                  onClick={handleSearch}
                  disabled={loadingSearch}
                >
                  {loadingSearch ? (
                    <span className="spin"></span>
                  ) : (
                    <i className="bi bi-search"></i>
                  )}
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="mt2 flex col gap1">
                  {searchResults.map((r) => (
                    <div
                      key={r.id}
                      className={`repo-card ${repoUrl === r.url ? "selected" : ""}`}
                      onClick={() => {
                        setRepoUrl(r.url);
                        setSearchResults([]);
                      }}
                    >
                      <div className="flex between center">
                        <div>
                          <div className="sm bold" style={{ color: "#f8fafc" }}>{r.fullName}</div>
                          <div className="xs mt1" style={{ color: "#94a3b8" }}>
                            {r.description || "No description"}
                          </div>
                          <div className="flex gap2 mt1 wrap">
                            {r.language && (
                              <span
                                className="tag"
                                style={{
                                  color:
                                    LANG_COLORS[r.language] || "var(--text2)",
                                  borderColor:
                                    LANG_COLORS[r.language] || "var(--border)",
                                }}
                              >
                                ● {r.language}
                              </span>
                            )}
                            {r.topics?.slice(0, 3).map((t) => (
                              <span key={t} className="tag">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div
                          className="flex col"
                          style={{ alignItems: "flex-end", gap: 4 }}
                        >
                          <span className="xs muted">
                            <i className="bi bi-star me-1"></i>
                            {getStars(r.stars)}
                          </span>
                          <span className="xs muted">
                            <i className="bi bi-diagram-2 me-1"></i>
                            {getStars(r.forks)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="divider" />

            {/* URL input */}
            <div className="mb3">
              <label className="label">
                <i className="bi bi-link-45deg me-1"></i>Repository URL
              </label>
              <div className="flex gap2">
                <input
                  className="inp"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchRepo()}
                  placeholder="https://github.com/owner/repository"
                />
                <button
                  className="btn btn-primary"
                  onClick={fetchRepo}
                  disabled={loadingRepo || !repoUrl}
                >
                  {loadingRepo ? (
                    <>
                      <span className="spin"></span> Analyzing...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-cloud-download"></i> Fetch & Analyze
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Render API Key */}
            <div className="mb3">
              <label className="label">
                <i className="bi bi-key me-1"></i>Your Render API Key{" "}
                <span className="muted">(optional)</span>
              </label>
              <input
                className="inp"
                type="password"
                value={renderKey}
                onChange={(e) => setRenderKey(e.target.value)}
                placeholder="rnd_xxxxxxxxxx — get from dashboard.render.com → Account Settings → API Keys"
              />
            </div>

            {/* Repo overview card - NEW! */}
            {repoInfo && (
              <div>
                {/* Repo header */}
                <div
                  style={{
                    background: "var(--bg3)",
                    borderRadius: 10,
                    padding: 16,
                    marginBottom: 14,
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="flex center gap2 mb2">
                    <img
                      src={repoInfo.owner?.avatarUrl}
                      alt="av"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        border: "2px solid var(--border)",
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div className="bold" style={{ fontSize: 14 }}>
                        {repoInfo.fullName}
                      </div>
                      <div className="xs muted">
                        {repoInfo.description || "No description provided"}
                      </div>
                    </div>
                    <a
                      href={repoInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost"
                      style={{ padding: "4px 10px", fontSize: 11 }}
                    >
                      <i className="bi bi-box-arrow-up-right"></i> GitHub
                    </a>
                  </div>

                  {/* Stats row */}
                  <div className="flex gap3 mb2 wrap">
                    {repoInfo.language && (
                      <span className="xs s2">
                        <span
                          style={{
                            display: "inline-block",
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: langColor,
                            marginRight: 4,
                          }}
                        ></span>
                        {repoInfo.language}
                      </span>
                    )}
                    <span className="xs muted">
                      <i className="bi bi-star me-1"></i>
                      {getStars(repoInfo.stars)} stars
                    </span>
                    <span className="xs muted">
                      <i className="bi bi-diagram-2 me-1"></i>
                      {getStars(repoInfo.forks)} forks
                    </span>
                    <span className="xs muted">
                      <i className="bi bi-git me-1"></i>
                      {repoInfo.defaultBranch}
                    </span>
                    {repoInfo.license && (
                      <span className="xs muted">
                        <i className="bi bi-file-text me-1"></i>
                        {repoInfo.license}
                      </span>
                    )}
                  </div>

                  {/* Topics */}
                  {repoInfo.topics?.length > 0 && (
                    <div className="flex wrap gap1 mb2">
                      {repoInfo.topics.map((t) => (
                        <span key={t} className="tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Project overview - NEW! */}
                <div className="g2 mb3">
                  {/* Basic overview */}
                  <div className="card">
                    <div className="card-head">
                      <i className="bi bi-info-circle blue"></i> Project
                      Overview
                    </div>
                    <div className="card-body">
                      <div
                        className="flex between"
                        style={{
                          padding: "5px 0",
                          borderBottom: "1px solid var(--border2)",
                          fontSize: 12,
                        }}
                      >
                        <span className="muted">Type</span>
                        <span
                          className="bold"
                          style={{ color: "var(--purple)" }}
                        >
                          {repoInfo.type}
                        </span>
                      </div>
                      <div
                        className="flex between"
                        style={{
                          padding: "5px 0",
                          borderBottom: "1px solid var(--border2)",
                          fontSize: 12,
                        }}
                      >
                        <span className="muted">Language</span>
                        <span style={{ color: langColor }}>
                          ● {repoInfo.language || "Unknown"}
                        </span>
                      </div>
                      <div
                        className="flex between"
                        style={{
                          padding: "5px 0",
                          borderBottom: "1px solid var(--border2)",
                          fontSize: 12,
                        }}
                      >
                        <span className="muted">Stars</span>
                        <span className="s2">
                          ⭐ {getStars(repoInfo.stars)}
                        </span>
                      </div>
                      <div
                        className="flex between"
                        style={{
                          padding: "5px 0",
                          borderBottom: "1px solid var(--border2)",
                          fontSize: 12,
                        }}
                      >
                        <span className="muted">Size</span>
                        <span className="s2">
                          {repoInfo.size
                            ? `${(repoInfo.size / 1024).toFixed(1)} MB`
                            : "N/A"}
                        </span>
                      </div>
                      <div
                        className="flex between"
                        style={{ padding: "5px 0", fontSize: 12 }}
                      >
                        <span className="muted">Last Updated</span>
                        <span className="s2">
                          {new Date(repoInfo.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tech stack - NEW! */}
                  <div className="card">
                    <div className="card-head">
                      <i className="bi bi-layers purple"></i> Tech Stack
                    </div>
                    <div className="card-body">
                      <div className="flex wrap gap1 mb2">
                        {repoInfo.stack?.map((s) => (
                          <span key={s} className="stack-badge">
                            <i className="bi bi-check-circle green"></i> {s}
                          </span>
                        ))}
                      </div>
                      <div className="divider" />
                      <div className="xs muted mb1">Root Files:</div>
                      <div className="flex wrap gap1">
                        {repoInfo.files?.slice(0, 10).map((f) => (
                          <span
                            key={f.name}
                            className="tag"
                            style={{
                              color:
                                f.type === "dir"
                                  ? "var(--orange)"
                                  : "var(--text2)",
                            }}
                          >
                            {f.type === "dir" ? "📁" : "📄"} {f.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI suggestions - NEW! */}
                {aiSuggestions.length > 0 && (
                  <div className="card">
                    <div className="card-head">
                      <i className="bi bi-cpu purple"></i> AI Suggestions for
                      this repo
                      <span className="badge badge-info ms-2">
                        Auto-detected
                      </span>
                    </div>
                    <div className="card-body">
                      <p className="xs s2 mb2">
                        Click any suggestion to apply it, or go to AI Modifier
                        tab to write your own instruction:
                      </p>
                      <div className="flex col gap1">
                        {aiSuggestions.map((s) => (
                          <button
                            key={s.id}
                            className="suggestion-chip"
                            onClick={() => {
                              setTab("ai");
                              setAiInstruction(s.text);
                            }}
                          >
                            <span style={{ fontSize: 16 }}>{s.icon}</span>
                            <span>{s.text}</span>
                            <i className="bi bi-arrow-right ms-auto xs muted"></i>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Deploy button */}
                <div className="flex gap2 mt3">
                  <button
                    className="btn btn-success"
                    onClick={handleDeploy}
                    disabled={loadingDeploy || loadingDownload}
                    style={{ flex: 1, justifyContent: "center", padding: 10 }}
                  >
                    {loadingDeploy ? (
                      <>
                        <span className="spin"></span> Starting...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-rocket-takeoff"></i> Deploy Now (No
                        AI Changes)
                      </>
                    )}
                  </button>
                  <button
                    className="btn btn-purple"
                    onClick={handleDownload}
                    disabled={loadingDownload || loadingDeploy}
                    style={{ justifyContent: "center", padding: 10 }}
                  >
                    {loadingDownload ? (
                      <><span className="spin"></span> Zipping...</>
                    ) : (
                      <><i className="bi bi-download"></i> Download Code</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── AI TAB - NEW: Natural language, no file selection ── */}
        {tab === "ai" && (
          <div className="card-body">
            <div className="alert alert-info mb3">
              <i className="bi bi-cpu"></i>
              <div>
                <strong>AI Code Modifier</strong> — Just tell us what you need
                in plain English! No coding knowledge required. The AI will
                understand and apply the changes automatically.
              </div>
            </div>

            {!repoInfo ? (
              <div className="empty">
                <div className="empty-icon">📁</div>
                <div className="empty-title">No repository selected</div>
                <p className="xs muted mt1">
                  Go to GitHub tab and fetch a repository first
                </p>
                <button
                  className="btn btn-ghost mt2"
                  onClick={() => setTab("github")}
                >
                  <i className="bi bi-github"></i> Go to GitHub
                </button>
              </div>
            ) : (
              <div>
                <div
                  className="flex center gap2 mb3 p-2"
                  style={{
                    background: "var(--bg3)",
                    borderRadius: 8,
                    padding: 10,
                  }}
                >
                  <i className="bi bi-github s2"></i>
                  <span className="xs s2">Working on:</span>
                  <span className="xs bold blue">{repoInfo.fullName}</span>
                  <span className="tag ms-auto">{repoInfo.type}</span>
                </div>

                {/* Natural language input - KEY FEATURE */}
                <div className="mb3">
                  <label className="label" style={{ fontSize: 13 }}>
                    💬 What do you want to add or change? (Write in plain
                    English)
                  </label>
                  <textarea
                    className="textarea"
                    value={aiInstruction}
                    onChange={(e) => setAiInstruction(e.target.value)}
                    placeholder="Examples:&#10;• I need user login and registration&#10;• Add error handling so app doesn't crash&#10;• Make it work on cloud hosting&#10;• Add logging to track requests&#10;• Add an API to save and get data"
                    rows={4}
                  />

                  {/* Quick suggestion chips */}
                  <div className="mt2">
                    <div className="xs muted mb1">Quick suggestions:</div>
                    <div className="flex wrap gap1">
                      {[
                        { icon: "🔐", text: "Add user login & registration" },
                        { icon: "🛡️", text: "Add error handling" },
                        { icon: "🔧", text: "Fix for cloud deployment" },
                        { icon: "📝", text: "Add request logging" },
                        { icon: "🌐", text: "Add CORS support" },
                        { icon: "🗂️", text: "Add CRUD API routes" },
                        { icon: "✅", text: "Add input validation" },
                        { icon: "⚙️", text: "Add environment config" },
                      ].map(({ icon, text }) => (
                        <button
                          key={text}
                          className="btn btn-ghost"
                          style={{ fontSize: 11, padding: "3px 8px" }}
                          onClick={() => setAiInstruction(text)}
                        >
                          {icon} {text}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-purple"
                  onClick={() => applyAI(aiInstruction)}
                  disabled={loadingAi || !aiInstruction.trim()}
                >
                  {loadingAi ? (
                    <>
                      <span className="spin"></span> Applying...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-cpu"></i> Apply AI Modification
                    </>
                  )}
                </button>

                {/* Applied modifications list */}
                {appliedMods.length > 0 && (
                  <div className="mt3">
                    <div className="label">
                      ✅ Applied Modifications ({appliedMods.length})
                    </div>
                    <div className="flex col gap1">
                      {appliedMods.map((mod, i) => (
                        <div
                          key={i}
                          style={{
                            background: "rgba(34,197,94,0.06)",
                            border: "1px solid rgba(34,197,94,0.2)",
                            borderRadius: 8,
                            padding: "8px 12px",
                          }}
                        >
                          <div className="flex between center">
                            <div>
                              <div className="xs bold green">
                                <i className="bi bi-check-circle me-1"></i>
                                {mod.summary}
                              </div>
                              <div className="xs muted mt1">
                                "{mod.instruction}"
                              </div>
                            </div>
                            <span
                              className="tag"
                              style={{ color: "var(--purple)" }}
                            >
                              {mod.intent}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Latest AI result code preview */}
                {aiResult && (
                  <div className="mt3">
                    <div className="label">🤖 Latest Modification Preview</div>
                    <div className="g2 gap2">
                      <div>
                        <div className="xs s2 mb1">Original</div>
                        <div
                          style={{
                            background: "var(--bg)",
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                            padding: 10,
                            maxHeight: 200,
                            overflowY: "auto",
                            fontFamily: "var(--mono)",
                            fontSize: 11,
                            lineHeight: 1.7,
                          }}
                        >
                          {aiResult.originalCode
                            .split("\n")
                            .slice(0, 20)
                            .map((l, i) => (
                              <div key={i} style={{ color: "var(--text2)" }}>
                                {l || " "}
                              </div>
                            ))}
                        </div>
                      </div>
                      <div>
                        <div className="xs s2 mb1">
                          Modified{" "}
                          <span
                            className="badge badge-success ms-1"
                            style={{ fontSize: 9 }}
                          >
                            AI
                          </span>
                        </div>
                        <div
                          style={{
                            background: "var(--bg)",
                            border: "1px solid rgba(34,197,94,0.3)",
                            borderRadius: 6,
                            padding: 10,
                            maxHeight: 200,
                            overflowY: "auto",
                            fontFamily: "var(--mono)",
                            fontSize: 11,
                            lineHeight: 1.7,
                          }}
                        >
                          {aiResult.modifiedCode
                            .split("\n")
                            .slice(0, 20)
                            .map((l, i) => (
                              <div key={i} style={{ color: "var(--green)" }}>
                                {l || " "}
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Deploy with AI changes */}
                {appliedMods.length > 0 && (
                  <div className="flex gap2 mt3 w100">
                    <button
                      className="btn btn-success"
                      onClick={handleDeploy}
                      disabled={loadingDeploy || loadingDownload}
                      style={{ flex: 1, justifyContent: "center", padding: 10 }}
                    >
                      {loadingDeploy ? (
                        <>
                          <span className="spin"></span> Starting...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-rocket-takeoff"></i> Deploy 
                          ({appliedMods.length})
                        </>
                      )}
                    </button>
                    <button
                      className="btn btn-purple"
                      onClick={handleDownload}
                      disabled={loadingDownload || loadingDeploy}
                      style={{ flex: 1, justifyContent: "center", padding: 10 }}
                    >
                      {loadingDownload ? (
                        <>
                          <span className="spin"></span> Zipping...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-download"></i> Download ZIP
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── DEPLOY TAB ── */}
        {tab === "deploy" && (
          <div className="card-body">
            {!deployId ? (
              <div className="empty">
                <div className="empty-icon">🚀</div>
                <div className="empty-title">No deployment started</div>
                <p className="xs muted mt1">
                  {repoInfo
                    ? 'Click "Deploy Now" to start'
                    : "Fetch a GitHub repo first"}
                </p>
                {repoInfo && (
                  <button
                    className="btn btn-success mt2"
                    onClick={handleDeploy}
                    disabled={loadingDeploy}
                  >
                    <i className="bi bi-rocket-takeoff"></i> Start Deployment
                  </button>
                )}
              </div>
            ) : (
              <div>
                {depStatus && (
                  <div className="flex gap2 mb3 wrap">
                    {[
                      ["ID", depStatus.id?.slice(0, 8) + "..."],
                      ["Repo", depStatus.repoName],
                      ["Status", depStatus.status],
                      ["Stage", depStatus.stage],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        style={{
                          background: "var(--bg3)",
                          borderRadius: 6,
                          padding: "6px 12px",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div className="xs muted">{k}</div>
                        <div className="mono xs mt1 bold" style={{ color: "var(--text)" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}

                {depStatus?.deployUrl && (
                  <div className="mb3">
                    <div className="deploy-url-box mb2">
                      <span style={{ fontSize: 26 }}>🌐</span>
                      <div style={{ flex: 1 }}>
                        <div className="sm bold mb1">
                          🎉 Deployment Successful!
                        </div>
                        <a
                          href={depStatus.deployUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="du-link"
                        >
                          {depStatus.deployUrl}
                        </a>
                      </div>
                      <a
                        href={depStatus.deployUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-success"
                      >
                        <i className="bi bi-box-arrow-up-right"></i> Open
                      </a>
                    </div>
                    <RenderWakeup url={depStatus.deployUrl} />
                  </div>
                )}

                <label className="label">
                  <i className="bi bi-terminal me-1"></i>Build Logs
                </label>
                <div className="log-box">
                  {logs.length === 0 ? (
                    <span className="muted">Waiting for logs...</span>
                  ) : (
                    logs.map((log, i) => (
                      <div
                        key={i}
                        className={`log-line ${log.includes("❌") || log.includes("ERROR") ? "err" : log.includes("⚠️") ? "warn" : ""}`}
                      >
                        {log}
                      </div>
                    ))
                  )}
                  {depStatus?.status === "RUNNING" && (
                    <div className="log-line">
                      <span className="cursor"></span>
                    </div>
                  )}
                  <div ref={logsRef}></div>
                </div>

                {depStatus?.status === "SUCCESS" && (
                  <div className="flex gap2 mt2">
                    <button
                      className="btn btn-ghost"
                      onClick={() => {
                        setDeployId(null);
                        setDepStatus(null);
                        setLogs([]);
                        setRepoInfo(null);
                        setRepoUrl("");
                        setAiResult(null);
                        setAppliedMods([]);
                        setAiSuggestions([]);
                        setTab("github");
                      }}
                    >
                      <i className="bi bi-plus"></i> New Deployment
                    </button>
                    <button
                      className="btn btn-purple"
                      onClick={handleDownload}
                      disabled={loadingDownload}
                    >
                      {loadingDownload ? (
                        <><span className="spin"></span> Zipping...</>
                      ) : (
                        <><i className="bi bi-download"></i> Download Code (ZIP)</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
