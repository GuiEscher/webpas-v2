let Sala = require("../models/sala.model");
let Turma = require("../models/turma.model");
let Distancia = require("../models/distancia.model");
let Config = require("../models/config.model");

// Helpers puros centralizados (testáveis sem mongoose).
const {
  normalizarString,
  formatarHorarioParaDB,
  gerarHorariosDentroSlot,
  gerarJanelaHorario,
} = require("../utils/horario");
const { campusRegex } = require("../utils/campus");

async function dbtomodel(
  ano,
  semestre,
  periodo,
  diaDaSemana,
  user,
  predioAux,
  minAlunos,
  campus,
) {
  const filtroCampus = campusRegex(campus);
  console.log(
    `[dbtomodel] ${periodo}/${diaDaSemana}: Iniciando (turmas >=${minAlunos}, aux=${predioAux})`,
  );

  let modelo = {
    turmasf1: [],
    turmasf12: [],
    turmasf2: [],
    salas: [],
    distancias: [],
  };

  const config = await Config.find({ user: user._id });
  if (config.length === 0) {
    console.error(`[dbtomodel] Sem config para user ${user._id}`);
    return modelo;
  }

  // 1. Definição de Horários Padrão
  let hInicioF1 = formatarHorarioParaDB(
    config[0].horarios[periodo]["Início"].slot1,
  );
  let hFimF1 = formatarHorarioParaDB(config[0].horarios[periodo]["Fim"].slot1);

  let hInicioF12 = formatarHorarioParaDB(
    config[0].horarios[periodo]["Início"].slot1,
  );
  let hFimF12 = formatarHorarioParaDB(config[0].horarios[periodo]["Fim"].slot2);

  let hInicioF2 = formatarHorarioParaDB(
    config[0].horarios[periodo]["Início"].slot2,
  );
  let hFimF2 = formatarHorarioParaDB(config[0].horarios[periodo]["Fim"].slot2);

  // 2. Listas Flexíveis (Com correção 800/0800)
  // Para F1/F2: além da tolerância padrão (±30 min das bordas), incluímos TODOS
  // os horários dentro do slot, permitindo que turmas cujo horário cabe dentro
  // do slot (ex: 20h-21h dentro de F1 Noite 19-21) sejam alocadas.
  const listaInicioF1 = [...new Set([
    ...gerarJanelaHorario(hInicioF1),
    ...gerarHorariosDentroSlot(hInicioF1, hFimF1),
  ])];
  const listaFimF1 = [...new Set([
    ...gerarJanelaHorario(hFimF1),
    ...gerarHorariosDentroSlot(hInicioF1, hFimF1),
  ])];

  // F12 continua restritivo (só turmas que cobrem o período inteiro 4h)
  const listaInicioF12 = gerarJanelaHorario(hInicioF12);
  const listaFimF12 = gerarJanelaHorario(hFimF12);

  const listaInicioF2 = [...new Set([
    ...gerarJanelaHorario(hInicioF2),
    ...gerarHorariosDentroSlot(hInicioF2, hFimF2),
  ])];
  const listaFimF2 = [...new Set([
    ...gerarJanelaHorario(hFimF2),
    ...gerarHorariosDentroSlot(hInicioF2, hFimF2),
  ])];

  const diaNormalizado = normalizarString(diaDaSemana);
  const opcoesDia = [diaNormalizado, `'${diaNormalizado}'`];

  // 3. Buscas no Banco (Usando $in para encontrar 800 E 0800)
  // --- CORREÇÃO: Filtra turmas alocadas pela chefia E com créditos > 0 ---

  // === DIAGNÓSTICO: busca TODAS as turmas do dia (sem filtros de crédito/chefia/alunos) ===
  const todasDoDia = await Turma.find({
    ano: ano,
    semestre: semestre,
    diaDaSemana: { $in: opcoesDia },
    campus: filtroCampus,
    user: user._id,
  });

  if (todasDoDia.length > 0) {
    const excluidas = {
      creditosZero: [],
      alocadoChefia: [],
      poucoAlunos: [],
      horarioNaoEncaixa: [],
    };

    const todosHorariosAceitos = new Set([
      ...listaInicioF1, ...listaFimF1,
      ...listaInicioF12, ...listaFimF12,
      ...listaInicioF2, ...listaFimF2,
    ]);

    // Gerar sets de combinações início+fim válidas
    const combosValidas = new Set();
    listaInicioF1.forEach((i) => listaFimF1.forEach((f) => combosValidas.add(i + "-" + f)));
    listaInicioF12.forEach((i) => listaFimF12.forEach((f) => combosValidas.add(i + "-" + f)));
    listaInicioF2.forEach((i) => listaFimF2.forEach((f) => combosValidas.add(i + "-" + f)));

    todasDoDia.forEach((t) => {
      const combo = (t.horarioInicio || "") + "-" + (t.horarioFim || "");
      if (t.creditosAula <= 0) {
        excluidas.creditosZero.push(t);
      } else if (t.alocadoChefia === true) {
        excluidas.alocadoChefia.push(t);
      } else if (t.totalTurma < minAlunos && !(t.juncao > 0)) {
        excluidas.poucoAlunos.push(t);
      } else if (!combosValidas.has(combo)) {
        excluidas.horarioNaoEncaixa.push(t);
      }
    });

    const totalExcluidas = Object.values(excluidas).reduce((s, a) => s + a.length, 0);
    if (totalExcluidas > 0) {
      console.log(`\n[DIAGNÓSTICO] ${periodo}/${diaDaSemana}: ${todasDoDia.length} turmas no dia, ${totalExcluidas} excluídas:`);
      if (excluidas.creditosZero.length > 0) {
        console.log(`  ❌ creditosAula=0: ${excluidas.creditosZero.length}`);
        excluidas.creditosZero.slice(0, 5).forEach((t) =>
          console.log(`     → ${t.horario_id || t.idTurma} "${t.nomeDisciplina}" turma=${t.turma} cred=${t.creditosAula}`),
        );
      }
      if (excluidas.alocadoChefia.length > 0) {
        console.log(`  ❌ alocadoChefia=true: ${excluidas.alocadoChefia.length}`);
        excluidas.alocadoChefia.slice(0, 5).forEach((t) =>
          console.log(`     → ${t.horario_id || t.idTurma} "${t.nomeDisciplina}" turma=${t.turma}`),
        );
      }
      if (excluidas.poucoAlunos.length > 0) {
        console.log(`  ❌ totalTurma<${minAlunos} (sem junção): ${excluidas.poucoAlunos.length}`);
        excluidas.poucoAlunos.slice(0, 5).forEach((t) =>
          console.log(`     → ${t.horario_id || t.idTurma} "${t.nomeDisciplina}" turma=${t.turma} total=${t.totalTurma}`),
        );
      }
      if (excluidas.horarioNaoEncaixa.length > 0) {
        console.log(`  ❌ horário não encaixa no período ${periodo}: ${excluidas.horarioNaoEncaixa.length}`);
        excluidas.horarioNaoEncaixa.slice(0, 5).forEach((t) =>
          console.log(`     → ${t.horario_id || t.idTurma} "${t.nomeDisciplina}" turma=${t.turma} ${t.horarioInicio}-${t.horarioFim}`),
        );
      }
    }
  }
  // === FIM DIAGNÓSTICO ===

  let rawTurmasF1 = await Turma.find({
    ano: ano,
    semestre: semestre,
    diaDaSemana: { $in: opcoesDia },
    horarioInicio: { $in: listaInicioF1 },
    horarioFim: { $in: listaFimF1 },
    campus: filtroCampus,
    user: user._id,
    $or: [{ totalTurma: { $gte: minAlunos } }, { juncao: { $gt: 0 } }],
    alocadoChefia: { $ne: true },
    creditosAula: { $gt: 0 },
  });

  let rawTurmasF12 = await Turma.find({
    ano: ano,
    semestre: semestre,
    diaDaSemana: { $in: opcoesDia },
    horarioInicio: { $in: listaInicioF12 },
    horarioFim: { $in: listaFimF12 },
    campus: filtroCampus,
    user: user._id,
    $or: [{ totalTurma: { $gte: minAlunos } }, { juncao: { $gt: 0 } }],
    alocadoChefia: { $ne: true },
    creditosAula: { $gt: 0 },
  });

  let rawTurmasF2 = await Turma.find({
    ano: ano,
    semestre: semestre,
    diaDaSemana: { $in: opcoesDia },
    horarioInicio: { $in: listaInicioF2 },
    horarioFim: { $in: listaFimF2 },
    campus: filtroCampus,
    user: user._id,
    $or: [{ totalTurma: { $gte: minAlunos } }, { juncao: { $gt: 0 } }],
    alocadoChefia: { $ne: true },
    creditosAula: { $gt: 0 },
  });

  // ==========================================================================
  // LÓGICA DE JUNÇÃO (STITCHING)
  // ==========================================================================

  const turmasF1_Final = [];
  const turmasF2_Final = [];
  const matchedF2Ids = new Set();

  const isSameClass = (t1, t2) => {
    return (
      t1.codDisciplina === t2.codDisciplina &&
      t1.turma === t2.turma
    );
  };

  // Itera sobre o primeiro horário
  rawTurmasF1.forEach((t1) => {
    // Procura a continuação no segundo horário
    const t2 = rawTurmasF2.find(
      (t2) => !matchedF2Ids.has(t2._id.toString()) && isSameClass(t1, t2),
    );

    if (t2) {
      // ENCONTROU A MESMA TURMA NO SEGUNDO HORÁRIO
      // Unifica em F12 (Horário Cheio)
      // Preserva a solicitação: se o primeiro slot (t1) não tem solicitação
      // mas o segundo (t2) tem, herda do t2 para que o stitching não descarte
      // a solicitação do usuário. Se ambos têm, mantém a do t1 (primeiro).
      if (!t1.solicitacao && t2.solicitacao) {
        t1.solicitacao = t2.solicitacao;
        console.log(
          `[dbtomodel] 🎯 Solicitação "${t2.solicitacao}" herdada do 2º slot para F12: ${t1.nomeDisciplina} (${t1.turma})`,
        );
      }
      modelo.turmasf12.push(t1);
      matchedF2Ids.add(t2._id.toString());
      console.log(
        `[dbtomodel] 🔗 Turma Unificada: ${t1.nomeDisciplina} (${t1.turma})`,
      );
    } else {
      // Mantém isolada
      turmasF1_Final.push(t1);
    }
  });

  // Adiciona as turmas do segundo horário que sobraram
  rawTurmasF2.forEach((t2) => {
    if (!matchedF2Ids.has(t2._id.toString())) {
      turmasF2_Final.push(t2);
    }
  });

  // Atualiza o modelo
  modelo.turmasf1 = turmasF1_Final;
  modelo.turmasf2 = turmasF2_Final;
  rawTurmasF12.forEach((t) => modelo.turmasf12.push(t));

  // ==========================================================================
  // LÓGICA DE JUNÇÃO
  // ==========================================================================
  // Turmas com juncao > 0 são agrupadas pelo código de junção (juncao_id no
  // CSV). A turma representante permanece no solver e recebe a soma de alunos.
  // As demais turmas do grupo são removidas do solver.
  // ==========================================================================

  modelo.juncaoTurmas = [];

  function processarJuncao(turmaArray) {
    const juncaoGroups = {};
    const turmasFinais = [];

    // Agrupa turmas com juncao > 0 SOMENTE pelo juncao_id.
    // Antes a chave incluía codDisciplina, o que impedia junção entre
    // disciplinas diferentes. Nos dados do SIGA nenhum juncao_id cruza
    // disciplinas, então remover o codDisciplina não altera os grupos
    // atuais e habilita a junção manual entre disciplinas distintas.
    turmaArray.forEach((turma) => {
      if (turma.juncao && turma.juncao > 0) {
        const key = `${turma.juncao}`;
        if (!juncaoGroups[key]) {
          juncaoGroups[key] = [];
        }
        juncaoGroups[key].push(turma);
      } else {
        turmasFinais.push(turma);
      }
    });

    // Processa cada grupo de junção
    Object.values(juncaoGroups).forEach((group) => {
      if (group.length <= 1) {
        // Grupo com 1 turma: sem junção efetiva, mantém normal
        turmasFinais.push(group[0]);
        return;
      }

      // Representante estável: menor letra de turma; desempata por
      // codDisciplina e idTurma para ser determinístico mesmo entre
      // disciplinas diferentes no mesmo grupo de junção.
      group.sort((a, b) => {
        const t = String(a.turma || "").localeCompare(
          String(b.turma || ""),
          "pt-BR",
          { sensitivity: "base" },
        );
        if (t !== 0) return t;
        const c = String(a.codDisciplina || "").localeCompare(
          String(b.codDisciplina || ""),
        );
        if (c !== 0) return c;
        return String(a.idTurma || "").localeCompare(String(b.idTurma || ""));
      });

      const representante = group[0];
      let totalSomado = representante.totalTurma;

      for (let i = 1; i < group.length; i++) {
        totalSomado += group[i].totalTurma;
        modelo.juncaoTurmas.push({
          turmaJoined: group[i],
          representanteId: representante._id.toString(),
        });
      }

      // Monta a representante como objeto simples: um campo fora do schema
      // (juncaoLabel) não sobrevive à serialização de um documento Mongoose.
      const repObj = representante.toObject
        ? representante.toObject()
        : { ...representante };
      // Representante recebe a soma dos alunos de todo o grupo
      repObj.totalTurma = totalSomado;
      // Rótulo da junção: ids das turmas do grupo unidos por "+", para
      // exibir no quadro (ex.: "247386+247388").
      repObj.juncaoLabel = group
        .map((t) => t.idTurma)
        .filter(Boolean)
        .join("+");
      turmasFinais.push(repObj);

      console.log(
        `[dbtomodel] 🔗 Junção: ${representante.codDisciplina} ${representante.turma} (${representante.nomeDisciplina}) - ${group.length} turmas → totalTurma=${totalSomado}`,
      );
    });

    return turmasFinais;
  }

  modelo.turmasf1 = processarJuncao(modelo.turmasf1);
  modelo.turmasf12 = processarJuncao(modelo.turmasf12);
  modelo.turmasf2 = processarJuncao(modelo.turmasf2);

  // ==========================================================================

  const totalTurmas =
    modelo.turmasf1.length + modelo.turmasf12.length + modelo.turmasf2.length;
  console.log(
    `[dbtomodel] Total final: ${totalTurmas} (F1: ${modelo.turmasf1.length}, F12: ${modelo.turmasf12.length}, F2: ${modelo.turmasf2.length})${modelo.juncaoTurmas.length > 0 ? ` [${modelo.juncaoTurmas.length} turma(s) em junção]` : ""}`,
  );

  // ==========================================================================

  // 4. Salas (apenas do campus processado)
  const salasDB = await Sala.find({ user: user._id, campus: filtroCampus });
  salasDB.forEach((sala) => {
    let dispArray = sala.disponibilidade || [];
    let disponivel = false;
    dispArray.forEach((disp) => {
      const dispDiaNormalizado = normalizarString(disp.dia);
      if (
        dispDiaNormalizado === diaNormalizado &&
        disp.periodo === periodo &&
        disp.disponivel === true
      ) {
        disponivel = true;
      }
    });
    if (disponivel) {
      modelo.salas.push(sala);
    }
  });

  if (predioAux) {
    const numAux = config[0].numSalasAux || 0;
    for (let i = 0; i < numAux; i++) {
      let salaAux = new Sala({
        predio: "predioAux",
        numeroSala: "Sala A" + i.toString(),
        capacidade: config[0].capSalasAux || 0,
        user: user._id,
      });
      modelo.salas.push(salaAux);
    }
  }

  // 5. Distâncias (apenas do campus processado; normalizado p/ evitar case mismatch)
  const distanciasDb = await Distancia.find({ user: user._id, campus: filtroCampus });
  modelo.distancias = distanciasDb.reduce((acc, cur) => {
    const predioNorm = normalizarString(cur.predio).toLowerCase();
    const deptNorm = normalizarString(cur.departamento).toLowerCase();
    acc[predioNorm] = acc[predioNorm] || {};
    acc[predioNorm][deptNorm] = cur.valorDist;
    return acc;
  }, {});

  if (predioAux) {
    modelo.distancias.predioaux = {};
    const todasTurmas = [
      ...modelo.turmasf1,
      ...modelo.turmasf12,
      ...modelo.turmasf2,
    ];
    let deptsUnicos = [
      ...new Set(
        todasTurmas.map((turma) =>
          normalizarString(
            turma.departamentoTurma || turma.departamentoOferta || "",
          ).toLowerCase(),
        ),
      ),
    ].filter((dept) => dept);

    if (deptsUnicos.length === 0) {
      deptsUnicos = [
        ...new Set(
          distanciasDb.map((cur) =>
            normalizarString(cur.departamento).toLowerCase(),
          ),
        ),
      ].filter((dept) => dept);
    }

    deptsUnicos.forEach((dept) => {
      modelo.distancias.predioaux[dept] = 0;
    });
  }

  return modelo;
}

exports.dbtomodel = dbtomodel;
exports.gerarJanelaHorario = gerarJanelaHorario;
exports.formatarHorarioParaDB = formatarHorarioParaDB;
exports.normalizarString = normalizarString;
