const express = require('express');
const { Pool } = require('pg');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// SERVIR LES FICHIERS STATIQUES (Fix pour 'Cannot GET /')
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://u0_a187@localhost:5432/semlinko_db',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        phone_number VARCHAR(20) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'client',
        tokens_balance INT DEFAULT 5000,
        avatar_url TEXT,
        neighborhood VARCHAR(100),
        city VARCHAR(100) DEFAULT 'Abomey-Calavi',
        dark_mode BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS profiles (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(100),
        city VARCHAR(100),
        hourly_rate NUMERIC,
        bio TEXT
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        seller_id INT REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(150) NOT NULL,
        price_fcfa NUMERIC NOT NULL,
        category VARCHAR(100),
        image_url TEXT,
        is_featured BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS quotes (
        id SERIAL PRIMARY KEY,
        client_id INT REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(150) NOT NULL,
        description TEXT,
        budget_estimate NUMERIC,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ads (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(150) NOT NULL,
        description TEXT,
        contact_phone VARCHAR(50),
        banner_url TEXT,
        ad_type VARCHAR(50) DEFAULT 'standard',
        duration_days INT DEFAULT 7,
        cost_fcfa NUMERIC NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        reviewer_id INT REFERENCES users(id) ON DELETE CASCADE,
        target_user_id INT REFERENCES users(id) ON DELETE CASCADE,
        rating INT CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC(10, 2) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        network VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Base de données initialisée.');
  } catch (err) {
    console.error('❌ Erreur DB:', err);
  }
}
initDB();

/* ================= AUTHENTIFICATION ================= */

app.post('/api/auth/register', async (req, res) => {
  const { full_name, phone_number, password, role, avatar_url, category, city, neighborhood, hourly_rate, bio } = req.body;
  if (!full_name || !phone_number || !password) return res.status(400).json({ error: 'Champs requis.' });

  try {
    const userRes = await pool.query(
      `INSERT INTO users (full_name, phone_number, password, role, avatar_url, city, neighborhood, tokens_balance) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 5000) RETURNING id, full_name, phone_number, role, tokens_balance, avatar_url, city, neighborhood`,
      [full_name, phone_number, password, role || 'client', avatar_url || '', city || 'Abomey-Calavi', neighborhood || '']
    );
    const user = userRes.rows[0];

    if (role === 'artisan') {
      await pool.query(
        `INSERT INTO profiles (user_id, category, city, hourly_rate, bio) VALUES ($1, $2, $3, $4, $5)`,
        [user.id, category || '', city || 'Abomey-Calavi', hourly_rate || 0, bio || '']
      );
    }
    res.json({ message: 'Compte créé !', user });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Numéro déjà utilisé.' });
    res.status(500).json({ error: 'Erreur lors de l inscription.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { phone_number, password } = req.body;
  try {
    const userRes = await pool.query(`SELECT id, full_name, phone_number, role, tokens_balance, avatar_url, city, neighborhood, password FROM users WHERE phone_number = $1`, [phone_number]);
    if (userRes.rows.length === 0 || userRes.rows[0].password !== password) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }
    const user = userRes.rows[0];
    delete user.password;
    res.json({ message: 'Connexion réussie', user });
  } catch (err) { res.status(500).json({ error: 'Erreur lors de la connexion.' }); }
});

/* ================= MARKETPLACE & COMMISSIONS ================= */

app.get('/api/market/products', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.full_name as seller_name, u.phone_number as seller_phone 
      FROM products p 
      JOIN users u ON p.seller_id = u.id 
      WHERE p.status = 'available' 
      ORDER BY p.is_featured DESC, p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Erreur chargement produits.' }); }
});

app.post('/api/market/products', async (req, res) => {
  const { seller_id, title, price_fcfa, category, image_url, is_featured } = req.body;
  try {
    let cost = 0;
    if (is_featured) {
      cost = 1000;
      const userRes = await pool.query('SELECT tokens_balance FROM users WHERE id = $1', [seller_id]);
      if (userRes.rows.length === 0 || parseFloat(userRes.rows[0].tokens_balance) < cost) {
        return res.status(400).json({ error: 'Solde insuffisant pour l option "En Vedette" (1 000 FCFA requis).' });
      }
      await pool.query('UPDATE users SET tokens_balance = tokens_balance - $1 WHERE id = $2', [cost, seller_id]);
    }

    await pool.query(
      `INSERT INTO products (seller_id, title, price_fcfa, category, image_url, is_featured) VALUES ($1, $2, $3, $4, $5, $6)`,
      [seller_id, title, price_fcfa, category, image_url || '', is_featured || false]
    );

    const updatedUser = await pool.query('SELECT tokens_balance FROM users WHERE id = $1', [seller_id]);
    res.json({ message: 'Produit publié !', new_balance: updatedUser.rows[0].tokens_balance });
  } catch (err) { res.status(500).json({ error: 'Erreur lors de la publication.' }); }
});

app.post('/api/market/buy', async (req, res) => {
  const { buyer_id, product_id } = req.body;
  try {
    const prodRes = await pool.query('SELECT * FROM products WHERE id = $1 AND status = $2', [product_id, 'available']);
    if (prodRes.rows.length === 0) return res.status(404).json({ error: 'Produit non disponible.' });

    const product = prodRes.rows[0];
    const price = parseFloat(product.price_fcfa);
    const commission = price * 0.10;
    const sellerRevenue = price - commission;

    const buyerRes = await pool.query('SELECT tokens_balance FROM users WHERE id = $1', [buyer_id]);
    if (parseFloat(buyerRes.rows[0].tokens_balance) < price) {
      return res.status(400).json({ error: 'Solde insuffisant pour effectuer cet achat.' });
    }

    await pool.query('UPDATE users SET tokens_balance = tokens_balance - $1 WHERE id = $2', [price, buyer_id]);
    await pool.query('UPDATE users SET tokens_balance = tokens_balance + $1 WHERE id = $2', [sellerRevenue, product.seller_id]);
    await pool.query('UPDATE products SET status = $1 WHERE id = $2', ['sold', product_id]);

    const updatedBuyer = await pool.query('SELECT tokens_balance FROM users WHERE id = $1', [buyer_id]);
    res.json({ success: true, message: 'Achat réussi !', new_balance: updatedBuyer.rows[0].tokens_balance });
  } catch (err) { res.status(500).json({ error: 'Erreur transaction.' }); }
});

/* ================= RECHARGES & RETRAITS ================= */

app.post('/api/fedapay/create-transaction', async (req, res) => {
  const { amount, description, userId } = req.body;
  try {
    const FEDAPAY_SECRET_KEY = 'sk_sandbox_...';
    const response = await fetch('https://sandbox-api.fedapay.com/v1/transactions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: description || 'Recharge Solde SEMLINKO',
        amount: parseInt(amount),
        currency: { iso: 'XOF' },
        callback_url: 'http://localhost:5000/api/fedapay/callback',
        custom_metadata: { userId }
      })
    });

    const data = await response.json();
    if (data.v1) res.json({ success: true, transaction: data.v1 });
    else res.status(400).json({ success: false, error: data });
  } catch (error) { res.status(500).json({ error: 'Échec de la transaction FedaPay.' }); }
});

