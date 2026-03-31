const express = require("express");
const axios = require("axios");
const router = express.Router();

const gh = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    Accept: "application/vnd.github.v3+json",
    ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
  },
});

const parse = (url) => {
  const m = url.replace(/\.git$/, "").match(/github\.com\/([^/]+)\/([^/]+)/);
  return m ? { owner: m[1], repo: m[2] } : null;
};

// Detect tech stack from repo
const detectStack = (repo, files) => {
  const fileNames = files.map(f => f.name.toLowerCase());
  const lang = repo.language?.toLowerCase();
  const topics = repo.topics || [];

  const stack = [];
  const type = [];

  // Language detection
  if (fileNames.includes("package.json")) {
    stack.push("Node.js");
    if (fileNames.includes("next.config.js") || topics.includes("nextjs")) { stack.push("Next.js"); type.push("Full Stack App"); }
    else if (fileNames.some(f => f.includes("react"))) { stack.push("React.js"); type.push("Frontend App"); }
    else { stack.push("Express.js"); type.push("Backend API"); }
  }
  if (fileNames.includes("requirements.txt") || lang === "python") { stack.push("Python"); type.push("Python App"); }
  if (fileNames.includes("index.html") && !fileNames.includes("package.json")) { stack.push("HTML/CSS/JS"); type.push("Static Website"); }
  if (fileNames.includes("gemfile") || lang === "ruby") { stack.push("Ruby"); type.push("Ruby App"); }
  if (fileNames.includes("go.mod") || lang === "go") { stack.push("Go"); type.push("Go App"); }
  if (fileNames.includes("composer.json") || lang === "php") { stack.push("PHP"); type.push("PHP App"); }
  if (fileNames.some(f => f.includes("docker"))) stack.push("Docker");
  if (fileNames.includes("mongodb") || topics.includes("mongodb")) stack.push("MongoDB");
  if (topics.includes("postgresql") || topics.includes("postgres")) stack.push("PostgreSQL");

  return {
    stack: stack.length ? stack : [repo.language || "Unknown"],
    type: type.length ? type[0] : "Web Application",
  };
};

router.get("/repo", async (req, res) => {
  const parsed = parse(req.query.url || "");
  if (!parsed) return res.status(400).json({ error: "Invalid GitHub URL" });
  try {
    const { data: d } = await gh.get(`/repos/${parsed.owner}/${parsed.repo}`);

    // Fetch root files for stack detection
    let files = [];
    try {
      const { data: fc } = await gh.get(`/repos/${parsed.owner}/${parsed.repo}/contents/`);
      files = Array.isArray(fc) ? fc : [];
    } catch {}

    const { stack, type } = detectStack(d, files);

    res.json({
      success: true,
      repo: {
        id: d.id, name: d.name, fullName: d.full_name,
        description: d.description, url: d.html_url,
        defaultBranch: d.default_branch, language: d.language,
        stars: d.stargazers_count, forks: d.forks_count,
        size: d.size, topics: d.topics || [],
        updatedAt: d.updated_at, createdAt: d.created_at,
        openIssues: d.open_issues_count,
        license: d.license?.name || null,
        owner: { login: d.owner.login, avatarUrl: d.owner.avatar_url },
        // Analysis
        stack,
        type,
        files: files.slice(0, 20).map(f => ({ name: f.name, type: f.type })),
      }
    });
  } catch (e) { res.status(e.response?.status || 500).json({ error: e.response?.data?.message || e.message }); }
});

router.get("/files", async (req, res) => {
  const parsed = parse(req.query.url || "");
  if (!parsed) return res.status(400).json({ error: "Invalid GitHub URL" });
  try {
    const { data } = await gh.get(`/repos/${parsed.owner}/${parsed.repo}/contents/${req.query.path || ""}`);
    const items = Array.isArray(data) ? data : [data];
    res.json({ success: true, files: items.map(f => ({ name: f.name, path: f.path, type: f.type, size: f.size })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/file-content", async (req, res) => {
  const parsed = parse(req.query.url || "");
  if (!parsed) return res.status(400).json({ error: "Invalid GitHub URL" });
  try {
    const { data } = await gh.get(`/repos/${parsed.owner}/${parsed.repo}/contents/${req.query.filePath}`);
    const content = data.encoding === "base64" ? Buffer.from(data.content, "base64").toString("utf8") : "";
    res.json({ success: true, name: data.name, path: data.path, content, size: data.size });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/search", async (req, res) => {
  try {
    const { data } = await gh.get("/search/repositories", { params: { q: req.query.q, sort: "stars", order: "desc", per_page: 10 } });
    res.json({
      success: true, results: data.items.map(r => ({
        id: r.id, name: r.name, fullName: r.full_name, description: r.description,
        url: r.html_url, language: r.language, stars: r.stargazers_count,
        forks: r.forks_count, topics: r.topics || [],
        owner: { login: r.owner.login, avatarUrl: r.owner.avatar_url },
      }))
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
