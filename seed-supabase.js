import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('URL ou Chave do Supabase não encontradas no .env!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
  const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
  console.log(`Enviando ${data.length} heróis para o Supabase...`);

  const { error } = await supabase.from('champions').upsert(data);

  if (error) {
    console.error('Erro ao subir dados:', error.message);
    if (error.message.includes('404')) {
        console.error('DICA: Verifique se você criou a tabela "champions" no SQL Editor do Supabase.');
    }
  } else {
    console.log('Sucesso! Banco de dados populado com imagens Base64.');
  }
}

seed();
