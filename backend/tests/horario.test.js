const { test } = require('node:test');
const assert = require('node:assert');
const {
  normalizarString,
  formatarHorarioParaDB,
  gerarHorariosDentroSlot,
  gerarJanelaHorario,
} = require('../utils/horario');

test('normalizarString remove aspas e espaços (sem lowercase)', () => {
  assert.strictEqual(normalizarString("  'Segunda' "), 'Segunda');
  assert.strictEqual(normalizarString('"Manhã"'), 'Manhã');
  assert.strictEqual(normalizarString(''), '');
  assert.strictEqual(normalizarString(null), '');
  // NÃO faz lowercase (comportamento histórico)
  assert.strictEqual(normalizarString('Sorocaba'), 'Sorocaba');
});

test('formatarHorarioParaDB gera HHMM e preenche 3 dígitos', () => {
  assert.strictEqual(formatarHorarioParaDB('800'), '0800');
  assert.strictEqual(formatarHorarioParaDB('0800'), '0800');
  assert.strictEqual(formatarHorarioParaDB('14:00'), '1400');
  assert.strictEqual(formatarHorarioParaDB('1400'), '1400');
  assert.strictEqual(formatarHorarioParaDB(''), '');
});

test('gerarJanelaHorario inclui a base e variantes de 3 dígitos', () => {
  const j = gerarJanelaHorario('0800');
  assert.ok(j.includes('0800'));
  assert.ok(j.includes('800'), 'deve incluir variante de 3 dígitos');
  assert.ok(j.includes('0745'), 'deve incluir tolerância do mapa');
  // horário sem mapa: retorna ao menos a própria base
  const j2 = gerarJanelaHorario('0805');
  assert.ok(j2.includes('0805'));
});

test('gerarJanelaHorario vazio para entrada vazia', () => {
  assert.deepStrictEqual(gerarJanelaHorario(''), []);
  assert.deepStrictEqual(gerarJanelaHorario(null), []);
});

test('gerarHorariosDentroSlot cobre o intervalo do slot', () => {
  const dentro = gerarHorariosDentroSlot('1900', '2100');
  assert.ok(dentro.includes('2000'), 'turma 20h cabe no slot 19-21');
  assert.ok(dentro.includes('1900'));
  assert.ok(dentro.includes('2100'));
  // variante de 3 dígitos para horários < 1000
  const manha = gerarHorariosDentroSlot('0800', '1000');
  assert.ok(manha.includes('0900') && manha.includes('900'));
});
