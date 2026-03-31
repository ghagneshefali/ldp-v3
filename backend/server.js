require("dotenv").config({ path: __dirname + '/.env' });
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));

app.get("/", (req, res) => res.json({ status: "✅ LDP v3 API Running", version: "3.0.0" }));
app.get("/api/health", (req, res) => res.json({ status: "healthy", db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/github", require("./routes/github"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/deploy", require("./routes/deploy"));

app.use((req, res) => res.status(404).json({ error: `Route ${req.originalUrl} not found` }));
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

const start = async () => {
  try {
    if (process.env.MONGO_URI) {
      await mongoose.connect(process.env.MONGO_URI);
      console.log("✅ MongoDB connected");
    }
  } catch (e) {
    console.warn("⚠️ MongoDB unavailable — using memory store");
  }
  app.listen(PORT, () => {
    console.log(`\n🚀 LDP v3 Server running on http://localhost:${PORT}\n`);
  });
};

start();
module.exports = app;