app.post('/api/withdrawals/request', async (req, res) => {
  const { userId, amount, phoneNumber, network } = req.body;
  try {
    const userRes = await pool.query('SELECT tokens_balance FROM users WHERE id = $1', [userId]);
    const currentBalance = parseFloat(userRes.rows[0]?.tokens_balance || 0);

    if (currentBalance < amount) return res.status(400).json({ error: 'Solde insuffisant.' });

    await pool.query('UPDATE users SET tokens_balance = tokens_balance - $1 WHERE id = $2', [amount, userId]);
    const withdrawal = await pool.query(
      `INSERT INTO withdrawal_requests (user_id, amount, phone_number, network) VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, amount, phoneNumber, network]
    );

    res.json({ success: true, message: 'Demande de retrait enregistrée.', withdrawal: withdrawal.rows[0] });
  } catch (error) { res.status(500).json({ error: 'Échec du retrait.' }); }
});

/* ================= AVIS & RECHERCHE GÉOLOCALISÉE ================= */

app.post('/api/reviews', async (req, res) => {
  const { reviewerId, targetUserId, rating, comment } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO reviews (reviewer_id, target_user_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *`,
      [reviewerId, targetUserId, rating, comment]
    );
    res.json({ success: true, review: result.rows[0] });
  } catch (error) { res.status(500).json({ error: 'Erreur enregistrement avis.' }); }
});

app.get('/api/reviews/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const reviews = await pool.query(
      `SELECT r.*, u.full_name AS reviewer_name FROM reviews r JOIN users u ON r.reviewer_id = u.id WHERE r.target_user_id = $1 ORDER BY r.created_at DESC`,
      [userId]
    );
    const stats = await pool.query(`SELECT AVG(rating)::NUMERIC(2,1) AS average_rating, COUNT(*) AS total_reviews FROM reviews WHERE target_user_id = $1`, [userId]);
    res.json({ success: true, averageRating: stats.rows[0].average_rating || 0, totalReviews: stats.rows[0].total_reviews || 0, reviews: reviews.rows });
  } catch (error) { res.status(500).json({ error: 'Erreur avis.' }); }
});

