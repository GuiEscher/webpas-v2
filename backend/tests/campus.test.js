const { test } = require('node:test');
const assert = require('node:assert');
const { canonizarCampus, campusRegex, mesmoCampus } = require('../utils/campus');

test('canonizarCampus reduz aos dois campi canônicos', () => {
  assert.strictEqual(canonizarCampus('Sorocaba'), 'Sorocaba');
  assert.strictEqual(canonizarCampus('sorocaba'), 'Sorocaba');
  assert.strictEqual(canonizarCampus('SOROCABA'), 'Sorocaba');
  assert.strictEqual(canonizarCampus('São Carlos'), 'São Carlos');
  assert.strictEqual(canonizarCampus('sao carlos'), 'São Carlos');
  assert.strictEqual(canonizarCampus(''), 'São Carlos');
  assert.strictEqual(canonizarCampus(null), 'São Carlos');
  assert.strictEqual(canonizarCampus(undefined), 'São Carlos');
  // Qualquer valor desconhecido cai no default São Carlos
  assert.strictEqual(canonizarCampus('Outro'), 'São Carlos');
});

// REGRESSÃO: o bug era campusRegex('Sorocaba') retornar o regex de São Carlos
// porque a normalização não fazia lowercase. Estes testes travam esse caso.
test('campusRegex de Sorocaba casa Sorocaba e NÃO casa São Carlos', () => {
  const rx = campusRegex('Sorocaba');
  assert.ok(rx.test('Sorocaba'), 'deve casar "Sorocaba"');
  assert.ok(rx.test('sorocaba'), 'deve casar minúsculo');
  assert.ok(!rx.test('São Carlos'), 'NÃO deve casar São Carlos');
});

test('campusRegex de São Carlos casa variações e NÃO casa Sorocaba', () => {
  const rx = campusRegex('São Carlos');
  assert.ok(rx.test('São Carlos'));
  assert.ok(rx.test('SÃO CARLOS'));
  assert.ok(rx.test('Sao Carlos'));
  assert.ok(rx.test('saocarlos'));
  assert.ok(!rx.test('Sorocaba'));
});

test('campusRegex default (sem valor) é São Carlos', () => {
  assert.ok(campusRegex(undefined).test('São Carlos'));
  assert.ok(campusRegex(null).test('São Carlos'));
  assert.ok(campusRegex('').test('São Carlos'));
  assert.ok(!campusRegex(undefined).test('Sorocaba'));
});

test('campusRegex tolera aspas no valor', () => {
  assert.ok(campusRegex("'Sorocaba'").test('Sorocaba'));
});

test('mesmoCampus compara de forma robusta (caixa/acento/aspas)', () => {
  assert.ok(mesmoCampus('Sorocaba', 'sorocaba'));
  assert.ok(mesmoCampus('São Carlos', 'sao carlos'));
  assert.ok(mesmoCampus("'Sorocaba'", 'Sorocaba'));
  assert.ok(!mesmoCampus('Sorocaba', 'São Carlos'));
  // default: undefined é tratado como São Carlos
  assert.ok(mesmoCampus(undefined, 'São Carlos'));
  assert.ok(!mesmoCampus(undefined, 'Sorocaba'));
});
