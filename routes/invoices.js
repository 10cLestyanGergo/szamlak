const express = require("express");

function createInvoicesRouter(db, authMiddleware) {
  const router = express.Router();

  router.get("/invoices", authMiddleware, (req, res) => {
    const rows = db
      .prepare("SELECT * FROM invoices WHERE user_id = ? ORDER BY id DESC")
      .all(req.user.id);
    res.json(rows);
  });

  router.post("/invoices", authMiddleware, (req, res) => {
    const { client, amount, status, due_date } = req.body;
    if (!client || amount == null || !status)
      return res.status(400).json({ error: "Missing fields" });
    const info = db
      .prepare(
        "INSERT INTO invoices (user_id, client, amount, status, due_date) VALUES (?, ?, ?, ?, ?)"
      )
      .run(req.user.id, client, amount, status, due_date || null);
    const invoice = db
      .prepare("SELECT * FROM invoices WHERE id = ?")
      .get(info.lastInsertRowid);
    res.json(invoice);
  });

  router.put("/invoices/:id", authMiddleware, (req, res) => {
    const id = Number(req.params.id);
    const { client, amount, status, due_date } = req.body;
    const existing = db
      .prepare("SELECT * FROM invoices WHERE id = ? AND user_id = ?")
      .get(id, req.user.id);
    if (!existing) return res.status(404).json({ error: "Invoice not found" });
    db.prepare(
      "UPDATE invoices SET client = ?, amount = ?, status = ?, due_date = ? WHERE id = ?"
    ).run(
      client || existing.client,
      amount != null ? amount : existing.amount,
      status || existing.status,
      due_date || existing.due_date,
      id
    );
    const updated = db.prepare("SELECT * FROM invoices WHERE id = ?").get(id);
    res.json(updated);
  });

  router.delete("/invoices/:id", authMiddleware, (req, res) => {
    const id = Number(req.params.id);
    const existing = db
      .prepare("SELECT * FROM invoices WHERE id = ? AND user_id = ?")
      .get(id, req.user.id);
    if (!existing) return res.status(404).json({ error: "Invoice not found" });
    db.prepare("DELETE FROM invoices WHERE id = ?").run(id);
    res.json({ success: true });
  });

  return router;
}

module.exports = createInvoicesRouter;