app.get('/api/profiles/search', async (req, res) => {
  const { category, city, neighborhood } = req.query;
  try {
    let query = `SELECT u.id, u.full_name, u.phone_number, u.avatar_url, u.neighborhood, u.city, p.category, p.hourly_rate, p.bio FROM users u JOIN profiles p ON u.id = p.user_id WHERE u.role = 'artisan'`;
    const params = [];
    if (category) { params.push(`%${category}%`); query += ` AND p.category ILIKE $${params.length}`; }
    if (city) { params.push(`%${city}%`); query += ` AND u.city ILIKE $${params.length}`; }
    if (neighborhood) { params.push(`%${neighborhood}%`); query += ` AND u.neighborhood ILIKE $${params.length}`; }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Erreur recherche.' }); }
});

/* ================= AUTRES ROUTES ================= */

app.post('/api/chat/unlock-private', async (req, res) => {
  const { user_id } = req.body;
  try {
    const userRes = await pool.query('SELECT tokens_balance FROM users WHERE id = $1', [user_id]);
    if (parseFloat(userRes.rows[0].tokens_balance) < 500) {
      return res.status(400).json({ error: 'Solde insuffisant (500 FCFA requis).' });
    }
    const updatedRes = await pool.query('UPDATE users SET tokens_balance = tokens_balance - 500 WHERE id = $1 RETURNING tokens_balance', [user_id]);
    res.json({ success: true, new_balance: updatedRes.rows[0].tokens_balance });
  } catch (err) { res.status(500).json({ error: 'Erreur transaction.' }); }
});

app.get('/api/ads', async (req, res) => {
  try {
    const result = await pool.query(`SELECT a.*, u.full_name as advertiser_name FROM ads a JOIN users u ON a.user_id = u.id WHERE a.status = 'active' ORDER BY a.created_at DESC`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Erreur pubs.' }); }
});

app.post('/api/ads', async (req, res) => {
  const { user_id, title, description, contact_phone, banner_url, ad_type, duration_days, cost_fcfa } = req.body;
  try {
    const cost = parseFloat(cost_fcfa);
    const userRes = await pool.query('SELECT tokens_balance FROM users WHERE id = $1', [user_id]);
    if (parseFloat(userRes.rows[0].tokens_balance) < cost) return res.status(400).json({ error: 'Solde insuffisant.' });

    const updatedUser = await pool.query('UPDATE users SET tokens_balance = tokens_balance - $1 WHERE id = $2 RETURNING tokens_balance', [cost, user_id]);
    await pool.query(`INSERT INTO ads (user_id, title, description, contact_phone, banner_url, ad_type, duration_days, cost_fcfa) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [user_id, title, description, contact_phone, banner_url || '', ad_type, duration_days, cost]);
    res.json({ message: 'Pub lancée !', new_balance: updatedUser.rows[0].tokens_balance });
  } catch (err) { res.status(500).json({ error: 'Erreur pub.' }); }
});

app.get('/api/ext/quotes', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM quotes ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Erreur devis.' }); }
});

app.post('/api/ext/quotes', async (req, res) => {
  const { client_id, title, description, budget_estimate } = req.body;
  try {
    await pool.query(`INSERT INTO quotes (client_id, title, description, budget_estimate) VALUES ($1, $2, $3, $4)`, [client_id, title, description, budget_estimate]);
    res.json({ message: 'Devis créé !' });
  } catch (err) { res.status(500).json({ error: 'Erreur devis.' }); }
});

app.get('/api/admin/stats', async (req, res) => {
  try {
    const u = await pool.query('SELECT COUNT(*) FROM users');
    const a = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'artisan'");
    const p = await pool.query('SELECT COUNT(*) FROM products');
    const ad = await pool.query('SELECT COUNT(*) FROM ads');
    res.json({ total_users: u.rows[0].count, total_artisans: a.rows[0].count, total_products: p.rows[0].count, total_ads: ad.rows[0].count });
  } catch (err) { res.status(500).json({ error: 'Erreur stats.' }); }
});

/* ================= SOCKET.IO ================= */

io.on('connection', (socket) => {
  socket.on('join_room', (room) => socket.join(room));
  socket.on('send_public_message', (data) => io.emit('receive_public_message', data));
  socket.on('send_private_message', (data) => io.to(data.room).emit('receive_private_message', data));
});

// Ecoute sur le port 5000
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Serveur SEMLINKO actif sur http://localhost:${PORT}`));
