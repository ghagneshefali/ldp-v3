const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();
const users = [];

const makeToken = (id) => jwt.sign({ userId: id }, process.env.JWT_SECRET || "dev_secret", { expiresIn: "2h" });

router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: "All fields required" });
    if (users.find(u => u.email === email)) return res.status(409).json({ error: "Email already exists" });
    const hashed = await bcrypt.hash(password, 10);
    const user = { id: Date.now().toString(), username, email, password: hashed };
    users.push(user);
    res.status(201).json({ token: makeToken(user.id), user: { id: user.id, username, email } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    res.json({ token: makeToken(user.id), user: { id: user.id, username: user.username, email } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
