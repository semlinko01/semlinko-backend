const db = require('../config/db');

exports.addReview = async (req, res) => {
  const { reviewer_id, artisan_id, rating, comment } = req.body;
  try {
    await db.query(
      'INSERT INTO reviews (reviewer_id, artisan_id, rating, comment) VALUES ($1, $2, $3, $4)',
      [reviewer_id, artisan_id, rating, comment]
    );
    res.json({ message: 'Avis ajouté avec succès !' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de l ajout de l avis.' });
  }
};

exports.getArtisanReviews = async (req, res) => {
  const { artisan_id } = req.params;
  try {
    const result = await db.query(
      `SELECT r.*, u.full_name as reviewer_name 
       FROM reviews r 
       JOIN users u ON r.reviewer_id = u.id 
       WHERE r.artisan_id = $1 
       ORDER BY r.created_at DESC`,
      [artisan_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur récupération avis.' });
  }
};
