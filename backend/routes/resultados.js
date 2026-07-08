const router = require('express').Router()
let Resultado = require('../models/resultado.model')
const { dbtomodel, gerarJanelaHorario, formatarHorarioParaDB, normalizarString } = require('../solver-logic/dbtomodel')
const { resolve } = require('../solver-logic/gerasalahorarioglpk')
const { trataresultado } = require('../solver-logic/trataresultado')
const Turma = require('../models/turma.model')
const Sala = require('../models/sala.model')
const Config = require('../models/config.model')
const Distancia = require('../models/distancia.model')
const { protect } = require('../middleware/auth')

// =========================================================================
// ROTA DE ANÁLISE — DECLARADA NO TOPO para não conflitar com /:ano/:semestre/:dia
// Apenas LÊ do banco. Não afeta nenhuma rota existente.
// =========================================================================
const salaAtendeSolicitacaoAnalise = (salaObj, tipo) => {
  const predio = (salaObj?.predio || "").toUpperCase();
  const regiao = (salaObj?.regiao || "").toLowerCase();
  switch (tipo) {
    case "terreo":    return predio.includes("(T)");
    case "prancheta": return predio.includes(".PR");
    case "qv":        return predio.includes(".QV") || predio.includes("(QV)");
    case "qb":        return predio.includes(".QB") || predio.includes("(QB)");
    case "lab":       return predio.includes("(LAB)");
    case "esp-norte": return regiao === "norte";
    case "esp-sul":   return regiao === "sul";
    default:          return true;
  }
};

