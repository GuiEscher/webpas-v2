const GLPK = require('glpk.js');
const glpk = GLPK();

async function resolve(modelo, delta, mipGap, tmLim) {
    console.log(`DEBUG resolve: Iniciando com delta=${delta}, mipGap=${mipGap}, tmLim=${tmLim}`);

    const turmasF1 = modelo.turmasf1;
    const turmasF12 = modelo.turmasf12;
    const turmasF2 = modelo.turmasf2;
    const salas = modelo.salas;
    const delta1 = delta;
    const placeholder = 99999;

    const turmas = new Array().concat(turmasF1, turmasF12, turmasF2);
    console.log(`DEBUG resolve: Turmas totais: ${turmas.length} (F1:${turmasF1.length}, F12:${turmasF12.length}, F2:${turmasF2.length}), Salas: ${salas.length}`);
    
    if (turmas.length === 0) {
        console.warn(`AVISO resolve: Nenhuma turma — modelo vazio (0 vars, só constraints de salas). Solução trivial (status=5, vars={}).`);
    }

    if (salas.length === 0) {
        console.warn(`AVISO resolve: Nenhuma sala disponível — modelo inviável.`);
    }

    console.log("Delta", delta1);
    const indiceDistancias = modelo.distancias;
    console.log(`DEBUG resolve: Índice distancias tem ${Object.keys(indiceDistancias).length} predios`);

    const distanciasCalculadas = turmas.map((turma) => {
        return salas.map((sala) => {
            let departamentoUsado = turma.departamentoOferta;
            if ((turmasF1.includes(turma) || turmasF2.includes(turma)) && turma.departamentoTurma) {
                departamentoUsado = turma.departamentoTurma;
            }
            return indiceDistancias[sala.predio] && indiceDistancias[sala.predio][departamentoUsado] ? indiceDistancias[sala.predio][departamentoUsado] : placeholder;
        });
    });
    console.log(`DEBUG resolve: Matriz distancias calculada: ${distanciasCalculadas.length} turmas x ${distanciasCalculadas[0]?.length || 0} salas`);

    const options = {
        msglev: glpk.GLP_MSG_ALL,
        presol: true,
        cb: {
            call: progress => console.log("GLPK Progress:", progress),
            each: 1
        }
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
                result[indiceResult] = { name: `t${i + 1}s${j + 1}h1`, coef: distanciasCalculadas[i][j] };
                indiceResult++;
            }
        }
        // Vars para H2 (F2)
        for (let i = turmasF1.length; i < turmas.length; i++) {
            for (let j = 0; j < salas.length; j++) {
                result[indiceResult] = { name: `t${i + 1}s${j + 1}h2`, coef: distanciasCalculadas[i][j] };
                indiceResult++;
            }
        }
        console.log(`DEBUG resolve: Vars geradas: ${result.length} (esperado: ~${turmas.length * salas.length})`);
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
                bnds: { type: glpk.GLP_FX, ub: 1.0, lb: 1.0 }
            };
            indiceResult++;
        }

        // Trava turma H2
        for (let i = turmasF1.length; i < turmas.length; i++) {
            let varsSoma = new Array();
            let indiceVars = 0;
            for (let j = 0; j < salas.length; j++) {
                varsSoma[indiceVars] = { name: `t${i + 1}s${j + 1}h2`, coef: 1 };
                indiceVars++;
            }
            result[indiceResult] = {
                name: `travaTurma${i + 1}VariaSalaH2`,
                vars: varsSoma,
                bnds: { type: glpk.GLP_FX, ub: 1.0, lb: 1.0 }
            };
            indiceResult++;
        }

        // Trava sala H1/H2 (máx 1 turma por sala/horário)
        for (let j = 0; j < salas.length; j++) {
            let varsSomaH1 = new Array();
            let varsSomaH2 = new Array();
            let indiceVarsH1 = 0;
            let indiceVarsH2 = 0;

            for (let i = 0; i < turmasF1.length + turmasF12.length; i++) {
                varsSomaH1[indiceVarsH1] = { name: `t${i + 1}s${j + 1}h1`, coef: 1 };
                indiceVarsH1++;
            }
            result[indiceResult] = {
                name: `variaTurmaTravaSala${j + 1}H1`,
                vars: varsSomaH1,
                bnds: { type: glpk.GLP_UP, ub: 1.0, lb: 0.0 }
            };
            indiceResult++;

            for (let i = turmasF1.length; i < turmas.length; i++) {
                varsSomaH2[indiceVarsH2] = { name: `t${i + 1}s${j + 1}h2`, coef: 1 };
                indiceVarsH2++;
            }
            result[indiceResult] = {
                name: `variaTurmaTravaSala${j + 1}H2`,
                vars: varsSomaH2,
                bnds: { type: glpk.GLP_UP, ub: 1.0, lb: 0.0 }
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
                        { name: `t${i + 1}s${j + 1}h2`, coef: -1 }
                    ],
                    bnds: { type: glpk.GLP_FX, ub: 0.0, lb: 0.0 }
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
                        { name: `t${i + 1}s${j + 1}h1`, coef: turmas[i].totalTurma - salas[j].capacidade + delta1 }
                    ],
                    bnds: { type: glpk.GLP_UP, ub: 0.0, lb: 0.0 }
                };
                indiceResult++;
            }
        }
        for (let i = turmasF1.length; i < turmas.length; i++) {
            for (let j = 0; j < salas.length; j++) {
                result[indiceResult] = {
                    name: `capacidade-t${i + 1}s${j + 1}h2`,
                    vars: [
                        { name: `t${i + 1}s${j + 1}h2`, coef: turmas[i].totalTurma - salas[j].capacidade + delta1 }
                    ],
                    bnds: { type: glpk.GLP_UP, ub: 0.0, lb: 0.0 }
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
        // Binaries H1
        for (let i = 0; i < turmasF1.length + turmasF12.length; i++) {
            for (let j = 0; j < salas.length; j++) {
                result[indiceResult] = `t${i + 1}s${j + 1}h1`;
                indiceResult++;
            }
        }
        // Binaries H2
        for (let i = turmasF1.length; i < turmas.length; i++) {
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
            name: 'ModeloPAS',
            objective: {
                direction: glpk.GLP_MIN,
                name: 'obj',
                vars: varsPAS
            },
            subjectTo: constraintsPAS,
            binaries: binariesPAS
        };
        console.log(`DEBUG resolve: Modelo GLPK gerado - Rows(Constraints): ${constraintsPAS.length}, Cols(Vars): ${varsPAS.length}, Binaries: ${binariesPAS.length}`);
        return result;
    }

    let modeloPAS = generateModel();
    console.log(`DEBUG resolve: Iniciando GLPK.solve...`);
    const res = glpk.solve(modeloPAS, options);
    console.log(`DEBUG resolve: GLPK output - status: ${res.result.status}, z(obj): ${res.result.z}, vars count: ${Object.keys(res.result.vars || {}).length}`);

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
    console.log(`=== RESUMO resolve: Status=${res.result.status} (${res.result.status === 5 ? 'OPTIMAL' : 'OUTRO'}), Vars finais: ${Object.keys(respostaModelo.result.vars || {}).length}, Z=${respostaModelo.result.z} ===`);

    return respostaModelo;
}

exports.resolve = resolve;