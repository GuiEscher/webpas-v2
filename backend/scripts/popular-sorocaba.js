/**
 * Script isolado para popular o campus SOROCABA no banco:
 *   - 31 salas (prédios AT-LAB, AT-1, AT-2, CCTS) com capacidade e tipoQuadro
 *   - distâncias ALEATÓRIAS (apenas para teste) entre cada prédio e cada
 *     departamento de Sorocaba (lidos do CSV de turmas)
 *
 * NÃO afeta São Carlos: todas as operações são escopadas por campus="Sorocaba".
 * É idempotente: remove salas/distâncias de Sorocaba do usuário antes de inserir.
 *
 * Uso:
 *   cd backend && node scripts/popular-sorocaba.js
 *
 * Opcional: caminho do CSV de turmas de Sorocaba (para extrair departamentos).
 *   CSV_SOROCABA="../webpas/sorocaba-files/Alocação_Sorocaba_2026_1(2).csv" node scripts/popular-sorocaba.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Sala = require('../models/sala.model');
const Distancia = require('../models/distancia.model');
const Config = require('../models/config.model');

const CAMPUS = 'Sorocaba';

// Salas do arquivo SALAS_CAPACIDADES_QUADROS.ods (prédio → [numeroSala, capacidade, quadro])
const SALAS = [
  // AT-LAB
  ['AT-LAB', '2', 80, 'Branco'], ['AT-LAB', '3', 50, 'Branco'], ['AT-LAB', '14', 50, 'Branco'],
  ['AT-LAB', '15', 80, 'Verde'], ['AT-LAB', '16', 80, 'Branco'], ['AT-LAB', '17', 90, 'Branco'],
  ['AT-LAB', '106', 50, 'Verde'], ['AT-LAB', '107', 90, 'Verde'], ['AT-LAB', '108', 80, 'Verde'],
  ['AT-LAB', '109', 60, 'Verde'], ['AT-LAB', '111', 70, 'Verde'], ['AT-LAB', '112', 70, 'Verde'],
  ['AT-LAB', '114', 60, 'Verde'], ['AT-LAB', '124-A', 40, 'Branco'],
  // AT-1
  ['AT-1', '7', 70, 'Branco'], ['AT-1', '8', 70, 'Verde'], ['AT-1', '9', 70, 'Verde'],
  // AT-2
  ['AT-2', '1', 60, 'Verde'], ['AT-2', '2', 60, 'Branco'], ['AT-2', '101', 60, 'Verde'],
  ['AT-2', '102', 60, 'Verde'], ['AT-2', '103', 60, 'Verde'], ['AT-2', '104', 60, 'Branco'],
  ['AT-2', '110', 60, 'Branco'], ['AT-2', '111', 60, 'Branco'], ['AT-2', '210', 100, 'Branco'],
  // CCTS
  ['CCTS', '1003', 35, 'Verde'], ['CCTS', '1006', 35, 'Branco'], ['CCTS', '1007', 15, 'Branco'],
  ['CCTS', '1008', 33, 'Branco'], ['CCTS', '1009', 33, 'Verde'],
];

const PREDIOS = [...new Set(SALAS.map((s) => s[0]))];

const CSV_PATH =
  process.env.CSV_SOROCABA ||
  path.resolve(__dirname, '../../webpas/sorocaba-files/Alocação_Sorocaba_2026_1(2).csv');

// Lê os departamentos distintos do CSV de turmas de Sorocaba (coluna "departamento").
function lerDepartamentosDoCsv() {
  if (!fs.existsSync(CSV_PATH)) {
    console.warn(`[aviso] CSV não encontrado em ${CSV_PATH}. Sem distâncias.`);
    return [];
  }
  const linhas = fs.readFileSync(CSV_PATH, 'utf8').split(/\r?\n/);
  const header = linhas[0].split(',').map((h) => h.trim());
  const idx = header.indexOf('departamento');
  if (idx === -1) return [];
  const set = new Set();
  for (let i = 1; i < linhas.length; i++) {
    if (!linhas[i].trim()) continue;
    const cols = linhas[i].split(',');
    const dep = (cols[idx] || '').trim();
    if (dep && dep !== '(null)') set.add(dep);
  }
  return [...set];
}

function distanciaAleatoria() {
  // valor de teste entre 100 e 2000 (o solver usa para preferir prédio perto)
  return Math.floor(Math.random() * 1901) + 100;
}

(async () => {
  await mongoose.connect(process.env.ATLAS_URI, { useNewUrlParser: true });

  // Descobre o usuário dono da base (login único). Usa o dono das salas atuais.
  const algumaSala = await Sala.findOne();
  const config = await Config.findOne(algumaSala ? { user: algumaSala.user } : {});
  if (!config) {
    console.error('Nenhuma Config encontrada — não sei de qual usuário popular.');
    process.exit(1);
  }
  const userId = config.user;
  const dias = config.dias || ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
  const periodos = config.periodos || ['Manhã', 'Tarde', 'Noite'];
  console.log(`Usuário: ${userId} | dias: ${dias.length} | períodos: ${periodos.length}`);

  // Disponibilidade: todas as salas disponíveis em todos os dias/períodos.
  const disponibilidade = [];
  dias.forEach((dia) => periodos.forEach((periodo) =>
    disponibilidade.push({ dia, periodo, disponivel: true })));

  // --- SALAS (idempotente) ---
  await Sala.deleteMany({ user: userId, campus: CAMPUS });
  const salasDocs = SALAS.map(([predio, numeroSala, capacidade, quadro]) => ({
    predio,
    numeroSala,
    capacidade,
    tipoQuadro: quadro,
    campus: CAMPUS,
    disponibilidade,
    terreo: false,
    acessivel: false,
    user: userId,
  }));
  const salasInseridas = await Sala.insertMany(salasDocs);
  console.log(`Salas de Sorocaba inseridas: ${salasInseridas.length}`);

  // --- DISTÂNCIAS ALEATÓRIAS (idempotente) ---
  const departamentos = lerDepartamentosDoCsv();
  console.log(`Departamentos de Sorocaba (do CSV): ${departamentos.length} -> ${departamentos.join(', ')}`);
  await Distancia.deleteMany({ user: userId, campus: CAMPUS });
  const distDocs = [];
  PREDIOS.forEach((predio) =>
    departamentos.forEach((departamento) =>
      distDocs.push({ predio, departamento, valorDist: distanciaAleatoria(), campus: CAMPUS, user: userId })));
  if (distDocs.length > 0) {
    const distInseridas = await Distancia.insertMany(distDocs);
    console.log(`Distâncias de Sorocaba inseridas: ${distInseridas.length} (${PREDIOS.length} prédios × ${departamentos.length} deptos)`);
  }

  // Conferência
  const salasPorCampus = await Sala.aggregate([{ $group: { _id: '$campus', n: { $sum: 1 } } }]);
  const distPorCampus = await Distancia.aggregate([{ $group: { _id: '$campus', n: { $sum: 1 } } }]);
  console.log('Salas por campus:', JSON.stringify(salasPorCampus));
  console.log('Distâncias por campus:', JSON.stringify(distPorCampus));

  await mongoose.disconnect();
  console.log('Concluído.');
  process.exit(0);
})().catch((e) => { console.error('ERRO:', e); process.exit(1); });
