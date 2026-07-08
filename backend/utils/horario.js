/**
 * Helpers puros de horário/normalização usados pelo solver e pelas rotas.
 * Extraídos de dbtomodel.js SEM alteração de comportamento, para permitir
 * testes isolados (sem mongoose).
 */

// Normaliza strings removendo TODAS as aspas e espaços das pontas.
// (NÃO faz lowercase — comportamento histórico usado na comparação de dias.)
const normalizarString = (str) => {
  if (!str) return '';
  return String(str).replace(/['"]/g, '').trim();
};

// Formata horário para "HHMM" (sem ":"), preenchendo 3 dígitos (800 -> 0800).
const formatarHorarioParaDB = (horario) => {
  if (!horario) return '';
  let formatted = String(horario).replace(':', '');
  if (formatted.length === 3) {
    formatted = '0' + formatted;
  }
  return formatted;
};

// Gera todos os horários (formato "HHMM") entre inicioSlot e fimSlot, em passos
// de `passo` minutos, incluindo variantes de 3 dígitos. Usado para capturar
// turmas cujo horário "cabe dentro" de um slot padrão.
const gerarHorariosDentroSlot = (inicioSlot, fimSlot, passo = 5) => {
  if (!inicioSlot || !fimSlot) return [];
  const norm = (h) => (h.length === 3 ? '0' + h : h);
  const toMin = (h) => {
    const n = norm(h);
    return parseInt(n.substring(0, 2)) * 60 + parseInt(n.substring(2));
  };
  const fromMin = (m) => {
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    return String(hh * 100 + mm).padStart(4, '0');
  };
  const result = new Set();
  const startMin = toMin(inicioSlot);
  const endMin = toMin(fimSlot);
  for (let m = startMin; m <= endMin; m += passo) {
    const h4 = fromMin(m);
    result.add(h4);
    if (h4.startsWith('0')) result.add(h4.substring(1));
  }
  return [...result];
};

// Gera a janela de tolerância (±30 min etc.) em torno de um horário base.
const gerarJanelaHorario = (horarioBase) => {
  if (!horarioBase) return [];

  let base4 = horarioBase;
  if (base4.length === 3) base4 = '0' + base4;

  const variacoes = [base4];

  const mapaVariacoes = {
    // MANHÃ (08:00 - 12:00)
    '0800': ['0700', '0710', '0730', '0740', '0745', '0750', '0800', '0810', '0815', '0820', '0830'],
    1000: ['0900', '0910', '0930', '0940', '0950', '1000', '1010', '1020', '1030'],
    1200: ['1100', '1110', '1130', '1140', '1150', '1200', '1210', '1220', '1230', '1300'],
    // TARDE (14:00 - 18:00)
    1400: ['1300', '1310', '1330', '1340', '1350', '1400', '1410', '1420', '1430'],
    1600: ['1500', '1510', '1530', '1540', '1550', '1600', '1610', '1620', '1630'],
    1800: ['1700', '1710', '1730', '1740', '1750', '1800', '1810', '1820', '1830'],
    // NOITE (19:00 - 23:00)
    1900: ['1830', '1840', '1850', '1900', '1910', '1915', '1920', '1930'],
    2100: ['2030', '2040', '2050', '2100', '2110', '2120', '2130'],
    2300: ['2230', '2240', '2250', '2300', '2310', '2320'],
  };

  let listaBase = [];
  if (mapaVariacoes[base4]) {
    listaBase = [...new Set([...variacoes, ...mapaVariacoes[base4]])];
  } else {
    listaBase = variacoes;
  }

  const listaExpandida = [];
  listaBase.forEach((h) => {
    listaExpandida.push(h);
    if (h.startsWith('0')) {
      listaExpandida.push(h.substring(1));
    }
  });

  return [...new Set(listaExpandida)];
};

module.exports = {
  normalizarString,
  formatarHorarioParaDB,
  gerarHorariosDentroSlot,
  gerarJanelaHorario,
};
