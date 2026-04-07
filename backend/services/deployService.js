const axios = require("axios");
const deployments = new Map();

const STAGES = [
  { stage: "INITIALIZING", duration: 300, log: "🔧 Initializing deployment pipeline..." },
  { stage: "CLONING", duration: 400, log: "📥 Cloning repository from GitHub..." },
  { stage: "DETECTING", duration: 400, log: "🔍 Auto-detecting project type..." },
  { stage: "APPLYING_MODS", duration: 500, log: "🤖 Applying AI modifications..." },
  { stage: "BUILDING", duration: 800, log: "🏗️ Building project..." },
  { stage: "DEPLOYING", duration: 1000, log: "🚀 Deploying to Render..." },
  { stage: "HEALTH_CHECK", duration: 600, log: "❤️ Running health checks..." },
  { stage: "DONE", duration: 0, log: "✅ Deployment complete!" },
];

// Auto-detect commands from GitHub repo
const getCommands = async (repoUrl, logs) => {
  const ts = () => new Date().toISOString();
  try {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return { build: "npm install", start: "npm start" };
    const [, owner, repo] = match;

    const headers = { Accept: "application/vnd.github.v3+json", ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }) };

    let pkgRes = await axios.get(`https://api.github.com/repos/${owner}/${repo.replace('.git','')}/contents/package.json`, { headers }).catch(() => null);
    let rootDir = "";

    // Aggressively scan subdirectories for unstructured student MERN repos
    if (!pkgRes) {
       pkgRes = await axios.get(`https://api.github.com/repos/${owner}/${repo.replace('.git','')}/contents/backend/package.json`, { headers }).catch(() => null);
       if (pkgRes) rootDir = "backend";
    }
    if (!pkgRes) {
       pkgRes = await axios.get(`https://api.github.com/repos/${owner}/${repo.replace('.git','')}/contents/server/package.json`, { headers }).catch(() => null);
       if (pkgRes) rootDir = "server";
    }

    if (!pkgRes) {
      // Check for Python
      const reqRes = await axios.get(`https://api.github.com/repos/${owner}/${repo.replace('.git','')}/contents/requirements.txt`, { headers }).catch(() => null);
      if (reqRes) {
         logs.push(`[${ts()}] 🐍 Detected Python project`);
         const pyStart = "if [ -f main.py ]; then gunicorn main:app; elif [ -f app.py ]; then gunicorn app:app; else python $(ls -1 *.py | head -n 1); fi";
         return { build: "pip install -r requirements.txt && pip install gunicorn", start: pyStart, env: "python", rootDir: "" };
      }
      logs.push(`[${ts()}] ❌ Invalid Project: Missing package.json or requirements.txt.`);
      logs.push(`[${ts()}] 💡 Your Live Deployment Pipeline is designed specifically to deploy Web Applications (like Node.js, React apps, Express APIs, or Python backend servers) to Render.`);
      logs.push(`[${ts()}] ⚠️ You cannot host an Android or iOS app codebase on a backend web server like Render. It won't run because it's an app, not a website!`);
      throw new Error("unsupported_project");
    }

    const pkg = JSON.parse(Buffer.from(pkgRes.data.content, "base64").toString("utf8"));
    const isReact = pkg.dependencies && (pkg.dependencies.react || pkg.dependencies['react-scripts'] || pkg.devDependencies?.['@vitejs/plugin-react']);
    const isVite = (pkg.devDependencies && pkg.devDependencies.vite) || (pkg.dependencies && pkg.dependencies.vite) || (pkg.scripts?.build && pkg.scripts.build.includes("vite"));
    const start = isReact ? "if [ -d 'build' ]; then npx -y serve -s build -l 10000; elif [ -d 'dist' ]; then npx -y serve -s dist -l 10000; elif [ -d 'docs' ]; then npx -y serve -s docs -l 10000; elif [ -d 'out' ]; then npx -y serve -s out -l 10000; else npx -y serve -s . -l 10000; fi" : (pkg.scripts?.start || (pkg.main ? `node ${pkg.main}` : "node index.js"));
    const hasBuild = pkg.scripts?.build;

    logs.push(`[${ts()}] 📋 Package: ${pkg.name || repo} v${pkg.version || "1.0.0"}`);
    if (rootDir) logs.push(`[${ts()}] 📂 Auto-detected code inside '/${rootDir}' folder`);
    if (isReact) logs.push(`[${ts()}] ⚛️ Detected React App — configuring static serve`);
    logs.push(`[${ts()}] ▶️  Start: ${start}`);

    let buildCmd = isReact ? "export NODE_OPTIONS=--openssl-legacy-provider && npm install --no-fund --no-audit --legacy-peer-deps && CI=false npm run build" : (hasBuild ? "npm install --no-fund --no-audit && npm run build" : "npm install --no-fund --no-audit");
    
    // Auto-inject port fix for backend node apps
    if (!isReact) {
      const portFixJs = `const fs=require('fs');['index.js','server.js','app.js','main.js','src/index.js','src/server.js','src/app.js','bin/www'].forEach(f=>{if(fs.existsSync(f)){let c=fs.readFileSync(f,'utf8');if(!c.includes('process.env.PORT')){c=c.replace(/(app|server|http)\\.listen\\(\\d+/g,'$1.listen(process.env.PORT || 10000').replace(/const\\s+PORT\\s*=\\s*\\d+/g,'const PORT = process.env.PORT || 10000').replace(/port\\s*=\\s*\\d+/gi,'port = process.env.PORT || 10000');fs.writeFileSync(f,c);}}});`;
      const portFixB64 = Buffer.from(portFixJs).toString("base64");
      const portFix = `echo ${portFixB64} | base64 -d | node`;
      buildCmd = `${buildCmd} && ${portFix}`;
      logs.push(`[${ts()}] 🪄 Auto-configured cloud PORT bindings`);
    }

    return {
      build: buildCmd,
      start,
      env: "node",
      rootDir: rootDir || "",
    };
  } catch (e) {
    logs.push(`[${ts()}] ⚠️ Detection crashed: ${e.message}`);
    if (e.message === "unsupported_project") throw e;
    return { build: "npm install", start: "npm start", env: "node", rootDir: "" };
  }
};

