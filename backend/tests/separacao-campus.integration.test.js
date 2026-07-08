/**
 * Teste de INTEGRAÇÃO da separação por campus no banco real.
 * - Usa um userId descartável (não toca dados reais) e limpa tudo no fim.
 * - Faz SKIP automático se não houver ATLAS_URI ou o cluster estiver fora.
 *
 * Prova que:
 *  1) O índice único novo permite MESMO prédio+sala em campi diferentes.
 *  2) Consultar por campusRegex separa corretamente São Carlos e Sorocaba.
 *  3) O mesmo vale para Distancia.
 */
require('dotenv').config();
const { test } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const { campusRegex } = require('../utils/campus');

const URI = process.env.ATLAS_URI;

async function tentarConectar() {
  if (!URI) return false;
  try {
    await mongoose.connect(URI, { serverSelectionTimeoutMS: 5000 });
    return true;
  } catch (e) {
    return false;
  }
}

test('separação de campus no banco (integração)', async (t) => {
  const conectou = await tentarConectar();
  if (!conectou) {
    t.skip('Sem ATLAS_URI ou cluster indisponível — pulando integração.');
    return;
  }

  const Sala = require('../models/sala.model');
  const Distancia = require('../models/distancia.model');
  const userId = new mongoose.Types.ObjectId(); // descartável

  try {
    await Sala.syncIndexes();
    await Distancia.syncIndexes();

    // 1) Mesmo prédio+sala em campi diferentes coexistem (índice inclui campus)
    await Sala.create({ predio: 'ZZ-TESTE', numeroSala: '1', capacidade: 10, campus: 'São Carlos', user: userId });
    await Sala.create({ predio: 'ZZ-TESTE', numeroSala: '1', capacidade: 10, campus: 'Sorocaba', user: userId });

    const total = await Sala.countDocuments({ user: userId });
    assert.strictEqual(total, 2, 'as duas salas (SC e Sorocaba) devem coexistir');

    // 2) campusRegex separa corretamente
    const sc = await Sala.countDocuments({ user: userId, campus: campusRegex('São Carlos') });
    const so = await Sala.countDocuments({ user: userId, campus: campusRegex('Sorocaba') });
    assert.strictEqual(sc, 1, 'deve haver 1 sala de São Carlos');
    assert.strictEqual(so, 1, 'deve haver 1 sala de Sorocaba');

    // 3) Distancia: mesma combinação prédio+departamento em campi diferentes
    await Distancia.create({ predio: 'ZZ-TESTE', departamento: 'DEP-X', valorDist: 100, campus: 'São Carlos', user: userId });
    await Distancia.create({ predio: 'ZZ-TESTE', departamento: 'DEP-X', valorDist: 200, campus: 'Sorocaba', user: userId });
    const dSc = await Distancia.countDocuments({ user: userId, campus: campusRegex('São Carlos') });
    const dSo = await Distancia.countDocuments({ user: userId, campus: campusRegex('Sorocaba') });
    assert.strictEqual(dSc, 1);
    assert.strictEqual(dSo, 1);
  } finally {
    // Limpeza total do usuário descartável
    await Sala.deleteMany({ user: userId });
    await Distancia.deleteMany({ user: userId });
    await mongoose.disconnect();
  }
});
