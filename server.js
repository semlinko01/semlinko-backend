const express = require('express');
const path = require('path');
const app = express();

// 1. Servir le manifest.json explicitement
app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// 2. Servir les autres fichiers statiques du dossier public
app.use(express.static(path.join(__dirname, 'public')));

// 3. Rediriger toutes les autres requêtes vers index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
