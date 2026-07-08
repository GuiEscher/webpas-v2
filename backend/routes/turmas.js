const router = require("express").Router();
const Turma = require("../models/turma.model");
const { protect } = require("../middleware/auth");
const multer = require("multer");
const csv = require("csv-parser");
const { Readable } = require("stream");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const normalizeCsvHeader = (header = "") =>
  String(header)
    .trim()
    .replace(/'/g, "")
    .replace(/"/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

const normalizeCsvValue = (value) =>
  String(value ?? "")
    .trim()
    .replace(/'/g, "")
    .replace(/"/g, "");

const normalizeText = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const normalizeCampusValue = (campus, fallback = "São Carlos") => {
  const campusLimpo = normalizeCsvValue(campus);
  const campusNormalizado = normalizeText(campusLimpo);

  if (campusNormalizado.includes("sorocaba")) return "Sorocaba";
  if (campusNormalizado.includes("sao carlos")) return "São Carlos";
  if (campusLimpo) return campusLimpo;

  return fallback;
};

// --- ROTA DE UPLOAD CSV ---
router.post("/upload-csv", protect, upload.single("file"), async (req, res) => {
  console.log("--- ROTA /upload-csv ACIONADA ---");

  if (!req.file) {
    return res.status(400).json({ msg: "Nenhum arquivo enviado." });
  }

  const { ano, semestre, campusSelecionado } = req.body;
  const userId = req.user._id;

  console.log(
    `[INFO] Upload para: ${campusSelecionado || "São Carlos"} | ${ano}/${semestre}`,
  );
  console.log(
    `[DEBUG] Dados recebidos - ano: ${ano}, semestre: ${semestre}, tipo ano: ${typeof ano}, tipo semestre: ${typeof semestre}`,
  );

  if (!ano || !semestre) {
    return res.status(400).json({ msg: "Ano e semestre são obrigatórios." });
  }

  // 1. Detecção de Separador (; ou ,)
  const fileContent = req.file.buffer.toString("utf8");
  const primeiraLinha = fileContent.split("\n")[0];

  const countVirgula = (primeiraLinha.match(/,/g) || []).length;
  const countPontoVirgula = (primeiraLinha.match(/;/g) || []).length;

  let separator = ";";
  if (countVirgula > countPontoVirgula) separator = ",";

  console.log(`[DEBUG] Separador detectado: '${separator}'`);

  const turmasParaSalvar = [];
  let linhaCount = 0;

  const readableFileStream = new Readable();
  readableFileStream.push(req.file.buffer);
  readableFileStream.push(null);

  readableFileStream
    .pipe(
      csv({
        separator: separator,
        mapHeaders: ({ header }) => normalizeCsvHeader(header),
      }),
    )
    .on("data", (row) => {
      linhaCount++;
      try {
        let novaTurma = {};

        const getRowValue = (...aliases) => {
          for (const alias of aliases) {
            const value = row[alias];
            if (value === undefined || value === null) continue;

            const valueStr = normalizeCsvValue(value);
            const valueLower = valueStr.toLowerCase();
            if (
              valueStr === "" ||
              valueLower === "null" ||
              valueLower === "(null)"
            ) {
              continue;
            }
            return valueStr;
          }
          return undefined;
        };

        const codDiscip = getRowValue(
          "cod_discip",
          "cod_disciplina",
          "codigo_disciplina",
          "codigo_discip",
          "coddisciplina",
        );
        const nomeDisciplina = getRowValue("nome", "nome_disciplina", "disciplina");
        const campusCsv = getRowValue("campus", "nome_campus");
        const departamento = getRowValue(
          "departamento",
          "departamento_turma",
          "depto",
          "departamento_oferta",
        );
        const totalVagas = getRowValue(
          "numero_vagas",
          "inscricoes_mais_vagas_calouros",
          "total_vagas",
          "vagas",
        );
        const diaSemana = getRowValue("dia", "dia_da_semana");
        const horaInicio = getRowValue(
          "hora_inicio",
          "horario_inicio",
          "hora_inicial",
        );
        const horaFim = getRowValue(
          "hora_fim",
          "hora_termino",
          "horario_fim",
          "horario_termino",
        );
        const credAula = getRowValue(
          "cred_aula",
          "credito_aula",
          "creditos_aula",
        );
        const ministrantes = getRowValue(
          "ministrantes",
          "docentes",
          "professores",
        );
        const juncaoHorario = getRowValue(
          "juncao_id",
          "juncao_horario_id",
          "juncao_horario",
          "juncao",
        );
        const tipoQuadroCsv = getRowValue(
          "tipo_quadro",
          "tipoquadro",
          "tipo_lousa",
          "quadro",
        );

        // --- 1. CORREÇÃO: Turma Vazia vira 'A' ---
        let letraTurma = getRowValue("turma", "letra_turma");
        if (
          !letraTurma ||
          String(letraTurma).trim() === "" ||
          String(letraTurma).toLowerCase() === "null"
        ) {
          letraTurma = "A";
        }

        // --- 2. CORREÇÃO: Alocado Chefia (true, t, 1, sim) ---
        let isAlocadoChefia = false;
        const rawAlocado = getRowValue(
          "alocado_chefia",
          "chefia_alocada",
          "aloc_chefia",
        );
        if (rawAlocado) {
          const val = String(rawAlocado).trim().toLowerCase();
          if (["true", "t", "1", "sim", "s", "yes", "y"].includes(val)) {
            isAlocadoChefia = true;
          }
        }

        // --- 3. NOVA CORREÇÃO: Leitura do Horário ID ---
        // Tenta ler de várias formas comuns caso o cabeçalho varie um pouco
        const horarioIdValue =
          getRowValue("horario_id", "horarioid", "id_horario", "idhorario") ||
          undefined;
        // -----------------------------------------------

        // --- LÓGICA POR CAMPUS ---
        if (campusSelecionado === "Sorocaba") {
          if (!codDiscip && !nomeDisciplina) return;

          // Tratamento de Campus (Null vira Sorocaba)
          const campusValue = normalizeCampusValue(campusCsv, "Sorocaba");

          const hInicio = horaInicio ? String(Number(horaInicio)) : "0";
          const hFim = horaFim ? String(Number(horaFim)) : "0";

          novaTurma = {
            idTurma: `${codDiscip || ""}-${letraTurma}`,
            campus: campusValue,

            // INSERIDO AQUI
            horario_id: horarioIdValue
              ? String(horarioIdValue).trim()
              : undefined,

            departamentoTurma: departamento || "N/A",
            codDisciplina: codDiscip || "N/A",
            turma: letraTurma,
            nomeDisciplina: nomeDisciplina || "N/A",
            totalTurma: Number(totalVagas) || 0,
            departamentoOferta: departamento || "N/A",
            diaDaSemana: diaSemana || "N/A",
            horarioInicio: hInicio,
            horarioFim: hFim,
            creditosAula: Number(credAula) || 0,
            docentes: ministrantes || "N/A",
            ano: Number(ano),
            semestre: Number(semestre),
            user: userId,
            alocadoChefia: isAlocadoChefia,
            tipoQuadro: (() => {
              if (!tipoQuadroCsv) return "Indiferente";
              const val = normalizeText(tipoQuadroCsv);
              if (val.includes("verde") || val === "qv") return "Verde";
              if (val.includes("branco") || val === "qb") return "Branco";
              return "Indiferente";
            })(),
            juncao: Number(juncaoHorario) || 0,
          };

          // Log de debug (apenas primeira linha)
          if (linhaCount === 1) {
            console.log(
              `[DEBUG SOROCABA] Primeira turma - ano: ${novaTurma.ano}, semestre: ${novaTurma.semestre}, turma: ${novaTurma.turma}, nome: ${novaTurma.nomeDisciplina}, tipoQuadro: ${novaTurma.tipoQuadro}`,
            );
          }
        } else {
          // São Carlos
          if (
            (!codDiscip || codDiscip === "") &&
            (!nomeDisciplina || nomeDisciplina === "")
          )
            return;

          const hInicioSC = horaInicio ? String(Number(horaInicio)) : "0";
          const hFimSC = horaFim ? String(Number(horaFim)) : "0";

          novaTurma = {
            idTurma: `${codDiscip || ""}-${letraTurma}`,
            campus: "São Carlos",

            // INSERIDO AQUI TAMBÉM
            horario_id: horarioIdValue
              ? String(horarioIdValue).trim()
              : undefined,

            departamentoTurma: departamento || "N/A",
            codDisciplina: codDiscip || "N/A",
            turma: letraTurma,
            nomeDisciplina: nomeDisciplina || "N/A",
            totalTurma: Number(totalVagas) || 0,
            departamentoOferta: departamento || "N/A",
            diaDaSemana: diaSemana || "N/A",
            horarioInicio: hInicioSC,
            horarioFim: hFimSC,
            creditosAula: Number(credAula) || 0,
            docentes: ministrantes || "N/A",
            ano: Number(ano),
            semestre: Number(semestre),
            user: userId,
            alocadoChefia: isAlocadoChefia,
            tipoQuadro: "Indiferente",
            juncao: Number(juncaoHorario) || 0,
          };

          // Log de debug (apenas primeira linha)
          if (linhaCount === 1) {
            console.log(
              `[DEBUG SÃO CARLOS] Primeira turma - ano: ${novaTurma.ano}, semestre: ${novaTurma.semestre}, turma: ${novaTurma.turma}, nome: ${novaTurma.nomeDisciplina}`,
            );
          }
        }
        turmasParaSalvar.push(novaTurma);
      } catch (e) {
        console.error(`Erro processando linha ${linhaCount}`, e);
      }
    })
    .on("end", async () => {
      console.log(
        `\n[RESUMO] Linhas lidas: ${linhaCount} | Válidas: ${turmasParaSalvar.length}`,
      );

      if (turmasParaSalvar.length === 0) {
        return res.status(400).json({
          msg: `Erro: Nenhuma turma identificada. Verifique o arquivo.`,
        });
      }

      try {
        await Turma.insertMany(turmasParaSalvar, { ordered: false });
        res.status(201).json({
          msg: `${turmasParaSalvar.length} turmas processadas com sucesso!`,
        });
      } catch (error) {
        console.error(
          `[ERRO NO INSERTMANY] code: ${error.code}, writeErrors: ${error.writeErrors?.length || 0}`,
        );

        if (error.code === 11000 || error.writeErrors?.length) {
          const writeErrors = error.writeErrors || [];
          const duplicados = writeErrors.filter((we) => we.code === 11000).length;
          const invalidos = writeErrors.length - duplicados;
          const salvos = turmasParaSalvar.length - writeErrors.length;

          if (writeErrors.length > 0) {
            const primeiraKey =
              writeErrors[0].err?.keyValue ||
              writeErrors[0].err?.op ||
              writeErrors[0].errmsg;
            console.log(`[DEBUG INSERT ERROR] Primeiro erro:`, primeiraKey);
          }

          if (salvos <= 0 && invalidos > 0 && duplicados === 0) {
            return res.status(400).json({
              msg: `Nenhuma turma foi salva. Verifique o formato/validação do arquivo (${invalidos} linha(s) inválida(s)).`,
            });
          }

          let detalhes = [];
          if (duplicados > 0) {
            detalhes.push(
              `${duplicados} já existiam no ano/semestre ${ano}/${semestre}`,
            );
          }
          if (invalidos > 0) {
            detalhes.push(`${invalidos} linha(s) inválida(s)`);
          }

          return res.status(201).json({
            msg: `Upload parcial: ${salvos} novas turmas salvas. (${detalhes.join(" | ")}).`,
          });
        }
        res
          .status(500)
          .json({ msg: "Erro ao salvar no banco.", error: error.message });
      }
    })
    .on("error", (error) => {
      res
        .status(500)
        .json({ msg: "Erro fatal ao ler CSV.", error: error.message });
    });
});

// --- ROTAS PARA GERENCIAMENTO DE PERÍODOS ---

router.get("/info/semestres-disponiveis", protect, async (req, res) => {
  try {
    const user = req.user;
    const periodos = await Turma.aggregate([
      { $match: { user: user._id } },
      { $group: { _id: { ano: "$ano", semestre: "$semestre" } } },
      { $sort: { "_id.ano": -1, "_id.semestre": -1 } },
    ]);
    const formatado = periodos.map((p) => ({
      ano: p._id.ano,
      semestre: p._id.semestre,
    }));
    res.json(formatado);
  } catch (err) {
    res.status(400).json(err);
  }
});

router.post("/delete-periodos", protect, async (req, res) => {
  const { periodos } = req.body;
  const user = req.user;
  if (!periodos || periodos.length === 0)
    return res.status(400).json({ msg: "Nenhum período selecionado." });

  try {
    const query = {
      user: user._id,
      $or: periodos.map((p) => ({ ano: p.ano, semestre: p.semestre })),
    };
    const result = await Turma.deleteMany(query);
    res.json({ msg: `${result.deletedCount} turmas deletadas com sucesso.` });
  } catch (err) {
    res.status(400).json(err);
  }
});

// --- ROTAS PADRÃO ---

const arrayUnique = (array) => [...new Set(array)];

router.route("/").get(protect, (req, res) => {
  Turma.find({ user: req.user._id })
    .then((turmas) => res.json(turmas))
    .catch((err) => res.status(400).json(err));
});

router.route("/d/").get(protect, (req, res) => {
  const user = req.user;
  Turma.find({ user: user._id })
    .distinct("departamentoOferta")
    .then((departamentosOferta) => {
      // DEBUG: Log raw department values from DB
      console.log(
        `[GET /d/] departamentoOferta raw:`,
        departamentosOferta.slice(0, 20),
      );
      Turma.find({ user: user._id })
        .distinct("departamentoTurma")
        .then((departamentosTurma) => {
          console.log(
            `[GET /d/] departamentoTurma raw:`,
            departamentosTurma.slice(0, 20),
          );
          const departamentos = arrayUnique(
            departamentosOferta.concat(departamentosTurma),
          );
          res.json(departamentos);
        })
        .catch((err) => res.status(400).json(err));
    })
    .catch((err) => res.status(400).json(err));
});

router.route("/:ano/:semestre").get(protect, (req, res) => {
  const anoParam = Number(req.params.ano);
  const semestreParam = Number(req.params.semestre);

  const valoresAno = [req.params.ano];
  const valoresSemestre = [req.params.semestre];

  if (!Number.isNaN(anoParam)) valoresAno.push(anoParam);
  if (!Number.isNaN(semestreParam)) valoresSemestre.push(semestreParam);

  Turma.find({
    user: req.user._id,
    ano: { $in: valoresAno },
    semestre: { $in: valoresSemestre },
  })
    .then((turmas) => res.json(turmas))
    .catch((err) => res.json(err));
});

router.route("/dep/").get(protect, (req, res) => {
  Turma.find({ user: req.user._id })
    .distinct("departamentoOferta")
    .then((turmas) => res.json(turmas))
    .catch((err) => res.status(400).json(err));
});

router.route("/add").post(protect, (req, res) => {
  const {
    idTurma,
    campus,
    departamentoTurma,
    codDisciplina,
    turma,
    nomeDisciplina,
    totalTurma,
    departamentoOferta,
    diaDaSemana,
    horarioInicio,
    horarioFim,
    creditosAula,
    creditosPratico,
    docente,
    ano,
    semestre,
    tipoQuadro,
    alocadoChefia,
    horario_id,
    juncao,
  } = req.body;
  const user = req.user;

  const hInicio = horarioInicio ? String(Number(horarioInicio)) : "";
  const hFim = horarioFim ? String(Number(horarioFim)) : "";
  const valorQuadro = tipoQuadro || "Indiferente";
  const valorCampus = campus || "São Carlos";

  const letraTurma = turma && turma.trim() !== "" ? turma : "A";
  const finalIdTurma = idTurma || `${codDisciplina}-${letraTurma}`;

  const novaTurma = new Turma({
    idTurma: finalIdTurma,
    campus: valorCampus,
    departamentoTurma,
    codDisciplina,
    turma: letraTurma,
    nomeDisciplina,
    totalTurma,
    departamentoOferta,
    diaDaSemana,
    horarioInicio: hInicio,
    horarioFim: hFim,
    creditosAula,
    creditosPratico,
    docente,
    ano,
    semestre,
    user: user._id,
    tipoQuadro: valorQuadro,
    alocadoChefia: alocadoChefia || false,

    // ADICIONEI AQUI TAMBÉM CASO USE A ROTA /add MANUAL
    horario_id: horario_id || undefined,

    juncao: Number(juncao) || 0,
  });

  novaTurma
    .save()
    .then(() => res.json("Turma adicionada"))
    .catch((err) => res.status(400).json(err));
});

router.route("/:id").get(protect, (req, res) => {
  Turma.findById(req.params.id)
    .then((turma) => res.json(turma))
    .catch((err) => res.status(400).json(err));
});

router.route("/arquivoturma").post(protect, async (req, res) => {
  const novasTurmas = req.body.novasTurmas;
  Turma.insertMany(novasTurmas, { ordered: false })
    .then(() => res.json("Turmas adicionadas"))
    .catch((err) => {
      res.status(400).json(err);
    });
});

router.route("/delete/:id").delete(protect, (req, res) => {
  Turma.findByIdAndDelete(req.params.id)
    .then(() => res.json("Turma deletada"))
    .catch((err) => res.status(400).json(err));
});

router.route("/deleteMany").post(protect, (req, res) => {
  const turmasIds = req.body.turmasID;
  Turma.deleteMany({ _id: { $in: turmasIds } })
    .then(() => res.json("Turmas deletadas"))
    .catch((err) => res.status(400).json(err));
});

router.route("/delete/:ano/:semestre").delete(protect, (req, res) => {
  const { ano, semestre } = req.params;
  Turma.deleteMany({ user: req.user._id, ano: ano, semestre: semestre })
    .then(() => res.json("Turmas deletadas"))
    .catch((err) => res.status(400).json(err));
});

router.route("/update/:id").post(protect, (req, res) => {
  console.log(
    `[UPDATE TURMA] id=${req.params.id}, body=`,
    JSON.stringify(req.body),
  );
  Turma.findById(req.params.id)
    .then((turma) => {
      const deptAntes = turma.departamentoTurma;
      Object.assign(turma, req.body);
      if (turma.horarioInicio)
        turma.horarioInicio = String(Number(turma.horarioInicio));
      if (turma.horarioFim) turma.horarioFim = String(Number(turma.horarioFim));

      if (!turma.turma || turma.turma.trim() === "") turma.turma = "A";
      if (turma.codDisciplina && turma.turma)
        turma.idTurma = `${turma.codDisciplina}-${turma.turma}`;

      console.log(
        `[UPDATE TURMA] "${turma.nomeDisciplina}" dept: "${deptAntes}" → "${turma.departamentoTurma}"`,
      );
      turma
        .save()
        .then(() => res.json("Turma atualizada"))
        .catch((err) => {
          console.error(`[UPDATE TURMA] Erro ao salvar:`, err);
          res.status(400).json(err);
        });
    })
    .catch((err) => res.status(400).json(err));
});

// =========================================================================
// JUNÇÃO MANUAL — agrupar/desagrupar turmas pela ferramenta
// Permite junção entre disciplinas DIFERENTES (o SIGA só junta a mesma).
// Usa o mesmo campo `juncao`; números manuais começam em 90000 para não
// colidirem com os juncao_id vindos do SIGA (faixa ~2500).
// =========================================================================
router.post("/juncao/agrupar", protect, async (req, res) => {
  try {
    const { turmasIds } = req.body;
    if (!Array.isArray(turmasIds) || turmasIds.length < 2) {
      return res
        .status(400)
        .json({ error: "Selecione ao menos 2 turmas para agrupar em junção." });
    }
    const turmas = await Turma.find({
      _id: { $in: turmasIds },
      user: req.user._id,
    });
    if (turmas.length !== turmasIds.length) {
      return res
        .status(404)
        .json({ error: "Algumas turmas não foram encontradas." });
    }

    // Próximo número de junção: acima de qualquer existente e na faixa manual.
    const anos = [...new Set(turmas.map((t) => t.ano))];
    const sems = [...new Set(turmas.map((t) => t.semestre))];
    const maxDoc = await Turma.find({
      user: req.user._id,
      ano: { $in: anos },
      semestre: { $in: sems },
    })
      .sort({ juncao: -1 })
      .limit(1);
    const maxJuncao = maxDoc.length ? maxDoc[0].juncao || 0 : 0;
    const novoJuncao = Math.max(maxJuncao + 1, 90000);

    await Turma.updateMany(
      { _id: { $in: turmasIds }, user: req.user._id },
      { $set: { juncao: novoJuncao } },
    );
    res.json({ message: "Turmas agrupadas em junção", juncao: novoJuncao });
  } catch (err) {
    console.error("[juncao/agrupar] erro:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/juncao/desagrupar", protect, async (req, res) => {
  try {
    const { turmasIds } = req.body;
    if (!Array.isArray(turmasIds) || turmasIds.length === 0) {
      return res.status(400).json({ error: "Nenhuma turma informada." });
    }
    await Turma.updateMany(
      { _id: { $in: turmasIds }, user: req.user._id },
      { $set: { juncao: 0 } },
    );
    res.json({ message: "Junção removida das turmas" });
  } catch (err) {
    console.error("[juncao/desagrupar] erro:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- ROTA DE LIMPEZA DE DEPARTAMENTOS FAKE (LEGACY) ---
// Usada para limpar turmas com departamentos residuais de antes da nova abordagem
// (DEP-TERREO, TERREO-DEP-TERREO, etc.) e restaurar o departamento original.
// Na nova abordagem, o departamentoTurma nunca é alterado — apenas o campo
// 'solicitacao' é setado, e o solver aplica penalidades com base nos atributos da sala.
router.post("/limpar-departamentos-fake", protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // Prefixos usados pelo sistema de solicitações (atual e antigo)
    const prefixosFake = [
      "TERREO",
      "PRANCHETA",
      "QV",
      "QB",
      "LAB",
      "NORTE",
      "SUL",
    ];

    // Padrões antigos estáticos que nunca deveriam ser departamentos reais
    const departamentosEstaticosAntigos = [
      "DEP-TERREO",
      "DEP-PRANCHETA",
      "DEP-QV",
      "DEP-QB",
      "DEP-LAB",
      "DEP-NORTE",
      "DEP-SUL",
    ];

    // Monta regex que encontra: TERREO-xxx, PRANCHETA-xxx, DEP-TERREO, etc.
    const regexParts = [];
    prefixosFake.forEach((p) => {
      regexParts.push(`^${p}-`); // ex: TERREO-DC, TERREO-DEP-TERREO
    });
    departamentosEstaticosAntigos.forEach((d) => {
      regexParts.push(`^${d}$`); // ex: DEP-TERREO exato
    });

    const regex = new RegExp(regexParts.join("|"), "i");

    // Busca turmas afetadas
    const turmasAfetadas = await Turma.find({
      user: userId,
      $or: [
        { departamentoTurma: { $regex: regex } },
        { departamentoOferta: { $regex: regex } },
      ],
    });

    if (turmasAfetadas.length === 0) {
      return res.json({
        msg: "Nenhum departamento fake encontrado. Tudo limpo!",
        corrigidas: 0,
      });
    }

    let corrigidas = 0;
    const detalhes = [];

    for (const turma of turmasAfetadas) {
      let deptOriginal = null;

      // 1. Se tem departamentoOriginal salvo, usar ele
      if (turma.departamentoOriginal) {
        deptOriginal = turma.departamentoOriginal;
      } else {
        // 2. Tentar extrair removendo o prefixo fake
        const deptAtual = turma.departamentoTurma || "";
        for (const prefixo of prefixosFake) {
          if (deptAtual.toUpperCase().startsWith(prefixo + "-")) {
            const restante = deptAtual.substring(prefixo.length + 1);
            // Se o restante ainda é um dept fake antigo, extrair de novo
            let limpo = restante;
            for (const antigo of departamentosEstaticosAntigos) {
              if (restante.toUpperCase() === antigo.toUpperCase()) {
                // Caso TERREO-DEP-TERREO → não sabemos o dept real
                // Usar departamentoOferta como fallback
                limpo = turma.departamentoOferta || restante;
                break;
              }
            }
            deptOriginal = limpo;
            break;
          }
        }

        // 3. Se é um dept estático antigo puro (DEP-TERREO), usar departamentoOferta
        if (!deptOriginal) {
          for (const antigo of departamentosEstaticosAntigos) {
            if (
              (turma.departamentoTurma || "").toUpperCase() ===
              antigo.toUpperCase()
            ) {
              deptOriginal = turma.departamentoOferta;
              break;
            }
          }
        }

        // 4. Fallback final: usar departamentoOferta
        if (!deptOriginal) {
          deptOriginal = turma.departamentoOferta;
        }
      }

      if (deptOriginal) {
        const deptAnterior = turma.departamentoTurma;
        turma.departamentoTurma = deptOriginal;
        turma.solicitacao = undefined;
        turma.departamentoOriginal = undefined;
        await turma.save();
        corrigidas++;
        detalhes.push(
          `${turma.nomeDisciplina} (${turma.turma}): ${deptAnterior} → ${deptOriginal}`,
        );
      }
    }

    res.json({
      msg: `${corrigidas} turma(s) corrigida(s) com sucesso.`,
      corrigidas,
      detalhes,
    });
  } catch (error) {
    console.error("Erro ao limpar departamentos fake:", error);
    res.status(500).json({ msg: "Erro interno ao limpar departamentos fake." });
  }
});

// === ROTA DE DIAGNÓSTICO: turmas que NÃO seriam alocadas pelo solver ===
router.get("/diagnostico/:ano/:semestre", protect, async (req, res) => {
  try {
    const user = req.user;
    const ano = parseInt(req.params.ano);
    const semestre = parseInt(req.params.semestre);
    if (isNaN(ano) || isNaN(semestre))
      return res.status(400).json({ error: "Ano/Semestre inválidos" });

    const todas = await Turma.find({
      ano,
      semestre,
      user: user._id,
    }).lean();

    const minAlunos = 5; // default

    const diagnostico = {
      total: todas.length,
      alocaveis: 0,
      excluidas: {
        creditosZero: [],
        alocadoChefia: [],
        poucoAlunos: [],
        semHorarioId: [],
      },
    };

    todas.forEach((t) => {
      const info = {
        _id: t._id,
        horario_id: t.horario_id || "",
        idTurma: t.idTurma,
        nomeDisciplina: t.nomeDisciplina,
        codDisciplina: t.codDisciplina,
        turma: t.turma,
        diaDaSemana: t.diaDaSemana,
        horarioInicio: t.horarioInicio,
        horarioFim: t.horarioFim,
        totalTurma: t.totalTurma,
        creditosAula: t.creditosAula,
        alocadoChefia: t.alocadoChefia,
        juncao: t.juncao,
        campus: t.campus,
      };

      if ((t.creditosAula || 0) <= 0) {
        diagnostico.excluidas.creditosZero.push(info);
      } else if (t.alocadoChefia === true) {
        diagnostico.excluidas.alocadoChefia.push(info);
      } else if (
        (t.totalTurma || 0) < minAlunos &&
        !((t.juncao || 0) > 0)
      ) {
        diagnostico.excluidas.poucoAlunos.push(info);
      } else {
        diagnostico.alocaveis++;
        if (!t.horario_id) {
          diagnostico.excluidas.semHorarioId.push(info);
        }
      }
    });

    diagnostico.resumo = {
      creditosZero: diagnostico.excluidas.creditosZero.length,
      alocadoChefia: diagnostico.excluidas.alocadoChefia.length,
      poucoAlunos: diagnostico.excluidas.poucoAlunos.length,
      semHorarioId: diagnostico.excluidas.semHorarioId.length,
    };

    res.json(diagnostico);
  } catch (err) {
    console.error("Erro no diagnóstico:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// Lista turmas que têm solicitação ativa no banco (sincroniza com frontend)
// =========================================================================
router.get("/com-solicitacao/:ano/:semestre", protect, async (req, res) => {
  try {
    const user = req.user;
    const ano = parseInt(req.params.ano);
    const semestre = parseInt(req.params.semestre);
    if (isNaN(ano) || isNaN(semestre))
      return res.status(400).json({ error: "Ano/Semestre inválidos" });

    const turmas = await Turma.find({
      ano,
      semestre,
      user: user._id,
      solicitacao: { $ne: null, $exists: true },
    }).lean();

    res.json(turmas);
  } catch (err) {
    console.error("[/com-solicitacao]", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// ROTAS DE TESTE (podem ser removidas depois) — aplicar solicitações em lote
// =========================================================================

// Aplica solicitações a múltiplas turmas. Body: { ano, semestre, solicitacoes: [{horario_id, tipo}] }
router.post("/teste/aplicar-solicitacoes-lote", protect, async (req, res) => {
  try {
    const user = req.user;
    const { ano, semestre, solicitacoes } = req.body;
    if (!Array.isArray(solicitacoes) || solicitacoes.length === 0) {
      return res.status(400).json({ msg: "Lista de solicitações vazia." });
    }
    if (!ano || !semestre) {
      return res.status(400).json({ msg: "ano e semestre são obrigatórios." });
    }

    const tiposValidos = new Set([
      "terreo",
      "prancheta",
      "qv",
      "qb",
      "lab",
      "esp-norte",
      "esp-sul",
    ]);

    let aplicadas = 0;
    let naoEncontradas = [];
    let tipoInvalido = [];

    for (const s of solicitacoes) {
      const horarioId = String(s.horario_id || "").trim();
      const tipo = String(s.tipo || "").trim();
      if (!horarioId || !tiposValidos.has(tipo)) {
        tipoInvalido.push({ horario_id: horarioId, tipo });
        continue;
      }
      const result = await Turma.updateOne(
        {
          horario_id: horarioId,
          ano: Number(ano),
          semestre: Number(semestre),
          user: user._id,
        },
        { $set: { solicitacao: tipo } },
      );
      if (result.matchedCount > 0) aplicadas++;
      else naoEncontradas.push(horarioId);
    }

    res.json({
      aplicadas,
      naoEncontradas: naoEncontradas.length,
      tipoInvalido: tipoInvalido.length,
      detalhes: { naoEncontradas, tipoInvalido },
    });
  } catch (err) {
    console.error("[teste/aplicar-solicitacoes-lote]", err);
    res.status(500).json({ msg: "Erro ao aplicar solicitações.", error: err.message });
  }
});

// Limpa solicitações de um período. Body: { ano, semestre }
router.post("/teste/limpar-solicitacoes-lote", protect, async (req, res) => {
  try {
    const user = req.user;
    const { ano, semestre } = req.body;
    if (!ano || !semestre) {
      return res.status(400).json({ msg: "ano e semestre são obrigatórios." });
    }
    const result = await Turma.updateMany(
      {
        ano: Number(ano),
        semestre: Number(semestre),
        user: user._id,
        solicitacao: { $ne: null },
      },
      { $set: { solicitacao: null } },
    );
    res.json({ limpas: result.modifiedCount });
  } catch (err) {
    console.error("[teste/limpar-solicitacoes-lote]", err);
    res.status(500).json({ msg: "Erro ao limpar solicitações.", error: err.message });
  }
});

module.exports = router;
