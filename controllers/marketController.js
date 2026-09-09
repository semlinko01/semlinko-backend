const db = require('../config/db');

exports.createProduct = async (req, res) => {
  const { seller_id, title, price_fcfa, category } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO products (seller_id, title, price_fcfa, category) VALUES ($1, $2, $3, $4) RETURNING *',
      [seller_id || 1, title, price_fcfa, category || 'Général']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la création de l annonce.' });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, u.full_name as seller_name, u.phone_number 
       FROM products p 
       JOIN users u ON p.seller_id = u.id 
       ORDER BY p.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la récupération des annonces.' });
  }
};
