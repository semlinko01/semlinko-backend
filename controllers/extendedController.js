const db = require('../config/db');

// --- PORTFOLIO ---
exports.addPortfolioImage = async (req, res) => {
  const { artisan_id, image_url, caption } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO artisan_portfolio (artisan_id, image_url, caption) VALUES ($1, $2, $3) RETURNING *',
      [artisan_id, image_url, caption]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de l ajout de la photo.' });
  }
};

exports.getPortfolio = async (req, res) => {
  const { artisan_id } = req.params;
  try {
    const result = await db.query('SELECT * FROM artisan_portfolio WHERE artisan_id = $1 ORDER BY created_at DESC', [artisan_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération du portfolio.' });
  }
};

// --- DEMANDES DE DEVIS ---
exports.createQuoteRequest = async (req, res) => {
  const { client_id, title, description, category, city, budget_estimate } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO quote_requests (client_id, title, description, category, city, budget_estimate) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [client_id, title, description, category, city || 'Abomey-Calavi', budget_estimate]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la création de la demande de devis.' });
  }
};

exports.getQuoteRequests = async (req, res) => {
  const { category } = req.query;
  try {
    const result = await db.query(
      `SELECT q.*, u.full_name as client_name, u.phone_number 
       FROM quote_requests q 
       JOIN users u ON q.client_id = u.id 
       WHERE ($1::text IS NULL OR q.category = $1) AND q.status = 'open' 
       ORDER BY q.created_at DESC`,
      [category || null]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération des devis.' });
  }
};

// --- HISTORIQUE TRANSACTIONS ---
exports.getTransactionHistory = async (req, res) => {
  const { user_id } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM token_transactions WHERE user_id = $1 ORDER BY created_at DESC',
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération de l historique.' });
  }
};
