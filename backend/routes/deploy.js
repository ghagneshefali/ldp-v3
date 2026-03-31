const express = require("express");
const { v4: uuidv4 } = require("uuid");
const deployService = require("../services/deployService");
const router = express.Router();

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
