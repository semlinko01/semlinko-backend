const db = require('../config/db');

exports.getStats = async (req, res) => {
  try {
    const usersCount = await db.query('SELECT COUNT(*) FROM users');
    const artisansCount = await db.query("SELECT COUNT(*) FROM users WHERE role = 'artisan'");
    const productsCount = await db.query('SELECT COUNT(*) FROM marketplace_products');
    
    res.json({
      total_users: usersCount.rows[0].count,
      total_artisans: artisansCount.rows[0].count,
      total_products: productsCount.rows[0].count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur chargement stats admin.' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, COALESCE(full_name, 'Utilisateur') as full_name, phone_number, COALESCE(role, 'client') as role, COALESCE(tokens_balance, 0) as tokens_balance, COALESCE(is_sponsored, false) as is_sponsored FROM users ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur récupération utilisateurs.' });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'Utilisateur supprimé.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
};
