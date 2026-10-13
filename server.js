const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());

app.use(express.static('public', {
  maxAge: '1d',
  etag: true
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', game: 'Cosmic Survivor' });
});

app.listen(PORT, () => {
  console.log(`🚀 Cosmic Survivor running on port ${PORT}`);
  console.log(`🎮 Open: http://localhost:${PORT}`);
});