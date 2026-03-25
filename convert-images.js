import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

console.log('Iniciando conversão de imagens para Base64...');

if (!fs.existsSync(DATA_FILE)) {
  console.error('Arquivo data.json não encontrado!');
  process.exit(1);
}

let data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
let convertedCount = 0;

data = data.map(champ => {
  if (champ.image && champ.image.startsWith('/herois/')) {
    const imagePath = path.join(PUBLIC_DIR, champ.image);
    if (fs.existsSync(imagePath)) {
      try {
        const ext = path.extname(imagePath).replace('.', '');
        const base64Data = fs.readFileSync(imagePath, 'base64');
        const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/webp';
        champ.image = `data:${mimeType};base64,${base64Data}`;
        convertedCount++;
        console.log(`[Conversão]: ${champ.name} convertido com sucesso.`);
      } catch (err) {
        console.error(`Erro ao ler imagem de ${champ.name}:`, err.message);
      }
    } else {
      console.warn(`[Aviso]: Imagem não encontrada para ${champ.name}: ${imagePath}`);
    }
  }
  return champ;
});

// Sobrescrever o dataset com as imagens em Base64
fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');

console.log(`\nConversão concluída! ${convertedCount} imagens foram convertidas para Base64 no data.json.`);
console.log('Agora as imagens estão integradas no banco de dados, prontas para Vercel e Supabase.');
