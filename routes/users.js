const express = require("express");
const crypto = require("crypto");

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function createUsersRouter(db, bcrypt, authMiddleware) {
  const router = express.Router();

  router.post("/register", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });
    try {
      const hash = await bcrypt.hash(password, 10);
      const info = db
        .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
        .run(email, hash);
      const user = { id: info.lastInsertRowid, email };
      res.json({ user });
    } catch (err) {
      if (err && err.code === "SQLITE_CONSTRAINT_UNIQUE")
        return res.status(400).json({ error: "Email already registered" });
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });
    const row = db
      .prepare("SELECT id, password_hash FROM users WHERE email = ?")
      .get(email);
    if (!row) return res.status(400).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });
    const token = generateToken();
    db.prepare("UPDATE users SET token = ? WHERE id = ?").run(token, row.id);
    res.json({ token, user: { id: row.id, email } });
  });

  // current user
  if (authMiddleware) {
    router.get("/me", authMiddleware, (req, res) => {
      res.json({ user: req.user });
    });
  }

  return router;
}

function createAuthMiddleware(db) {
  return (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer "))
      return res.status(401).json({ error: "Missing token" });
    const token = auth.slice(7);
    const user = db
      .prepare("SELECT id, email FROM users WHERE token = ?")
      .get(token);
    if (!user) return res.status(401).json({ error: "Invalid token" });
    req.user = user;
    next();
  };
}

module.exports = { createUsersRouter, createAuthMiddleware };
