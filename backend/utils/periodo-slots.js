/**
 * Determina em qual período e slot(s) uma turma se encaixa, pelo horário.
 * Usado na alocação manual (salas-livres-turma / alocar-manual).
 * Puro e testável (recebe a config como argumento).
 */
const { formatarHorarioParaDB, gerarJanelaHorario } = require('./horario');

// Retorna { periodo, slots } com slots = [1], [2] ou [1,2]; ou null se o
// horário da turma não encaixar em nenhum período padrão.
function determinarPeriodoSlots(turma, config) {
  const periodos = (config && config.periodos) || ['Manhã', 'Tarde', 'Noite'];
  const ti = formatarHorarioParaDB(turma.horarioInicio);
  const tf = formatarHorarioParaDB(turma.horarioFim);
  const casa = (val, base) => gerarJanelaHorario(base).includes(val);
  for (const p of periodos) {
    const pc = config && config.horarios ? config.horarios[p] : null;
    if (!pc) continue;
    const h1i = formatarHorarioParaDB(pc['Início'].slot1);
    const h1f = formatarHorarioParaDB(pc['Fim'].slot1);
    const h2i = formatarHorarioParaDB(pc['Início'].slot2);
    const h2f = formatarHorarioParaDB(pc['Fim'].slot2);
    if (casa(ti, h1i) && casa(tf, h2f)) return { periodo: p, slots: [1, 2] };
    if (casa(ti, h1i) && casa(tf, h1f)) return { periodo: p, slots: [1] };
    if (casa(ti, h2i) && casa(tf, h2f)) return { periodo: p, slots: [2] };
  }
  return null;
}

module.exports = { determinarPeriodoSlots };
