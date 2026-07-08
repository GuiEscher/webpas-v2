const { test } = require('node:test');
const assert = require('node:assert');
const { isImportacaoInconsistente } = require('../utils/analise-helpers');

const diasValidos = new Set(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']);

test('turma normal NÃO é inconsistente', () => {
  const t = { diaDaSemana: 'Segunda', horarioInicio: '0800', horarioFim: '1000' };
  assert.strictEqual(isImportacaoInconsistente(t, diasValidos), false);
});

test('turma com dia corrompido ("false") é inconsistente', () => {
  const t = { diaDaSemana: 'false', horarioInicio: 'Segunda', horarioFim: '1600' };
  assert.strictEqual(isImportacaoInconsistente(t, diasValidos), true);
});

test('turma com horário não-numérico é inconsistente', () => {
  const t = { diaDaSemana: 'Segunda', horarioInicio: 'NaN', horarioFim: '1000' };
  assert.strictEqual(isImportacaoInconsistente(t, diasValidos), true);
});

test('turma com dia "N/A" é inconsistente', () => {
  const t = { diaDaSemana: 'N/A', horarioInicio: '0800', horarioFim: '1000' };
  assert.strictEqual(isImportacaoInconsistente(t, diasValidos), true);
});

test('horário atípico numérico (16-21h) NÃO é inconsistente (é outra categoria)', () => {
  const t = { diaDaSemana: 'Quinta', horarioInicio: '1600', horarioFim: '2100' };
  assert.strictEqual(isImportacaoInconsistente(t, diasValidos), false);
});

test('sem diasValidos (Set vazio) não marca por dia', () => {
  const t = { diaDaSemana: 'QualquerCoisa', horarioInicio: '0800', horarioFim: '1000' };
  assert.strictEqual(isImportacaoInconsistente(t, new Set()), false);
});