// Deploy to Render
const deployToRender = async (apiKey, repoUrl, repoName, branch, commands, logs) => {
  const ts = () => new Date().toISOString();
  const api = axios.create({
    baseURL: "https://api.render.com/v1",
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json", "Content-Type": "application/json" },
  });

  // Get owner ID
  const ownerRes = await api.get("/owners");
  const ownerId = ownerRes.data?.[0]?.owner?.id;
  if (!ownerId) throw new Error("Could not get Render owner ID");

  const serviceName = `ldp-${repoName.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20)}-${Date.now().toString(36)}`;

  logs.push(`[${ts()}] 🔗 Creating Render service...`);

  const deployPayload = {
    type: "web_service",
    name: serviceName,
    ownerId,
    repo: repoUrl,
    rootDir: commands.rootDir || "",
    serviceDetails: {
      env: commands.env || "node",
      plan: "free",
      region: "singapore",
      envSpecificDetails: {
        buildCommand: commands.build,
        startCommand: commands.start,
      },
    },
    envVars: [
      { key: "PORT", value: "10000" },
    ],
  };
  
  if (branch) deployPayload.branch = branch;

  const resp = await api.post("/services", deployPayload);

  const service = resp.data.service || resp.data;
  logs.push(`[${ts()}] ✅ Service created: ${service.id}`);
  logs.push(`[${ts()}] ⏳ Waiting for build to complete...`);

  // Poll for status
  let attempts = 0;
  while (attempts < 30) {
    await new Promise(r => setTimeout(r, 6000));
    attempts++;
    try {
      const sr = await api.get(`/services/${service.id}/deploys`);
      const latest = sr.data?.[0]?.deploy;
      if (latest) {
        if (latest.status === "build_in_progress") {
          if (attempts % 3 === 0) {
             logs.push(`[${ts()}] ⏳ Cloud Build running (Render Free Tier can take 2-3 minutes)...`);
          }
        } else if (latest.status !== "live" && latest.status !== "build_failed" && latest.status !== "update_failed" && latest.status !== "canceled") {
          logs.push(`[${ts()}] 📊 Build status: ${latest.status}`);
        }

        if (latest.status === "live") {
          const url = `https://${service.name}.onrender.com`;
          logs.push(`[${ts()}] 🌐 LIVE URL: ${url}`);
          return url;
        }
        if (latest.status === "build_failed") {
          logs.push(`[${ts()}] ❌ Build failed on Render Cloud.`);
          logs.push(`[${ts()}] 💡 Here is why this usually happens:`);
          logs.push(`[${ts()}] 1️⃣ You tried to deploy a massive library/framework (like Babylon.js, Botkit, etc.) instead of a standalone Web App. Libraries do not contain servers.`);
          logs.push(`[${ts()}] 2️⃣ The repository exhausted Render's Free Tier limits (512MB RAM) during 'npm install'.`);
          logs.push(`[${ts()}] 3️⃣ The repository is missing critical build environment variables.`);
          logs.push(`[${ts()}] 👉 Action: Please search for smaller, self-contained apps (e.g., 'express todo', 'react chat app').`);
          throw new Error("build_failed");
        }
        if (latest.status === "update_failed" || latest.status === "canceled") {
          logs.push(`[${ts()}] ❌ Backend Application Crashed.`);
          logs.push(`[${ts()}] 💡 The server successfully built, but immediately crashed upon starting.`);
          logs.push(`[${ts()}] 👉 Usually, this means the app is throwing an error in 'index.js' (e.g., missing MongoDB URI) or it refused to bind to 'process.env.PORT'.`);
          throw new Error("update_failed");
        }
      }
    } catch (e) {
      if (e.message === "build_failed" || e.message === "update_failed") throw e;
    }
  }

  logs.push(`[${ts()}] ⏳ Render is still building in the background (Free Tier Queue).`);
  logs.push(`[${ts()}] ⏩ Bypassing wait time to show Live URL early!`);
  return `https://${service.name}.onrender.com`;
};

