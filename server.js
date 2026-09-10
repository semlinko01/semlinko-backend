const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();

// Configuration de la base de données PostgreSQL avec SSL obligatoire pour Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Middleware CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Route explicite pour manifest.json
app.get('/manifest.json', (req, res) => {
  res.type('application/manifest+json');
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// Servir le dossier public
app.use(express.static(path.join(__dirname, 'public')));

// Route par défaut (fallback sur index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Serveur actif sur le port ${PORT}`));

