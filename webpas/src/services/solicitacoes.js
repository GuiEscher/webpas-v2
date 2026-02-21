/**
 * Serviço de Solicitações de Acessibilidade
 *
 * Gerencia solicitações especiais para turmas (ex: térreo, prancheta, QV, QB, lab, etc.)
 * As solicitações alteram o departamento da turma para um "departamento fake",
 * que através da distância menor no solver, prioriza a alocação adequada.
 *
 * Armazenamento local (localStorage) para que as solicitações persistam no navegador.
 * Ao aplicar, o departamentoTurma é alterado via API.
 */

import TurmasDataService from "./turmas";

// Tipos de solicitação de acessibilidade
export const TIPOS_SOLICITACAO = [
  {
    id: "terreo",
    label: "Térreo",
    prefixo: "TERREO",
    descricao: "Sala no térreo (acessibilidade para cadeirante)",
  },
  {
    id: "prancheta",
    label: "Prancheta",
    prefixo: "PRANCHETA",
    descricao: "Sala com prancheta de desenho",
  },
  {
    id: "qv",
    label: "Quadro Verde",
    prefixo: "QV",
    descricao: "Sala com quadro verde",
  },
  {
    id: "qb",
    label: "Quadro Branco",
    prefixo: "QB",
    descricao: "Sala com quadro branco",
  },
  {
    id: "lab",
    label: "Laboratório",
    prefixo: "LAB",
    descricao: "Sala de laboratório",
  },
  {
    id: "esp-norte",
    label: "Esp-Norte",
    prefixo: "NORTE",
    descricao: "Espaço norte do campus",
  },
  {
    id: "esp-sul",
    label: "Esp-Sul",
    prefixo: "SUL",
    descricao: "Espaço sul do campus",
  },
];

const STORAGE_KEY = "webpas_solicitacoes";

class SolicitacoesService {
  /**
   * Retorna todas as solicitações salvas
   * @returns {Array} Lista de solicitações
   */
  getAll() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Retorna solicitações filtradas por ano/semestre
   */
  getByAnoSemestre(ano, semestre) {
    return this.getAll().filter(
      (s) =>
        String(s.ano) === String(ano) &&
        String(s.semestre) === String(semestre),
    );
  }

  /**
   * Retorna solicitação de uma turma específica
   */
  getByTurmaId(turmaId) {
    return this.getAll().find((s) => s.turmaId === turmaId) || null;
  }

  /**
   * Adiciona ou atualiza uma solicitação para uma turma
   * @param {Object} turma - Dados da turma
   * @param {string} tipoSolicitacaoId - ID do tipo de solicitação (ex: 'terreo')
   */
  addSolicitacao(turma, tipoSolicitacaoId) {
    const tipo = TIPOS_SOLICITACAO.find((t) => t.id === tipoSolicitacaoId);
    if (!tipo)
      throw new Error(`Tipo de solicitação inválido: ${tipoSolicitacaoId}`);

    const solicitacoes = this.getAll();
    const existingIndex = solicitacoes.findIndex(
      (s) => s.turmaId === turma._id,
    );

    const departamentoOriginal = turma.solicitacao
      ? existingIndex >= 0
        ? solicitacoes[existingIndex].departamentoOriginal
        : turma.departamentoTurma
      : turma.departamentoTurma;

    // Limpa aspas do departamento original (CSV pode ter aspas embutidas)
    const departamentoOriginalLimpo = departamentoOriginal
      ? departamentoOriginal.replace(/['"]/g, "").trim()
      : departamentoOriginal;

    const departamentoFake = `${tipo.prefixo}-${departamentoOriginalLimpo}`;

    const novaSolicitacao = {
      turmaId: turma._id,
      idTurma: turma.idTurma,
      nomeDisciplina: turma.nomeDisciplina,
      turma: turma.turma,
      departamentoOriginal: departamentoOriginalLimpo,
      tipoSolicitacao: tipo.id,
      tipoSolicitacaoLabel: tipo.label,
      departamentoFake,
      ano: turma.ano,
      semestre: turma.semestre,
      campus: turma.campus,
      diaDaSemana: turma.diaDaSemana,
      horarioInicio: turma.horarioInicio,
      horarioFim: turma.horarioFim,
    };

    if (existingIndex >= 0) {
      solicitacoes[existingIndex] = novaSolicitacao;
    } else {
      solicitacoes.push(novaSolicitacao);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(solicitacoes));
    return novaSolicitacao;
  }

  /**
   * Remove a solicitação de uma turma
   */
  removeSolicitacao(turmaId) {
    const solicitacoes = this.getAll().filter((s) => s.turmaId !== turmaId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(solicitacoes));
  }

  /**
   * Remove todas as solicitações
   */
  removeAll() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Aplica a solicitação: atualiza o departamentoTurma no backend
   * @param {string} turmaId
   * @returns {Promise}
   */
  async aplicarSolicitacao(turmaId) {
    const solicitacao = this.getByTurmaId(turmaId);
    if (!solicitacao) throw new Error("Solicitação não encontrada");

    return TurmasDataService.updateTurma(turmaId, {
      departamentoTurma: solicitacao.departamentoFake,
      solicitacao: solicitacao.tipoSolicitacao,
      departamentoOriginal: solicitacao.departamentoOriginal,
    });
  }

  /**
   * Reverte a solicitação: restaura o departamentoTurma original
   * @param {string} turmaId
   * @returns {Promise}
   */
  async reverterSolicitacao(turmaId) {
    const solicitacao = this.getByTurmaId(turmaId);
    if (!solicitacao) throw new Error("Solicitação não encontrada");

    const result = await TurmasDataService.updateTurma(turmaId, {
      departamentoTurma: solicitacao.departamentoOriginal,
      solicitacao: null,
      departamentoOriginal: null,
    });

    this.removeSolicitacao(turmaId);
    return result;
  }

  /**
   * Aplica todas as solicitações pendentes de um semestre
   */
  async aplicarTodas(ano, semestre) {
    const solicitacoes = this.getByAnoSemestre(ano, semestre);
    const promises = solicitacoes.map((s) =>
      this.aplicarSolicitacao(s.turmaId),
    );
    return Promise.all(promises);
  }

  /**
   * Reverte todas as solicitações de um semestre
   */
  async reverterTodas(ano, semestre) {
    const solicitacoes = this.getByAnoSemestre(ano, semestre);
    const promises = solicitacoes.map((s) =>
      this.reverterSolicitacao(s.turmaId),
    );
    return Promise.all(promises);
  }
}

export default new SolicitacoesService();
