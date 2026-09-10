const express = require('express');
const path = require('path');
const app = express();

// Middleware CORS pour autoriser PWABuilder à lire le fichier
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Route explicite avec bon type MIME pour manifest.json
app.get('/manifest.json', (req, res) => {
  res.type('application/manifest+json');
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// Servir le reste du dossier public
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route pour SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
