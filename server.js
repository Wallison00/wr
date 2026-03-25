import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data.json');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Carregar dados
app.get('/api/data', (req, res) => {
  if (fs.existsSync(DATA_FILE)) {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    res.json(JSON.parse(data));
  } else {
    res.json([]);
  }
});

// Salvar dados
app.post('/api/data', (req, res) => {
  try {
    const data = JSON.stringify(req.body, null, 2);
    fs.writeFileSync(DATA_FILE, data, 'utf8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar o arquivo.' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});
