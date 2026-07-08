const { test } = require('node:test');
const assert = require('node:assert');
const { determinarPeriodoSlots } = require('../utils/periodo-slots');

// Config de exemplo com os três períodos padrão.
const config = {
  periodos: ['Manhã', 'Tarde', 'Noite'],
  horarios: {
    Manhã: { 'Início': { slot1: '0800', slot2: '1000' }, 'Fim': { slot1: '1000', slot2: '1200' } },
    Tarde: { 'Início': { slot1: '1400', slot2: '1600' }, 'Fim': { slot1: '1600', slot2: '1800' } },
    Noite: { 'Início': { slot1: '1900', slot2: '2100' }, 'Fim': { slot1: '2100', slot2: '2300' } },
  },
};

test('turma no primeiro slot da manhã -> slots [1]', () => {
  const r = determinarPeriodoSlots({ horarioInicio: '0800', horarioFim: '1000' }, config);
  assert.deepStrictEqual(r, { periodo: 'Manhã', slots: [1] });
});

test('turma no segundo slot da tarde -> slots [2]', () => {
  const r = determinarPeriodoSlots({ horarioInicio: '1600', horarioFim: '1800' }, config);
  assert.deepStrictEqual(r, { periodo: 'Tarde', slots: [2] });
});

test('turma de 4h contínuas (F12) -> slots [1,2]', () => {
  const r = determinarPeriodoSlots({ horarioInicio: '1400', horarioFim: '1800' }, config);
  assert.deepStrictEqual(r, { periodo: 'Tarde', slots: [1, 2] });
});

test('turma noturna com horário de 3 dígitos formata certo', () => {
  const r = determinarPeriodoSlots({ horarioInicio: '1900', horarioFim: '2100' }, config);
  assert.deepStrictEqual(r, { periodo: 'Noite', slots: [1] });
});

test('horário atípico (não encaixa em período) -> null', () => {
  const r = determinarPeriodoSlots({ horarioInicio: '1600', horarioFim: '2100' }, config);
  assert.strictEqual(r, null);
});

test('horário inválido (corrompido) -> null', () => {
  const r = determinarPeriodoSlots({ horarioInicio: 'NaN', horarioFim: 'Segunda' }, config);
  assert.strictEqual(r, null);
});
