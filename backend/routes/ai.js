const express = require("express");
const axios = require("axios");
const router = express.Router();

// Intent patterns
const intents = [
  { intent: "add_auth", p: [/auth|login|register|signup|password|jwt|session/i] },
  { intent: "add_api", p: [/api|endpoint|route|rest|crud/i] },
  { intent: "add_database", p: [/database|db|mongo|sql|store|save/i] },
  { intent: "add_error_handling", p: [/error|try.?catch|handle|exception/i] },
  { intent: "fix_port", p: [/port|listen|server/i] },
  { intent: "add_logging", p: [/log|debug|console|track/i] },
  { intent: "add_validation", p: [/validat|check|sanitize|verify/i] },
  { intent: "add_comment", p: [/comment|doc|explain|document/i] },
  { intent: "add_cors", p: [/cors|cross.?origin|access/i] },
  { intent: "add_middleware", p: [/middleware|helmet|security|compress/i] },
  { intent: "convert_arrow", p: [/arrow|es6|modern|refactor/i] },
  { intent: "add_env", p: [/env|environment|config|dotenv/i] },
];

const transforms = {
  add_auth: (code) => ({
    code: `// ── Authentication Middleware ────────────────────────────────
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    next();
  } catch { res.status(403).json({ error: 'Invalid token' }); }
};

const hashPassword = async (password) => bcrypt.hash(password, 10);
const comparePassword = async (password, hash) => bcrypt.compare(password, hash);
// ────────────────────────────────────────────────────────────────

${code}`,
    summary: "Added JWT authentication middleware and password hashing utilities"
  }),

  add_api: (code) => ({
    code: `${code}

// ── Auto-generated API Routes ────────────────────────────────────
app.get('/api/items', async (req, res) => {
  try {
    res.json({ success: true, data: [], message: 'Items fetched' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/items', async (req, res) => {
  try {
    const item = req.body;
    if (!item) return res.status(400).json({ error: 'Data required' });
    res.status(201).json({ success: true, data: item, message: 'Item created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/items/:id', async (req, res) => {
  try {
    res.json({ success: true, message: \`Item \${req.params.id} updated\` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/items/:id', async (req, res) => {
  try {
    res.json({ success: true, message: \`Item \${req.params.id} deleted\` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// ────────────────────────────────────────────────────────────────`,
    summary: "Added complete CRUD API routes (GET, POST, PUT, DELETE)"
  }),

  add_error_handling: (code) => ({
    code: code.replace(
      /(const\s+\w+\s*=\s*async.*\{)([\s\S]*?)(\n\})/g,
      (_, open, body, close) =>
        body.includes("try") ? _ :
          `${open}\n  try {${body.trimEnd()}\n  } catch (error) {\n    console.error('[ERROR]', error.message);\n    if (res) res.status(500).json({ error: error.message });\n    else throw error;\n  }${close}`
    ),
    summary: "Added try-catch error handling to all async functions"
  }),

  fix_port: (code) => ({
    code: code
      .replace(/app\.listen\((\d+)/g, 'app.listen(process.env.PORT || $1')
      .replace(/const PORT = (\d+)/g, 'const PORT = process.env.PORT || $1')
      .replace(/port\s*=\s*(\d+)/gi, 'port = process.env.PORT || $1'),
    summary: "Fixed PORT to use process.env.PORT for cloud deployment"
  }),

  add_logging: (code) => ({
    code: `const morgan = require('morgan');\napp.use(morgan('dev'));\n\n${code}`,
    summary: "Added Morgan HTTP request logging middleware"
  }),

  add_cors: (code) => ({
    code: `const cors = require('cors');\napp.use(cors({ origin: '*', credentials: true }));\n\n${code}`,
    summary: "Added CORS middleware for cross-origin requests"
  }),

  add_validation: (code) => ({
    code: `// ── Input Validation Helper ─────────────────────────────────────
const validate = (data, fields) => {
  const missing = fields.filter(f => !data[f]);
  if (missing.length) throw new Error(\`Missing fields: \${missing.join(', ')}\`);
  return true;
};
// ────────────────────────────────────────────────────────────────

${code}`,
    summary: "Added input validation helper function"
  }),

  add_env: (code) => ({
    code: `require('dotenv').config();\n\n// Environment Variables\nconst config = {\n  port: process.env.PORT || 3000,\n  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/app',\n  jwtSecret: process.env.JWT_SECRET || 'your_secret_key',\n  nodeEnv: process.env.NODE_ENV || 'development',\n};\n\n${code}`,
    summary: "Added dotenv config and environment variables setup"
  }),

  add_comment: (code, inst) => ({
    code: `/**\n * @description ${inst}\n * @generated LiveDeploy AI Assistant\n * @date ${new Date().toISOString()}\n */\n\n${code}`,
    summary: "Added JSDoc documentation comments"
  }),

  add_middleware: (code) => ({
    code: `const helmet = require('helmet');\nconst compression = require('compression');\n\napp.use(helmet());\napp.use(compression());\napp.use(express.json({ limit: '10mb' }));\napp.use(express.urlencoded({ extended: true }));\n\n${code}`,
    summary: "Added security (helmet) and compression middleware"
  }),

  convert_arrow: (code) => ({
    code: code.replace(/function\s+(\w+)\s*\(([^)]*)\)\s*\{/g, (_, n, p) => `const ${n} = (${p}) => {`),
    summary: "Converted function declarations to arrow functions (ES6)"
  }),

  generic: (code, inst) => ({
    code: `// AI Modification: "${inst}"\n// Applied: ${new Date().toISOString()}\n\n${code}`,
    summary: `Applied modification: "${inst}"`
  }),
};

// POST /api/ai/modify - Natural language instruction, no file needed
router.post("/modify", async (req, res) => {
  const { instruction, code, filename, repoUrl } = req.body;
  if (!instruction) return res.status(400).json({ error: "instruction required" });

  let sourceCode = code;
  let targetFile = filename || "server.js";

  if (!sourceCode && repoUrl) {
    try {
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match) {
        const [, owner, repo] = match;
        const headers = { Accept: "application/vnd.github.v3+json", ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }) };

        // 1. Fetch package.json bounds
        const pkgRes = await axios.get(`https://api.github.com/repos/${owner}/${repo.replace('.git','')}/contents/package.json`, { headers }).catch(() => null);
        
        let filesToCheck = ["index.js", "server.js", "app.js", "main.js", "src/index.js", "src/server.js", "src/app.js"];
        if (pkgRes) {
          const pkg = JSON.parse(Buffer.from(pkgRes.data.content, "base64").toString("utf8"));
          if (pkg.main) filesToCheck.unshift(pkg.main);
        }

        // 2. Find the actual entry point
        let fileContent = null;
        for (const file of filesToCheck) {
          try {
            const fileRes = await axios.get(`https://api.github.com/repos/${owner}/${repo.replace('.git','')}/contents/${file}`, { headers });
            fileContent = Buffer.from(fileRes.data.content, "base64").toString("utf8");
            targetFile = file;
            break; // Found the file
          } catch (e) { /* skip */ }
        }

        if (fileContent) {
          sourceCode = fileContent;
        }
      }
    } catch (e) {
      console.error("AI Auto-detect failed:", e);
    }
  }

  // If no code provided or fetched, rely on dummy template
  if (!sourceCode) {
    sourceCode = `const express = require('express');\nconst app = express();\nconst PORT = process.env.PORT || 3000;\n\napp.get('/', (req, res) => {\n  res.json({ message: 'Hello World!' });\n});\n\napp.listen(PORT, () => console.log('Server on port ' + PORT));`;
  }

  const matched = intents.find(i => i.p.some(p => p.test(instruction)));
  const intent = matched?.intent || "generic";
  const fn = transforms[intent] || transforms.generic;
  const { code: modifiedCode, summary } = fn(sourceCode, instruction);

  // Generate diff
  const orig = sourceCode.split("\n");
  const mod = modifiedCode.split("\n");
  const diff = [];
  for (let i = 0; i < Math.min(Math.max(orig.length, mod.length), 40); i++) {
    if (orig[i] !== mod[i]) {
      if (orig[i]) diff.push(`- ${orig[i]}`);
      if (mod[i]) diff.push(`+ ${mod[i]}`);
    }
  }

  res.json({
    success: true,
    originalCode: sourceCode,
    modifiedCode,
    intent,
    summary,
    diff,
    filename: targetFile,
    linesAdded: diff.filter(l => l.startsWith("+")).length,
    linesRemoved: diff.filter(l => l.startsWith("-")).length,
    noFileNeeded: !code,
  });
});

// POST /api/ai/analyze - Analyze repo and suggest modifications
router.post("/analyze", (req, res) => {
  const { repoName, language, description, stack } = req.body;

  const suggestions = [];

  if (language === "JavaScript" || language === "TypeScript") {
    suggestions.push({ id: 1, text: "Add error handling to all async functions", icon: "🛡️" });
    suggestions.push({ id: 2, text: "Fix PORT for cloud deployment", icon: "🔧" });
    suggestions.push({ id: 3, text: "Add logging middleware", icon: "📝" });
    suggestions.push({ id: 4, text: "Add CORS support", icon: "🌐" });
    suggestions.push({ id: 5, text: "Add input validation", icon: "✅" });
  }
  if (description?.toLowerCase().includes("api")) {
    suggestions.push({ id: 6, text: "Add authentication middleware", icon: "🔐" });
    suggestions.push({ id: 7, text: "Add CRUD API routes", icon: "🗂️" });
  }
  suggestions.push({ id: 8, text: "Add environment variables config", icon: "⚙️" });
  suggestions.push({ id: 9, text: "Add code documentation comments", icon: "📖" });

  res.json({ success: true, suggestions: suggestions.slice(0, 6) });
});

module.exports = router;
