const express = require("express");
const cors = require("cors");
const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const db = new Database(path.join(__dirname, "db.sqlite"));

// Initialize tables
db.prepare(
  `CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	email TEXT UNIQUE NOT NULL,
	password_hash TEXT NOT NULL,
	token TEXT
)`
).run();

db.prepare(
  `CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    client TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL,
    due_date TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
)`
).run();

// Mount routers from routes/
const { createUsersRouter, createAuthMiddleware } = require("./routes/users");
const createInvoicesRouter = require("./routes/invoices");

const authMiddleware = createAuthMiddleware(db);
const usersRouter = createUsersRouter(db, bcrypt, authMiddleware);
const invoicesRouter = createInvoicesRouter(db, authMiddleware);

app.use("/api", usersRouter);
app.use("/api", invoicesRouter);

// Fallback to index
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () =>
  console.log(`Server listening on http://localhost:${PORT}`)
);
