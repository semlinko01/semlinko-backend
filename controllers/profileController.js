const db = require('../config/db');

exports.searchArtisans = async (req, res) => {
  const { category, city, latitude, longitude, radius_km = 20 } = req.query;
  try {
    let query;
    let params;

    if (latitude && longitude) {
      query = `
        SELECT u.id as user_id, u.full_name, u.phone_number, u.city, u.neighborhood, u.is_sponsored, u.is_verified,
               ST_Distance(u.location, ST_MakePoint($1, $2)::geography) / 1000 AS distance_km
        FROM users u
        WHERE ($3::text IS NULL OR u.category = $3)
          AND ($5::text IS NULL OR u.city ILIKE '%' || $5 || '%')
          AND ST_DWithin(u.location, ST_MakePoint($1, $2)::geography, $4 * 1000)
        ORDER BY u.is_sponsored DESC, distance_km ASC;
      `;
      params = [longitude, latitude, category || null, radius_km, city || null];
    } else {
      query = `
        SELECT u.id as user_id, u.full_name, u.phone_number, u.city, u.neighborhood, u.is_sponsored, u.is_verified, 0 AS distance_km
        FROM users u
        WHERE ($1::text IS NULL OR u.category = $1)
          AND ($2::text IS NULL OR u.city ILIKE '%' || $2 || '%')
        ORDER BY u.is_sponsored DESC, u.id DESC;
      `;
      params = [category || null, city || null];
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la recherche.' });
  }
};
