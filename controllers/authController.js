const db = require('../config/db');

// Inscription (Client ou Artisan)
exports.register = async (req, res) => {
  const { full_name, phone_number, password, role, category, city, bio, hourly_rate } = req.body;

  try {
    // 1. Créer l'utilisateur
    const userRes = await db.query(
      `INSERT INTO users (full_name, phone_number, password, role, tokens_balance) 
       VALUES ($1, $2, $3, $4, 5) RETURNING id, full_name, phone_number, role, tokens_balance`,
      [full_name, phone_number, password, role || 'client']
    );

    const newUser = userRes.rows[0];

    // 2. Si c'est un artisan, créer son profil prestataire
    if (role === 'artisan') {
      await db.query(
        `INSERT INTO artisan_profiles (user_id, category, city, bio, hourly_rate) 
         VALUES ($1, $2, $3, $4, $5)`,
        [newUser.id, category, city, bio || '', hourly_rate || 0]
      );
    }

    res.status(201).json({ message: 'Inscription réussie !', user: newUser });
  } catch (error) {
    console.error(error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ce numéro de téléphone est déjà enregistré.' });
    }
    res.status(500).json({ error: 'Erreur lors de l enregistrement.' });
  }
};

// Connexion
exports.login = async (req, res) => {
  const { phone_number, password } = req.body;

  try {
    const result = await db.query(
      `SELECT id, full_name, phone_number, role, tokens_balance, password 
       FROM users WHERE phone_number = $1`,
      [phone_number]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    const user = result.rows[0];

    // Vérification simple du mot de passe
    if (user.password !== password) {
      return res.status(401).json({ error: 'Mot de passe incorrect.' });
    }

    delete user.password; // Ne pas renvoyer le mot de passe au client
    res.json({ message: 'Connexion réussie', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la connexion.' });
  }
};
