/**
 * Helpers puros da análise de resultados. Testáveis sem mongoose.
 */
const { normalizarString } = require('./horario');

// Detecta turma com dados de importação inconsistentes (linha de CSV
// desalinhada por vírgula no nome): dia não é um dia válido OU horário não é
// numérico. `diasValidos` é um Set de dias normalizados (de config.dias).
function isImportacaoInconsistente(turma, diasValidos) {
  const diaOk =
    !diasValidos ||
    diasValidos.size === 0 ||
    diasValidos.has(normalizarString(turma.diaDaSemana || ''));
  const horaOk =
    /^\d+$/.test(String(turma.horarioInicio || '')) &&
    /^\d+$/.test(String(turma.horarioFim || ''));
  return !diaOk || !horaOk;
}

module.exports = { isImportacaoInconsistente };
