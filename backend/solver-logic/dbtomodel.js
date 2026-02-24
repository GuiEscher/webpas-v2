let Sala = require("../models/sala.model");
let Turma = require("../models/turma.model");
let Distancia = require("../models/distancia.model");
let Config = require("../models/config.model");

// Função auxiliar para normalizar strings (remove TODAS as aspas e espaços)
const normalizarString = (str) => {
  if (!str) return "";
  return String(str).replace(/['"]/g, "").trim();
};

// Função para formatar horário config para HHMM (sem :)
const formatarHorarioParaDB = (horario) => {
  if (!horario) return "";
  let formatted = String(horario).replace(":", "");
  if (formatted.length === 3) {
    formatted = "0" + formatted;
  }
  return formatted;
};

// --- GERA VARIAÇÕES DE TOLERÂNCIA DE HORÁRIO ---
const gerarJanelaHorario = (horarioBase) => {
  if (!horarioBase) return [];

  // Garante base 4 dígitos para consultar o mapa
  let base4 = horarioBase;
  if (base4.length === 3) base4 = "0" + base4;

  const variacoes = [base4];

  const mapaVariacoes = {
    // MANHÃ (08:00 - 12:00)
    "0800": [
      "0700",
      "0710",
      "0730",
      "0740",
      "0745",
      "0750",
      "0800",
      "0810",
      "0815",
      "0820",
      "0830",
    ],
    1000: [
      "0900",
      "0910",
      "0930",
      "0940",
      "0950",
      "1000",
      "1010",
      "1020",
      "1030",
    ],
    1200: [
      "1100",
      "1110",
      "1130",
      "1140",
      "1150",
      "1200",
      "1210",
      "1220",
      "1230",
      "1300",
    ],

    // TARDE (14:00 - 18:00)
    1400: [
      "1300",
      "1310",
      "1330",
      "1340",
      "1350",
      "1400",
      "1410",
      "1420",
      "1430",
    ],
    1600: [
      "1500",
      "1510",
      "1530",
      "1540",
      "1550",
      "1600",
      "1610",
      "1620",
      "1630",
    ],
    1800: [
      "1700",
      "1710",
      "1730",
      "1740",
      "1750",
      "1800",
      "1810",
      "1820",
      "1830",
    ],

    // NOITE (19:00 - 23:00)
    1900: ["1830", "1840", "1850", "1900", "1910", "1915", "1920", "1930"],
    2100: ["2030", "2040", "2050", "2100", "2110", "2120", "2130"],
    2300: ["2230", "2240", "2250", "2300", "2310", "2320"],
  };

  let listaBase = [];
  if (mapaVariacoes[base4]) {
    listaBase = [...new Set([...variacoes, ...mapaVariacoes[base4]])];
  } else {
    listaBase = variacoes;
  }

  // === CORREÇÃO PARA 3 DÍGITOS (800 vs 0800) ===
  const listaExpandida = [];
  listaBase.forEach((h) => {
    listaExpandida.push(h); // Adiciona "0800"
    if (h.startsWith("0")) {
      listaExpandida.push(h.substring(1)); // Adiciona "800"
    }
  });

  return [...new Set(listaExpandida)];
};

async function dbtomodel(
  ano,
  semestre,
  periodo,
  diaDaSemana,
  user,
  predioAux,
  minAlunos,
) {
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
  const listaInicioF1 = gerarJanelaHorario(hInicioF1);
  const listaFimF1 = gerarJanelaHorario(hFimF1);

  const listaInicioF12 = gerarJanelaHorario(hInicioF12);
  const listaFimF12 = gerarJanelaHorario(hFimF12);

  const listaInicioF2 = gerarJanelaHorario(hInicioF2);
  const listaFimF2 = gerarJanelaHorario(hFimF2);

  const diaNormalizado = normalizarString(diaDaSemana);
  const opcoesDia = [diaNormalizado, `'${diaNormalizado}'`];

  // 3. Buscas no Banco (Usando $in para encontrar 800 E 0800)
  // --- CORREÇÃO: Filtra turmas alocadas pela chefia E com créditos > 0 ---

  let rawTurmasF1 = await Turma.find({
    ano: ano,
    semestre: semestre,
    diaDaSemana: { $in: opcoesDia },
    horarioInicio: { $in: listaInicioF1 },
    horarioFim: { $in: listaFimF1 },
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
      t1.turma === t2.turma &&
      t1.docentes === t2.docentes
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
  // LÓGICA DE JUNÇÃO (MESMA SALA PARA TURMAS COM MESMO CÓDIGO + HORÁRIO)
  // ==========================================================================
  // Turmas com juncao > 0, mesmo codDisciplina e mesmo horarioInicio são
  // agrupadas. A primeira turma (representante) recebe a soma de totalTurma
  // de todas as turmas do grupo. As demais são removidas do solver e
  // armazenadas em modelo.juncaoTurmas para receberem a mesma sala após
  // a otimização (propagação feita em trataresultado.js).
  // ==========================================================================

  modelo.juncaoTurmas = [];

  function processarJuncao(turmaArray) {
    const juncaoGroups = {};
    const turmasFinais = [];

    // Agrupa turmas com juncao > 0 por codDisciplina + horarioInicio
    turmaArray.forEach((turma) => {
      if (turma.juncao && turma.juncao > 0) {
        const key = `${turma.codDisciplina}_${turma.horarioInicio}`;
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

      // Primeira turma = representante do grupo
      const representante = group[0];
      let totalSomado = representante.totalTurma;

      for (let i = 1; i < group.length; i++) {
        totalSomado += group[i].totalTurma;
        modelo.juncaoTurmas.push({
          turmaJoined: group[i],
          representanteId: representante._id.toString(),
        });
      }

      // Representante recebe a soma dos alunos de todo o grupo
      representante.totalTurma = totalSomado;
      turmasFinais.push(representante);

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

  // 4. Salas
  const salasDB = await Sala.find({ user: user._id });
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

  // 5. Distâncias (NORMALIZADO PARA LOWERCASE para evitar case mismatch)
  const distanciasDb = await Distancia.find({ user: user._id });
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