router.get('/analise/:ano/:semestre', protect, async (req, res) => {
  try {
    const { user } = req;
    const ano = parseInt(req.params.ano);
    const semestre = parseInt(req.params.semestre);
    if (isNaN(ano) || isNaN(semestre)) {
      return res.status(400).json({ error: 'Ano/Semestre inválidos' });
    }
    const minAlunos = parseInt(req.query.minAlunos) || 5;

    const configs = await Config.find({ user: user._id });
    const config = configs[0];
    if (!config) return res.status(400).json({ error: 'Configuração não encontrada para o usuário.' });

    const periodos = config.periodos || ['Manhã','Tarde','Noite'];
    const combosValidos = new Set();
    periodos.forEach((p) => {
      const pc = config.horarios?.[p];
      if (!pc) return;
      const h1i = formatarHorarioParaDB(pc['Início'].slot1);
      const h1f = formatarHorarioParaDB(pc['Fim'].slot1);
      const h2i = formatarHorarioParaDB(pc['Início'].slot2);
      const h2f = formatarHorarioParaDB(pc['Fim'].slot2);
      gerarJanelaHorario(h1i).forEach((i) => gerarJanelaHorario(h1f).forEach((f) => combosValidos.add(i + '-' + f)));
      gerarJanelaHorario(h2i).forEach((i) => gerarJanelaHorario(h2f).forEach((f) => combosValidos.add(i + '-' + f)));
      gerarJanelaHorario(h1i).forEach((i) => gerarJanelaHorario(h2f).forEach((f) => combosValidos.add(i + '-' + f)));
    });

    const todasTurmas = await Turma.find({ ano, semestre, user: user._id }).lean();
    const resultados = await Resultado.find({ ano, semestre, user: user._id }).lean();
    const todasAlocacoes = [];
    resultados.forEach((r) => {
      (r.alocacoes || []).forEach((a) => todasAlocacoes.push({
        ...a,
        diaDaSemana: r.diaDaSemana,
        periodo: r.periodo,
      }));
    });
    const idsAlocados = new Set(todasAlocacoes.map((a) => String(a.turma?._id)));

    const categorias = {
      alocadas: [],
      naoAlocadas: {
        credZero: [],
        alocadoChefia: [],
        poucoAlunos: [],
        horarioAtipico: [],
        f12Pair: [],
        juncaoAbsorvida: [],
        solverFalhou: [],
      },
    };
    const byCodTurmaDia = {};
    todasTurmas.forEach((t) => {
      const key = `${t.codDisciplina}|${t.turma}|${t.diaDaSemana}`;
      (byCodTurmaDia[key] = byCodTurmaDia[key] || []).push(t);
    });
    const juncaoGroups = {};
    todasTurmas.forEach((t) => {
      if (t.juncao && Number(t.juncao) > 0) {
        const key = `${t.juncao}_${t.codDisciplina}`;
        (juncaoGroups[key] = juncaoGroups[key] || []).push(t);
      }
    });

    todasTurmas.forEach((t) => {
      if (idsAlocados.has(String(t._id))) { categorias.alocadas.push(t); return; }
      if ((t.creditosAula || 0) <= 0) { categorias.naoAlocadas.credZero.push(t); return; }
      if (t.alocadoChefia === true) { categorias.naoAlocadas.alocadoChefia.push(t); return; }
      if ((t.totalTurma || 0) < minAlunos && !(Number(t.juncao) > 0)) { categorias.naoAlocadas.poucoAlunos.push(t); return; }
      const combo = (t.horarioInicio || '') + '-' + (t.horarioFim || '');
      if (!combosValidos.has(combo)) { categorias.naoAlocadas.horarioAtipico.push(t); return; }
      const pairKey = `${t.codDisciplina}|${t.turma}|${t.diaDaSemana}`;
      const pairs = (byCodTurmaDia[pairKey] || []).filter((p) => String(p._id) !== String(t._id));
      const pairAlocada = pairs.find((p) => idsAlocados.has(String(p._id)));
      if (pairAlocada) {
        categorias.naoAlocadas.f12Pair.push({ ...t, pairAlocadaId: pairAlocada._id, pairHorario: `${pairAlocada.horarioInicio}-${pairAlocada.horarioFim}` });
        return;
      }
      if (Number(t.juncao) > 0) {
        const juncaoKey = `${t.juncao}_${t.codDisciplina}`;
        const group = juncaoGroups[juncaoKey] || [];
        const representAlocado = group.find((g) => String(g._id) !== String(t._id) && idsAlocados.has(String(g._id)));
        if (representAlocado) {
          categorias.naoAlocadas.juncaoAbsorvida.push({ ...t, representanteId: representAlocado._id });
          return;
        }
      }
      categorias.naoAlocadas.solverFalhou.push(t);
    });

    const solicitacoes = { atendidas: [], naoAtendidas: [] };
    const capacidadeExcedida = [];
    const predioAux = [];
    todasAlocacoes.forEach((a) => {
      const t = a.turma;
      const s = a.sala;
      if (!t || !s) return;
      if (t.solicitacao) {
        const atende = salaAtendeSolicitacaoAnalise(s, t.solicitacao);
        if (atende) solicitacoes.atendidas.push({ alocacao: a });
        else solicitacoes.naoAtendidas.push({ alocacao: a });
      }
      if ((t.totalTurma || 0) > (s.capacidade || 0)) {
        capacidadeExcedida.push({ alocacao: a, excesso: (t.totalTurma || 0) - (s.capacidade || 0) });
      }
      const predioLower = (s.predio || '').toLowerCase();
      if (predioLower.includes('predioaux') || predioLower === 'atx' || predioLower.startsWith('predio aux')) {
        predioAux.push({ alocacao: a });
      }
    });

    const totalElegiveis = categorias.alocadas.length + categorias.naoAlocadas.solverFalhou.length;
    const scoreAlocacao = totalElegiveis > 0 ? (categorias.alocadas.length / totalElegiveis) * 100 : 0;
    const totalSolicitacoes = solicitacoes.atendidas.length + solicitacoes.naoAtendidas.length;
    const scoreSolicitacoes = totalSolicitacoes > 0 ? (solicitacoes.atendidas.length / totalSolicitacoes) * 100 : 100;
    const scoreGeral = Math.round(((scoreAlocacao * 0.7 + scoreSolicitacoes * 0.3)) * 10) / 10;

    res.json({
      ano, semestre, minAlunos,
      totais: {
        turmasNoBanco: todasTurmas.length,
        alocadas: categorias.alocadas.length,
        totalAlocacoesGeradas: todasAlocacoes.length,
        naoAlocadasPorMotivo: {
          credZero: categorias.naoAlocadas.credZero.length,
          alocadoChefia: categorias.naoAlocadas.alocadoChefia.length,
          poucoAlunos: categorias.naoAlocadas.poucoAlunos.length,
          horarioAtipico: categorias.naoAlocadas.horarioAtipico.length,
          f12Pair: categorias.naoAlocadas.f12Pair.length,
          juncaoAbsorvida: categorias.naoAlocadas.juncaoAbsorvida.length,
          solverFalhou: categorias.naoAlocadas.solverFalhou.length,
        },
        solicitacoes: { total: totalSolicitacoes, atendidas: solicitacoes.atendidas.length, naoAtendidas: solicitacoes.naoAtendidas.length },
        capacidadeExcedida: capacidadeExcedida.length,
        predioAux: predioAux.length,
      },
      scores: {
        geral: scoreGeral,
        alocacao: Math.round(scoreAlocacao * 10) / 10,
        solicitacoes: Math.round(scoreSolicitacoes * 10) / 10,
      },
      categorias,
      solicitacoes,
      capacidadeExcedida,
      predioAux,
    });
  } catch (err) {
    console.error('[analise] erro:', err);
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// ROTA: salas livres em um Resultado/slot
// Lista salas do usuário que estão DISPONÍVEIS para o dia/período do resultado
// e que NÃO estão ocupadas em nenhuma alocação naquele horarioSlot.
// Apenas LÊ. Não altera estado.
// =========================================================================
router.get('/salas-livres/:resultadoId/:slot', async (req, res) => {
  try {
    const { user } = req;
    const { resultadoId, slot } = req.params;
    const slotNum = parseInt(slot);
    if (![1, 2].includes(slotNum)) {
      return res.status(400).json({ error: 'slot deve ser 1 ou 2' });
    }

    const resultado = await Resultado.findOne({ _id: resultadoId, user: user._id }).lean();
    if (!resultado) return res.status(404).json({ error: 'Resultado não encontrado' });
    const { diaDaSemana, periodo } = resultado;

    const todas = await Sala.find({ user: user._id }).lean();
    const disponiveis = todas.filter((s) =>
      (s.disponibilidade || []).some(
        (d) => d.dia === diaDaSemana && d.periodo === periodo && d.disponivel === true,
      ),
    );

    // IMPORTANTE: as salas embutidas em resultado.alocacoes podem ter _id
    // desatualizado (ex.: salas reimportadas geram novos _id). Por isso a
    // ocupação é comparada por predio+numeroSala, que é a chave única estável.
    const salaKey = (s) => `${s?.predio}||${s?.numeroSala}`;
    const ocupadas = new Set(
      (resultado.alocacoes || [])
        .filter((a) => a.horarioSlot === slotNum && a.sala)
        .map((a) => salaKey(a.sala)),
    );

    const livres = disponiveis
      .filter((s) => s.predio !== 'predioAux')
      .filter((s) => !ocupadas.has(salaKey(s)));

    res.json(livres);
  } catch (err) {
    console.error('[salas-livres] erro:', err);
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// ROTA: atribuir uma sala livre a uma turma já alocada (substitui a sala atual)
// Body: { turmaId, salaAtualId, salaNovaId }
// - Atualiza TODAS as alocações dessa turma neste Resultado (cobre F12 que usa
//   slot 1 e slot 2 — ambas devem ficar na mesma sala).
// - Revalida no servidor que salaNova está disponível e livre nos slots alvo.
// =========================================================================
router.post('/atribuir-sala/:resultadoId', async (req, res) => {
  try {
    const { user } = req;
    const { resultadoId } = req.params;
    const { turmaId, salaAtualId, salaNovaId } = req.body;

    if (!turmaId || !salaAtualId || !salaNovaId) {
      return res.status(400).json({
        error: 'turmaId, salaAtualId e salaNovaId são obrigatórios',
      });
    }
    if (String(salaAtualId) === String(salaNovaId)) {
      return res.status(400).json({ error: 'A sala nova é igual à atual.' });
    }

    const resultado = await Resultado.findOne({ _id: resultadoId, user: user._id });
    if (!resultado) return res.status(404).json({ error: 'Resultado não encontrado' });

    const salaNova = await Sala.findOne({ _id: salaNovaId, user: user._id });
    if (!salaNova) return res.status(404).json({ error: 'Sala nova não encontrada' });

    // Disponibilidade da sala nova naquele dia/periodo
    const disponivel = (salaNova.disponibilidade || []).some(
      (d) =>
        d.dia === resultado.diaDaSemana &&
        d.periodo === resultado.periodo &&
        d.disponivel === true,
    );
    if (!disponivel) {
      return res.status(409).json({
        error: `Sala não está disponível em ${resultado.diaDaSemana}/${resultado.periodo}.`,
      });
    }

    // Alocações da turma com a sala atual
    const alocsDaTurma = (resultado.alocacoes || []).filter(
      (a) =>
        String(a.turma?._id) === String(turmaId) &&
        String(a.sala?._id) === String(salaAtualId),
    );
    if (alocsDaTurma.length === 0) {
      return res.status(404).json({
        error: 'Alocação atual não encontrada (turma+sala). Recarregue a página.',
      });
    }

    const slotsAlvo = new Set(alocsDaTurma.map((a) => a.horarioSlot));

    // Sala nova precisa estar livre em TODOS os slots da turma (importante para F12).
    // Compara por predio+numeroSala (chave estável) pois os _id embutidos podem
    // estar desatualizados em relação à coleção de Salas atual.
    const salaNovaKey = `${salaNova.predio}||${salaNova.numeroSala}`;
    const conflito = (resultado.alocacoes || []).find(
      (a) =>
        slotsAlvo.has(a.horarioSlot) &&
        a.sala &&
        `${a.sala.predio}||${a.sala.numeroSala}` === salaNovaKey &&
        String(a.turma?._id) !== String(turmaId),
    );
    if (conflito) {
      return res.status(409).json({
        error: 'Sala já está ocupada neste horário. Recarregue a página.',
      });
    }

    // Aplica a troca: substitui sala em todas as alocações da turma
    const salaNovaObj = salaNova.toObject();
    resultado.alocacoes = (resultado.alocacoes || []).map((a) => {
      const match =
        String(a.turma?._id) === String(turmaId) &&
        String(a.sala?._id) === String(salaAtualId);
      if (!match) return a;
      return {
        ...(a.toObject ? a.toObject() : a),
        sala: salaNovaObj,
      };
    });
    resultado.markModified('alocacoes');

    await resultado.save();

    res.json({
      message: 'Sala atualizada com sucesso',
      slotsAtualizados: Array.from(slotsAlvo),
    });
  } catch (err) {
    console.error('[atribuir-sala] erro:', err);
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// ALOCAÇÃO MANUAL de turma não alocada (ex.: Pós-Graduação).
// Determina período/slot a partir do horário da turma (mesma tolerância do
// solver), lista salas livres e insere a alocação no Resultado correspondente
// (cria o Resultado se ainda não existir). Cobre F12 (turma de 4h = 2 slots).
// =========================================================================

// Determina período e slot(s) de uma turma pelo horário. Retorna
// { periodo, slots } (slots: [1], [2] ou [1,2]) ou null se não encaixar.
function determinarPeriodoSlots(turma, config) {
  const periodos = config.periodos || ['Manhã', 'Tarde', 'Noite'];
  const ti = formatarHorarioParaDB(turma.horarioInicio);
  const tf = formatarHorarioParaDB(turma.horarioFim);
  const casa = (val, base) => gerarJanelaHorario(base).includes(val);
  for (const p of periodos) {
    const pc = config.horarios?.[p];
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

const salaKeyStable = (s) => `${s?.predio}||${s?.numeroSala}`;

router.get('/salas-livres-turma/:turmaId', async (req, res) => {
  try {
    const { user } = req;
    const turma = await Turma.findOne({ _id: req.params.turmaId, user: user._id }).lean();
    if (!turma) return res.status(404).json({ error: 'Turma não encontrada' });

    const config = (await Config.find({ user: user._id }))[0];
    if (!config) return res.status(400).json({ error: 'Configuração não encontrada.' });

    const ps = determinarPeriodoSlots(turma, config);
    if (!ps) {
      return res.status(422).json({
        error: 'O horário desta turma não encaixa em nenhum período padrão.',
      });
    }
    const { periodo, slots } = ps;
    const diaCanonico =
      (config.dias || []).find(
        (d) => normalizarString(d) === normalizarString(turma.diaDaSemana),
      ) || turma.diaDaSemana;

    const todas = await Sala.find({ user: user._id }).lean();
    const disponiveis = todas.filter((s) =>
      (s.disponibilidade || []).some(
        (d) =>
          normalizarString(d.dia) === normalizarString(diaCanonico) &&
          d.periodo === periodo &&
          d.disponivel === true,
      ),
    );

    const resultado = await Resultado.findOne({
      user: user._id,
      ano: turma.ano,
      semestre: turma.semestre,
      diaDaSemana: diaCanonico,
      periodo,
    }).lean();

    const ocupadas = new Set();
    if (resultado) {
      (resultado.alocacoes || [])
        .filter((a) => slots.includes(a.horarioSlot) && a.sala)
        .forEach((a) => ocupadas.add(salaKeyStable(a.sala)));
    }

    const livres = disponiveis
      .filter((s) => s.predio !== 'predioAux')
      .filter((s) => !ocupadas.has(salaKeyStable(s)));

    res.json({ periodo, slots, dia: diaCanonico, livres });
  } catch (err) {
    console.error('[salas-livres-turma] erro:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/alocar-manual', async (req, res) => {
  try {
    const { user } = req;
    const { turmaId, salaId } = req.body;
    if (!turmaId || !salaId) {
      return res.status(400).json({ error: 'turmaId e salaId são obrigatórios' });
    }

    const turma = await Turma.findOne({ _id: turmaId, user: user._id });
    if (!turma) return res.status(404).json({ error: 'Turma não encontrada' });
    const sala = await Sala.findOne({ _id: salaId, user: user._id });
    if (!sala) return res.status(404).json({ error: 'Sala não encontrada' });

    const config = (await Config.find({ user: user._id }))[0];
    if (!config) return res.status(400).json({ error: 'Configuração não encontrada.' });

    const ps = determinarPeriodoSlots(turma, config);
    if (!ps) {
      return res.status(422).json({
        error: 'O horário desta turma não encaixa em nenhum período padrão.',
      });
    }
    const { periodo, slots } = ps;
    const diaCanonico =
      (config.dias || []).find(
        (d) => normalizarString(d) === normalizarString(turma.diaDaSemana),
      ) || turma.diaDaSemana;

    // Sala precisa estar disponível no dia/período
    const disponivel = (sala.disponibilidade || []).some(
      (d) =>
        normalizarString(d.dia) === normalizarString(diaCanonico) &&
        d.periodo === periodo &&
        d.disponivel === true,
    );
    if (!disponivel) {
      return res.status(409).json({
        error: `Sala não está disponível em ${diaCanonico}/${periodo}.`,
      });
    }

    let resultado = await Resultado.findOne({
      user: user._id,
      ano: turma.ano,
      semestre: turma.semestre,
      diaDaSemana: diaCanonico,
      periodo,
    });
    if (!resultado) {
      resultado = new Resultado({
        user: user._id,
        ano: turma.ano,
        semestre: turma.semestre,
        diaDaSemana: diaCanonico,
        periodo,
        alocacoes: [],
      });
    }

    // Turma já alocada neste resultado?
    const jaAlocada = (resultado.alocacoes || []).some(
      (a) => String(a.turma?._id) === String(turmaId),
    );
    if (jaAlocada) {
      return res.status(409).json({
        error: 'Esta turma já está alocada neste dia/período.',
      });
    }

    // Sala livre em TODOS os slots alvo (cobre F12)?
    const salaNovaKey = salaKeyStable(sala);
    const conflito = (resultado.alocacoes || []).find(
      (a) =>
        slots.includes(a.horarioSlot) &&
        a.sala &&
        salaKeyStable(a.sala) === salaNovaKey,
    );
    if (conflito) {
      return res.status(409).json({
        error: 'Sala já está ocupada neste horário. Recarregue a página.',
      });
    }

    const turmaObj = turma.toObject();
    const salaObj = sala.toObject();
    slots.forEach((slot) => {
      resultado.alocacoes.push({
        turma: turmaObj,
        sala: salaObj,
        horarioSlot: slot,
      });
    });
    resultado.markModified('alocacoes');
    await resultado.save();

    res.json({
      message: 'Turma alocada manualmente',
      periodo,
      dia: diaCanonico,
      slots,
      resultadoId: resultado._id,
    });
  } catch (err) {
    console.error('[alocar-manual] erro:', err);
    res.status(500).json({ error: err.message });
  }
});

const alocationRemove = (arr,removeArray) => {
    let arrayTemp = []
    
    arr.map(element=>{
        let remove = false
        removeArray.map(removeObj=>{
            if (removeObj.sala == element.sala && removeObj.turma == element.turma){
                remove = true
            }
        })
        if (!remove){
            arrayTemp.push(element)
        }
    })
    return arrayTemp
}

const alocationInsert = (arr,insertArray)=>{
    let arrayTemp = arr
    insertArray.map(element=>{
        arr.push(element)
    })
    return arrayTemp
}

const alocationSort = (a,b) =>{
    if (a.horarioSlot < b.horarioSlot){
        return -1
    }
    if (a.horarioSlot > b.horarioSlot){
        return 1
    }
    return 0
}

router.route('/').get((req,res)=>{
    const {user} = req
    Resultado.find({user:user._id})
        .then(resultados => res.json(resultados))
        .catch(err => res.status(400).json('Error: '+ err))
})

router.route('/:ano/:semestre').get((req, res) => {
    const { user } = req;
    if (!user) return res.status(401).json({ error: 'Usuário não autenticado' });
    const ano = parseInt(req.params.ano);  // CORREÇÃO: Parse para number (matcha DB)
    const semestre = parseInt(req.params.semestre);
    if (isNaN(ano) || isNaN(semestre)) return res.status(400).json({ error: 'Ano/Semestre inválidos' });
    Resultado.find({ ano, semestre, user: user._id })
        .then(resultados => {
            console.log(`GET /:ano/:semestre: ${resultados.length} resultados para user ${user._id}, ano=${ano} (type: ${typeof ano}), semestre=${semestre}`);
            res.json(resultados);
        })
        .catch(err => {
            console.error('Erro GET resultados:', err);
            res.status(400).json(err);
        });
});

router.route('/:ano/:semestre/:dia/:periodo').get((req,res)=>{
    const {user} = req
    const ano = parseInt(req.params.ano);  // CORREÇÃO: Parse para number
    const semestre = parseInt(req.params.semestre);
    if (isNaN(ano) || isNaN(semestre)) return res.status(400).json({ error: 'Ano/Semestre inválidos' });
    Resultado.find({
        ano,
        semestre,
        diaDaSemana:req.params.dia,
        periodo:req.params.periodo,
        user:user._id
    })
        .then(resultados=>res.json(resultados))
        .catch(err => res.status(400).json(err))
})

router.route('/:ano/:semestre/:dia').get((req,res)=>{
    const {user} = req
    const ano = parseInt(req.params.ano);  // CORREÇÃO: Parse para number
    const semestre = parseInt(req.params.semestre);
    if (isNaN(ano) || isNaN(semestre)) return res.status(400).json({ error: 'Ano/Semestre inválidos' });
    Resultado.find({
        ano,
        semestre,
        diaDaSemana:req.params.dia,
        user:user._id
    })
        .then(resultados=>res.json(resultados))
        .catch(err => res.status(400).json(err))
})

router.route('/diaperiodo').post(async (req, res) => {
    const ano = parseInt(req.body.ano);  // CORREÇÃO: Parse pra consistência
    const semestre = parseInt(req.body.semestre);
    const periodo = req.body.periodo
    const diaDaSemana = req.body.diaDaSemana
    const delta = req.body.delta
    const {user} = req

    // checar se periodo está em config, se não retornar erro
    // config = await Config.find({user:user})
    // if (!config.periodos.includes(periodo)){res.status(400).json(err)}

    const modelo = await dbtomodel(ano,semestre,periodo,diaDaSemana)
    const produto = await resolve(modelo,delta)
    const alocacoes = await trataresultado(modelo,produto)
    
    res.json(alocacoes)
    
})

router.route('/calculalista').post(async (req, res) => {
    const ano = parseInt(req.body.ano);  // CORREÇÃO: Garante number
    const semestre = parseInt(req.body.semestre);
    const delta = parseInt(req.body.delta)
    const lista = req.body.lista
    const predioAux = req.body.predioAux
    const minAlunos = req.body.minAlunos
    const mipGap = req.body.mipGap
    const tmLim = req.body.tmLim
    const {user} = req
    
    if (isNaN(ano) || isNaN(semestre)) return res.status(400).json({ error: 'Ano/Semestre inválidos' });
    
    let resultObj = {}

    const listaDePromises = lista.map(async (unidade)=>{
        try {
            const modelo = await dbtomodel(ano,semestre,unidade.periodo,unidade.dia,user,predioAux,minAlunos)
            const produto = await resolve(modelo,delta,mipGap,tmLim)
            const alocacoes = await trataresultado(modelo,produto)

            resultObj[unidade.dia] = resultObj[unidade.dia]? resultObj[unidade.dia]: {}
            if (produto.result.status == 4 ){
                resultObj[unidade.dia][unidade.periodo] = false;
            }else if (produto.result.status == 5){
                resultObj[unidade.dia][unidade.periodo] = true;
            }

            const updateResult = await Resultado.findOneAndUpdate({
                user:user._id,
                ano:ano,
                semestre:semestre,
                diaDaSemana:unidade.dia,
                periodo:unidade.periodo
            },{alocacoes:alocacoes},{upsert:true});
            console.log(`SAVE /calculalista: Upsert para ${ano}/${semestre}/${unidade.dia}/${unidade.periodo}, alocacoes=${alocacoes.length}, user=${user._id} (novo doc? ${updateResult ? 'Sim' : 'Não'})`);

        } catch (error) {
            console.log(error)
            resultObj[unidade.dia] = resultObj[unidade.dia]? resultObj[unidade.dia]: {}
            resultObj[unidade.dia][unidade.periodo] = false;
        }

    })

    await Promise.all(listaDePromises)
    console.log (`Otimização concluida para ${ano}/${semestre}`)
    return res.json(resultObj)
})

router.route('/id/:id').get((req,res)=>{
    Resultado.findById(req.params.id)
        .then(resultado => res.json(resultado))
        .catch(err => res.status(400).json('Error: '+ err))
})

router.route('/delete/:ano/:semestre').delete((req, res) => {
    const { user } = req;
    if (!user) return res.status(401).json({ error: 'Usuário não autenticado' });
    const ano = parseInt(req.params.ano);  // Garante número
    const semestre = parseInt(req.params.semestre);
    if (isNaN(ano) || isNaN(semestre)) return res.status(400).json({ error: 'Ano/Semestre inválidos' });
    Resultado.deleteMany({ ano, semestre, user: user._id })
        .then(deleted => {
            console.log(`DELETE: Apagados ${deleted.deletedCount} resultados para ${ano}/${semestre}, user ${user._id}`);
            res.json({ message: `Apagados ${deleted.deletedCount} resultados` });
        })
        .catch(err => {
            console.error('Erro DELETE resultados:', err);
            res.status(400).json({ error: err.message });
        });
});

router.route('/:id').delete((req,res)=>{
    Resultado.findByIdAndDelete(req.params.id)
        .then(()=> res.json('Resultado deletado'))
        .catch(err => res.status(400).json('Error: '+ err))
})

router.route('/update/:id').post((req,res)=>{
    const {alocacaoOrigem,alocacaoDestino,alocacaoAux,salaOrigem,salaDestino} = req.body

    Resultado.findById(req.params.id)
        .then(resultado=>{
            let aux = {}
            let origem = []
            let destino = []
            
            if (alocacaoOrigem != undefined){
                origem = resultado.alocacoes.filter(alocacao=>{
                    return alocacao.sala._id == alocacaoOrigem.sala._id &&
                           alocacao.turma._id == alocacaoOrigem.turma._id
                }).sort(alocationSort)
            }
            
            if (alocacaoDestino != undefined){
                destino = resultado.alocacoes.filter(alocacao=>{
                    return alocacao.sala._id == alocacaoDestino.sala._id &&
                           alocacao.turma._id == alocacaoDestino.turma._id
                }).sort(alocationSort)
            }
            
            let removeArray = origem.concat(destino)
            
            if (alocacaoAux.sala){
                aux = resultado.alocacoes.find(alocacao=>{
                    return alocacao.sala._id == alocacaoAux.sala._id &&
                           alocacao.turma._id == alocacaoAux.turma._id
                })
                removeArray.push(aux)
            }
            let newAlocation = alocationRemove(resultado.alocacoes,removeArray)

            origem.map(aloc=>{
                aloc.sala = salaDestino
            })

            destino.map(aloc=>{
                aloc.sala = salaOrigem
            })
            let insertArray = origem.concat(destino)

            if (alocacaoAux.sala && origem.length > destino.length){
                aux.sala = salaOrigem
                insertArray.push(aux)
            }else if (alocacaoAux.sala && origem.length < destino.length){
                aux.sala = salaDestino
                insertArray.push(aux)
            }
            newAlocation = alocationInsert(newAlocation,insertArray)
            resultado.alocacoes = newAlocation

            resultado.save()
               .then(()=>{
                  res.json("Troca Realizada")
               }).catch(err=>{
                  console.log(err)
                    res.status(400).json(err)})
        })
        .catch(err=>{
            console.log(err)
            res.status(400).json(err)})
})


module.exports = router
