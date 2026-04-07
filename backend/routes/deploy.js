const express = require("express");
const { v4: uuidv4 } = require("uuid");
const deployService = require("../services/deployService");
const router = express.Router();
const axios = require("axios");
const AdmZip = require("adm-zip");

router.post("/trigger", async (req, res) => {
  const { repoUrl, repoName, branch = "main", modifications = [], renderApiKey } = req.body;
  if (!repoUrl) return res.status(400).json({ error: "repoUrl required" });
  try {
    const deployment = await deployService.triggerDeploy({
      deployId: uuidv4(),
      repoUrl,
      repoName: repoName || repoUrl.split("/").pop(),
      branch,
      modifications,
      renderApiKey,
    });
    res.status(201).json({ success: true, deployment });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/download", async (req, res) => {
  const { repoUrl, modifications = [] } = req.body;
  if (!repoUrl) return res.status(400).json({ error: "repoUrl required" });
  
  try {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return res.status(400).json({ error: "Invalid GitHub URL" });
    const [, owner, repo] = match;

    const headers = { 
      Accept: "application/vnd.github.v3+json", 
      ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }) 
    };

    // Download zipball from GitHub as arraybuffer
    const zipRes = await axios.get(`https://api.github.com/repos/${owner}/${repo.replace('.git', '')}/zipball`, {
      headers,
      responseType: "arraybuffer"
    });

    const zip = new AdmZip(zipRes.data);
    const zipEntries = zip.getEntries();
    
    // Find the root folder name inside the zip (GitHub adds a wrapper folder like owner-repo-sha)
    let rootFolder = "";
    if (zipEntries.length > 0) {
      rootFolder = zipEntries[0].entryName.split('/')[0] + "/";
    }

    // Apply modifications
    modifications.forEach(mod => {
      if (mod.modifiedCode && mod.filename) {
        // Find existing file to rewrite, or add new file
        const targetPath = rootFolder + mod.filename.replace(/^\/+/, '');
        const existingEntry = zip.getEntry(targetPath);
        if (existingEntry) {
          zip.updateFile(existingEntry, Buffer.from(mod.modifiedCode, 'utf8'));
        } else {
          zip.addFile(targetPath, Buffer.from(mod.modifiedCode, 'utf8'));
        }
      }
    });

    const outBuffer = zip.toBuffer();
    
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename=modified-${repo.replace('.git', '')}.zip`,
      'Content-Length': outBuffer.length
    });
    
    res.send(outBuffer);
  } catch (e) {
    console.error("ZIP Generation error:", e.response?.data?.message || e.message);
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});


router.get("/status/:id", (req, res) => {
  const s = deployService.getStatus(req.params.id);
  if (!s) return res.status(404).json({ error: "Not found" });
  res.json({ success: true, ...s });
});

router.get("/logs/:id", (req, res) => {
  const logs = deployService.getLogs(req.params.id);
  if (!logs) return res.status(404).json({ error: "Not found" });
  res.json({ success: true, logs });
});

router.get("/history", (req, res) => res.json({ success: true, deployments: deployService.getHistory() }));
router.delete("/:id", (req, res) => { deployService.removeDeployment(req.params.id); res.json({ success: true }); });

module.exports = router;
