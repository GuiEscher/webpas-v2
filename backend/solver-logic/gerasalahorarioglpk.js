const GLPK = require("glpk.js");
const glpk = GLPK();

async function resolve(modelo, delta, mipGap, tmLim) {
  console.log(
    `DEBUG resolve: Iniciando com delta=${delta}, mipGap=${mipGap}, tmLim=${tmLim}`,
  );

  const turmasF1 = modelo.turmasf1;
  const turmasF12 = modelo.turmasf12;
  const turmasF2 = modelo.turmasf2;
  const salas = modelo.salas;
  const delta1 = delta;
  const placeholder = 99999;

  const turmas = new Array().concat(turmasF1, turmasF12, turmasF2);
  console.log(
    `DEBUG resolve: Turmas totais: ${turmas.length} (F1:${turmasF1.length}, F12:${turmasF12.length}, F2:${turmasF2.length}), Salas: ${salas.length}`,
  );

  if (turmas.length === 0) {
    console.warn(
      `AVISO resolve: Nenhuma turma — modelo vazio (0 vars, só constraints de salas). Solução trivial (status=5, vars={}).`,
    );
  }

  if (salas.length === 0) {
    console.warn(`AVISO resolve: Nenhuma sala disponível — modelo inviável.`);
  }

  console.log("Delta", delta1);
  const indiceDistancias = modelo.distancias;
  console.log(
    `DEBUG resolve: Índice distancias tem ${Object.keys(indiceDistancias).length} predios`,
  );

  // --- DEBUG: Listar TODAS as chaves do índice de distâncias ---
  Object.keys(indiceDistancias).forEach((predio) => {
    const depts = Object.keys(indiceDistancias[predio]);
    console.log(
      `  DIST INDEX predio="${predio}" → depts=[${depts.join(", ")}]`,
    );
  });

  const distanciasCalculadas = turmas.map((turma, turmaIdx) => {
    return salas.map((sala, salaIdx) => {
      // Usa departamentoTurma quando disponível (inclui F12), senão departamentoOferta
      let departamentoUsado =
        turma.departamentoTurma || turma.departamentoOferta;
      // Normaliza: remove TODAS as aspas, espaços, converte para lowercase
      const deptLower = (departamentoUsado || "")
        .replace(/['"]/g, "")
        .trim()
        .toLowerCase();
      const predioLower = (sala.predio || "")
        .replace(/['"]/g, "")
        .trim()
        .toLowerCase();

      let distValue =
        indiceDistancias[predioLower] &&
        indiceDistancias[predioLower][deptLower]
          ? indiceDistancias[predioLower][deptLower]
          : placeholder;

      // =================================================================
      // PENALIDADES POR SOLICITAÇÃO (usa o NOME DO PRÉDIO da sala)
      // Os prédios são particionados com sufixos que indicam atributos:
      //   (T)   → térreo         ex: AT02 (T), AT05 (T)
      //   .Pr   → prancheta      ex: AT05.Pr, AT07.Pr
      //   .Qv   → quadro verde   ex: AT05.Qv
      //   .Qb   → quadro branco  ex: AT05.Qb
      //   (LAB) → laboratório    ex: AT05 (LAB)
      //   .Dac  → DAC            ex: AT02.Dac
      // Para norte/sul, usa o campo regiao da sala.
      // =================================================================
      const solicitacao = turma.solicitacao;
      if (solicitacao && distValue < placeholder) {
        let salaAtende = true;
        const predioUpper = (sala.predio || "").toUpperCase();
        const distAntes = distValue;

        switch (solicitacao) {
          case "terreo":
            salaAtende = predioUpper.includes("(T)");
            break;
          case "prancheta":
            salaAtende = predioUpper.includes(".PR");
            break;
          case "lab":
            salaAtende = predioUpper.includes("(LAB)");
            break;
          case "qv":
            salaAtende = predioUpper.includes(".QV");
            break;
          case "qb":
            salaAtende = predioUpper.includes(".QB");
            break;
          case "esp-norte":
            salaAtende = (sala.regiao || "").toLowerCase() === "norte";
            break;
          case "esp-sul":
            salaAtende = (sala.regiao || "").toLowerCase() === "sul";
            break;
          default:
            salaAtende = true;
        }

        if (!salaAtende) {
          distValue = placeholder; // Penalidade alta: solver evitará essa sala
        }

        // --- DEBUG DETALHADO: primeira sala de cada turma com solicitação ---
        if (salaIdx === 0) {
          console.log(
            `\n🔍 SOLICITAÇÃO DETECTADA:`,
            `\n  Turma: "${turma.nomeDisciplina}" (${turma.idTurma})`,
            `\n  Solicitacao: "${solicitacao}"`,
            `\n  Departamento: "${departamentoUsado}"`,
            `\n  Exemplo de Sala: "${sala.nomeSala}" prédio="${sala.predio}"`,
            `\n  Prédio Upper: "${predioUpper}"`,
            `\n  Sala Atende? ${salaAtende ? "✅ SIM" : "❌ NÃO"}`,
            `\n  Distância: ${distAntes} → ${distValue}`,
          );
        }
      }

      // --- DEBUG: Log resumido para turmas com solicitação ---
      if (turmaIdx < turmas.length && salaIdx === 0 && solicitacao) {
        console.log(
          `  📋 RESUMO: Turma="${turma.nomeDisciplina}" tem solicitacao="${solicitacao}"`,
        );
      }

      return distValue;
    });
  });
  console.log(
    `DEBUG resolve: Matriz distancias calculada: ${distanciasCalculadas.length} turmas x ${distanciasCalculadas[0]?.length || 0} salas`,
  );

  const options = {
    msglev: glpk.GLP_MSG_ALL,
    presol: true,
    cb: {
      call: (progress) => console.log("GLPK Progress:", progress),
      each: 1,
    },
  };

  if (tmLim != 0 && tmLim <= 3600) {
    options.tmlim = tmLim;
    console.log(`DEBUG resolve: Set tmLim=${tmLim}s`);
  }

  if (mipGap != 0) {
    options.mipgap = mipGap;
    console.log(`DEBUG resolve: Set mipGap=${mipGap}`);
  }

  function getVariables() {
    let result = new Array();
    let indiceResult = 0;

    // Vars para H1 (F1 + F12)
    for (let i = 0; i < turmasF1.length + turmasF12.length; i++) {
      for (let j = 0; j < salas.length; j++) {
        result[indiceResult] = {
          name: `t${i + 1}s${j + 1}h1`,
          coef: distanciasCalculadas[i][j],
        };
        indiceResult++;
      }
    }
    // Vars para H2 (F2) - CORREÇÃO: Start index correto para F2 (após F1 + F12)
    for (let i = turmasF1.length + turmasF12.length; i < turmas.length; i++) {
      for (let j = 0; j < salas.length; j++) {
        result[indiceResult] = {
          name: `t${i + 1}s${j + 1}h2`,
          coef: distanciasCalculadas[i][j],
        };
        indiceResult++;
      }
    }
    console.log(
      `DEBUG resolve: Vars geradas: ${result.length} (esperado: ~${(turmasF1.length + turmasF12.length) * salas.length + turmasF2.length * salas.length})`,
    );
    return result;
  }

  function getConstraints() {
    let result = new Array();
    let indiceResult = 0;

    // Trava turma H1 (cada turma alocada exatamente 1x)
    for (let i = 0; i < turmasF1.length + turmasF12.length; i++) {
      let varsSoma = new Array();
      let indiceVars = 0;
      for (let j = 0; j < salas.length; j++) {
        varsSoma[indiceVars] = { name: `t${i + 1}s${j + 1}h1`, coef: 1 };
        indiceVars++;
      }
      result[indiceResult] = {
        name: `travaTurma${i + 1}VariaSalaH1`,
        vars: varsSoma,
        bnds: { type: glpk.GLP_FX, ub: 1.0, lb: 1.0 },
      };
      indiceResult++;
    }

    // Trava turma H2 (F2 apenas) - CORREÇÃO: Loop só para F2
    for (let i = turmasF1.length + turmasF12.length; i < turmas.length; i++) {
      let varsSoma = new Array();
      let indiceVars = 0;
      for (let j = 0; j < salas.length; j++) {
        varsSoma[indiceVars] = { name: `t${i + 1}s${j + 1}h2`, coef: 1 };
        indiceVars++;
      }
      result[indiceResult] = {
        name: `travaTurma${i + 1}VariaSalaH2`,
        vars: varsSoma,
        bnds: { type: glpk.GLP_FX, ub: 1.0, lb: 1.0 },
      };
      indiceResult++;
    }

    // Trava sala H1/H2 (máx 1 turma por sala/horário)
    for (let j = 0; j < salas.length; j++) {
      let varsSomaH1 = new Array();
      let varsSomaH2 = new Array();
      let indiceVarsH1 = 0;
      let indiceVarsH2 = 0;

      // H1 (F1 + F12)
      for (let i = 0; i < turmasF1.length + turmasF12.length; i++) {
        varsSomaH1[indiceVarsH1] = { name: `t${i + 1}s${j + 1}h1`, coef: 1 };
        indiceVarsH1++;
      }
      result[indiceResult] = {
        name: `variaTurmaTravaSala${j + 1}H1`,
        vars: varsSomaH1,
        bnds: { type: glpk.GLP_UP, ub: 1.0, lb: 0.0 },
      };
      indiceResult++;

      // H2 (F2 apenas) - CORREÇÃO: Loop só para F2
      for (let i = turmasF1.length + turmasF12.length; i < turmas.length; i++) {
        varsSomaH2[indiceVarsH2] = { name: `t${i + 1}s${j + 1}h2`, coef: 1 };
        indiceVarsH2++;
      }
      result[indiceResult] = {
        name: `variaTurmaTravaSala${j + 1}H2`,
        vars: varsSomaH2,
        bnds: { type: glpk.GLP_UP, ub: 1.0, lb: 0.0 },
      };
      indiceResult++;
    }

    // Não alocar F12 em H2 (e vice-versa)
    for (let i = turmasF1.length; i < turmasF1.length + turmasF12.length; i++) {
      for (let j = 0; j < salas.length; j++) {
        result[indiceResult] = {
          name: `t${i + 1}s${j + 1}h1-t${i + 1}s${j + 1}h2`,
          vars: [
            { name: `t${i + 1}s${j + 1}h1`, coef: 1 },
            { name: `t${i + 1}s${j + 1}h2`, coef: -1 },
          ],
          bnds: { type: glpk.GLP_FX, ub: 0.0, lb: 0.0 },
        };
        indiceResult++;
      }
    }

    // Capacidade (com delta)
    for (let i = 0; i < turmasF1.length + turmasF12.length; i++) {
      for (let j = 0; j < salas.length; j++) {
        result[indiceResult] = {
          name: `capacidade-t${i + 1}s${j + 1}h1`,
          vars: [
            {
              name: `t${i + 1}s${j + 1}h1`,
              coef: turmas[i].totalTurma - salas[j].capacidade + delta1,
            },
          ],
          bnds: { type: glpk.GLP_UP, ub: 0.0, lb: 0.0 },
        };
        indiceResult++;
      }
    }
    // Capacidade H2 (F2 apenas) - CORREÇÃO: Loop só para F2
    for (let i = turmasF1.length + turmasF12.length; i < turmas.length; i++) {
      for (let j = 0; j < salas.length; j++) {
        result[indiceResult] = {
          name: `capacidade-t${i + 1}s${j + 1}h2`,
          vars: [
            {
              name: `t${i + 1}s${j + 1}h2`,
              coef: turmas[i].totalTurma - salas[j].capacidade + delta1,
            },
          ],
          bnds: { type: glpk.GLP_UP, ub: 0.0, lb: 0.0 },
        };
        indiceResult++;
      }
    }

    console.log(`DEBUG resolve: Constraints geradas: ${result.length}`);
    return result;
  }

  function getBinaries() {
    let result = new Array();
    let indiceResult = 0;
    // Binaries H1 (F1 + F12)
    for (let i = 0; i < turmasF1.length + turmasF12.length; i++) {
      for (let j = 0; j < salas.length; j++) {
        result[indiceResult] = `t${i + 1}s${j + 1}h1`;
        indiceResult++;
      }
    }
    // Binaries H2 (F2 apenas) - CORREÇÃO: Loop só para F2
    for (let i = turmasF1.length + turmasF12.length; i < turmas.length; i++) {
      for (let j = 0; j < salas.length; j++) {
        result[indiceResult] = `t${i + 1}s${j + 1}h2`;
        indiceResult++;
      }
    }
    console.log(`DEBUG resolve: Binaries geradas: ${result.length}`);
    return result;
  }

  function generateModel() {
    let varsPAS = getVariables();
    let constraintsPAS = getConstraints();
    let binariesPAS = getBinaries();

    let result = {
      name: "ModeloPAS",
      objective: {
        direction: glpk.GLP_MIN,
        name: "obj",
        vars: varsPAS,
      },
      subjectTo: constraintsPAS,
      binaries: binariesPAS,
    };
    console.log(
      `DEBUG resolve: Modelo GLPK gerado - Rows(Constraints): ${constraintsPAS.length}, Cols(Vars): ${varsPAS.length}, Binaries: ${binariesPAS.length}`,
    );
    return result;
  }

  let modeloPAS = generateModel();
  console.log(`DEBUG resolve: Iniciando GLPK.solve...`);
  const res = glpk.solve(modeloPAS, options);
  console.log(
    `DEBUG resolve: GLPK output - status: ${res.result.status}, z(obj): ${res.result.z}, vars count: ${Object.keys(res.result.vars || {}).length}`,
  );

  // ADICIONAR: Diagnóstico para status=4 (inviável)
  if (res.result.status === 4) {
    console.error(`[ERRO resolve] MODELO INVIÁVEL! Possíveis causas:`);
    console.error(
      `- Turmas: ${turmas.length}, Salas: ${salas.length} (se turmas > salas, falha)`,
    );

    // Cálculo preciso para capacidade
    const maxTurmaSize =
      turmas.length > 0 ? Math.max(...turmas.map((t) => t.totalTurma || 0)) : 0;
    const minSalaCap =
      salas.length > 0
        ? Math.min(...salas.map((s) => s.capacidade || s.capacidade || 0))
        : 0; // Fallback para 'capacidade' ou 'capacidade'
    console.error(
      `- Capacidades: Max turma=${maxTurmaSize} > Min sala=${minSalaCap} + delta=${delta}? (${maxTurmaSize > minSalaCap + delta ? "SIM - INVIÁVEL!" : "NÃO"})`,
    );

    // Média das distâncias na matriz (se alta ~99999, distâncias ruins)
    const flatDistancias = distanciasCalculadas.flat();
    const avgDist =
      flatDistancias.length > 0
        ? flatDistancias.reduce((a, b) => a + b, 0) / flatDistancias.length
        : 0;
    console.error(
      `- Distancias: Média na matriz: ${avgDist.toFixed(2)} (se ~${placeholder}, muitas distâncias missing/ruins)`,
    );

    // Vars com valor 1 (deve ser = turmas.length se factível)
    const varsComValor1 = Object.values(res.result.vars || {}).filter(
      (v) => v === 1,
    ).length;
    console.error(
      `- Vars com valor 1: ${varsComValor1} (deve ser = turmas.length=${turmas.length} se factível)`,
    );
  }

  function removeZeros(obj) {
    let objNoZeros = { ...obj };
    if (objNoZeros.result.vars) {
      for (var property in objNoZeros.result.vars) {
        if (objNoZeros.result.vars[property] == 0) {
          delete objNoZeros.result.vars[property];
        }
      }
    }
    return objNoZeros;
  }

  const respostaModelo = removeZeros(res);
  console.log(
    `=== RESUMO resolve: Status=${res.result.status} (${res.result.status === 5 ? "OPTIMAL" : "OUTRO"}), Vars finais: ${Object.keys(respostaModelo.result.vars || {}).length}, Z=${respostaModelo.result.z} ===`,
  );

  return respostaModelo;
}

exports.resolve = resolve;