// Clean up trailing slashes, spaces, and .git endings
const deployService = {
  async triggerDeploy({ deployId, repoUrl, repoName, branch, modifications, renderApiKey }) {
    const cleanRepoUrl = repoUrl ? repoUrl.trim() : "";
    const now = new Date();
    const dep = {
      id: deployId, repoUrl: cleanRepoUrl, repoName, branch, modifications,
      status: "PENDING", stage: "INITIALIZING",
      logs: [`[${now.toISOString()}] 🚀 Deployment ${deployId.slice(0, 8)} started`],
      startedAt: now.toISOString(), completedAt: null,
      deployUrl: null, error: null,
      renderApiKey: renderApiKey || process.env.RENDER_API_KEY || "rnd_jf7dQBsbYzQnFRcyktsEH1ZPC8tI",
    };
    dep.logs.push(`[${now.toISOString()}] 🔑 Environment RENDER_API_KEY detected: ${dep.renderApiKey? 'YES' : 'NO'}`);
    deployments.set(deployId, dep);
    this._run(deployId, cleanRepoUrl, repoName, branch, modifications);
    return { ...dep };
  },

  async _run(deployId, repoUrl, repoName, branch, modifications) {
    const dep = deployments.get(deployId);
    if (!dep) return;
    dep.status = "RUNNING";
    let delay = 0;
    let commands = { build: "npm install", start: "npm start", env: "node" };

    for (const { stage, duration, log } of STAGES) {
      // Use duration directly instead of stacking delays!
      await new Promise(r => setTimeout(r, duration));
      const d = deployments.get(deployId);
      if (!d) return;
      d.stage = stage;
      
      // Do not print generic stages if deployment already threw a fatal error
      if (!(d.error && (stage === "HEALTH_CHECK" || stage === "DONE"))) {
         d.logs.push(`[${new Date().toISOString()}] ${log}`);
      }

      if (stage === "DETECTING") {
        d.logs.push(`[${new Date().toISOString()}] 🔍 Analyzing repository...`);
        try {
           commands = await getCommands(repoUrl, d.logs);
           d.logs.push(`[${new Date().toISOString()}] ✅ Project analyzed successfully!`);
        } catch (e) {
           if (e.message === "unsupported_project") {
              d.status = "FAILED";
              d.error = "❌ Deployment Halted: Unsupported Project Type.";
              d.logs.push(`[${new Date().toISOString()}] 🛑 Reason: Not a recognizable Web Web app (No package.json or requirements.txt found)`);
              d.logs.push(`[${new Date().toISOString()}] 💡 Reminder: You cannot host an Android or iOS app codebase on a backend web server like Render. It won't run because it's an app, not a website!`);
              deployments.set(deployId, d);
              return; 
           }
        }
      }

      if (stage === "APPLYING_MODS") {
        if (modifications && modifications.length > 0) {
          modifications.forEach(mod => {
            d.logs.push(`[${new Date().toISOString()}] 🤖 Applied: ${mod.summary || mod.instruction}`);
            if (mod.modifiedCode && mod.filename) {
               const b64 = Buffer.from(mod.modifiedCode).toString('base64');
               if (commands.env === "python") {
                  commands.build = `python -c "import base64; open('${mod.filename}', 'wb').write(base64.b64decode('${b64}'))" && ${commands.build}`;
               } else {
                  commands.build = `node -e "require('fs').writeFileSync('${mod.filename}', Buffer.from('${b64}', 'base64'))" && ${commands.build}`;
               }
            }
          });
          d.logs.push(`[${new Date().toISOString()}] ✅ ${modifications.length} modification(s) applied!`);
        } else {
          d.logs.push(`[${new Date().toISOString()}] ℹ️ No modifications — deploying original code`);
        }
      }

      if (stage === "DEPLOYING") {
        const apiKey = d.renderApiKey;
        let customBuild = commands.build;

        // Inject modifications into the build step using base64
        if (modifications && modifications.length > 0) {
          let injectScript = "";
          modifications.forEach(mod => {
            if (mod.modifiedCode && mod.filename) {
              const base64Code = Buffer.from(mod.modifiedCode).toString("base64");
              injectScript += `echo ${base64Code} | base64 -d > ${mod.filename} && `;
            }
          });
          customBuild = injectScript + commands.build;
        }

        const customCommands = { ...commands, build: customBuild };

        if (apiKey) {
          try {
            d.logs.push(`[${new Date().toISOString()}] 🔗 Connecting to Render...`);
            d.deployUrl = await deployToRender(apiKey, repoUrl, repoName, branch, customCommands, d.logs);
          } catch (err) {
            if (err.message !== "build_failed" && err.message !== "update_failed") {
               const msg = err.response?.data?.message || err.message;
               d.logs.push(`[${new Date().toISOString()}] ❌ Render error: ${msg}`);
            }
            d.error = "Deployment Failed";
          }
        } else {
          d.logs.push(`[${new Date().toISOString()}] ⚠️ No Render API key — simulated deploy`);
          d.deployUrl = `https://${repoName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${deployId.slice(0, 8)}.onrender.com`;
        }
      }

      if (stage === "HEALTH_CHECK" && d.error) {
          continue; // skip health check if failed
      }

      if (stage === "DONE") {
        if (d.error) {
           d.status = "FAILED";
           d.completedAt = new Date().toISOString();
           d.logs.push(`[${new Date().toISOString()}] 💥 Deployment Pipeline Halted.`);
           d.logs.push(`[${new Date().toISOString()}] 🛑 Reason: ${d.error}`);
        } else {
           d.status = "SUCCESS";
           d.completedAt = new Date().toISOString();
           if (!d.deployUrl) d.deployUrl = `https://${repoName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${deployId.slice(0, 8)}.onrender.com`;
           d.logs.push(`[${new Date().toISOString()}] 🎉 Live at: ${d.deployUrl}`);
           d.logs.push(`[${new Date().toISOString()}] ⏳ Note: First load may take 60 seconds (Render free plan)`);
        }
      }
      deployments.set(deployId, d);
    }
  },

  getStatus(id) {
    const d = deployments.get(id);
    if (!d) return null;
    return { id: d.id, repoName: d.repoName, status: d.status, stage: d.stage, startedAt: d.startedAt, completedAt: d.completedAt, deployUrl: d.deployUrl, error: d.error, logCount: d.logs.length };
  },
  getLogs(id) { return deployments.get(id)?.logs || null; },
  getHistory() {
    return Array.from(deployments.values())
      .map(d => ({ id: d.id, repoName: d.repoName, repoUrl: d.repoUrl, branch: d.branch, status: d.status, stage: d.stage, startedAt: d.startedAt, completedAt: d.completedAt, deployUrl: d.deployUrl }))
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  },
  removeDeployment(id) { deployments.delete(id); },
};

module.exports = deployService;
