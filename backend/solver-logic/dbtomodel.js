let Sala = require('../models/sala.model')
let Turma = require('../models/turma.model')
let Distancia = require('../models/distancia.model')
let Config = require('../models/config.model')

// Função auxiliar para normalizar strings (trim aspas e espaços)
const normalizarString = (str) => {
    if (!str) return '';
    return String(str).trim().replace(/^['"]|['"]$/g, '');  // Remove aspas simples/duplas no início/fim
};

// Função para formatar horário config para HHMM (sem :)
const formatarHorarioParaDB = (horario) => {
    if (!horario) return '';
    // Assume input como "08:00" -> "0800"
    return horario.replace(':', '');  // Remove :, resulta em "0800"
};

async function dbtomodel(ano, semestre, periodo, diaDaSemana, user, predioAux, minAlunos) {
    // Log inicial apenas com params essenciais (reduzido para evitar repetição)
    console.log(`[dbtomodel] ${periodo}/${diaDaSemana}: Iniciando (turmas >=${minAlunos}, aux=${predioAux})`);

    let modelo = {
        turmasf1: [],
        turmasf12: [],
        turmasf2: [],
        salas: [],
        distancias: []
    }

    const config = await Config.find({ user: user._id });
    if (config.length === 0) {
        console.error(`[dbtomodel] ${periodo}/${diaDaSemana}: Nenhuma config encontrada para user ${user._id} — abortando.`);
        return modelo; // Retorna vazio
    }

    // Formate horários da config para matchar DB (HHMM sem :)
    let horarioInicioF1 = formatarHorarioParaDB(config[0].horarios[periodo]['Início'].slot1);
    let horarioFimF1 = formatarHorarioParaDB(config[0].horarios[periodo]['Fim'].slot1);
    let horarioInicioF12 = formatarHorarioParaDB(config[0].horarios[periodo]['Início'].slot1);
    let horarioFimF12 = formatarHorarioParaDB(config[0].horarios[periodo]['Fim'].slot2);
    let horarioInicioF2 = formatarHorarioParaDB(config[0].horarios[periodo]['Início'].slot2);
    let horarioFimF2 = formatarHorarioParaDB(config[0].horarios[periodo]['Fim'].slot2);

    // Normalize param dia
    const diaNormalizado = normalizarString(diaDaSemana);
    // $in para cobrir aspas no DB (ex: ['Segunda', "'Segunda'"])
    const opcoesDia = [diaNormalizado, `'${diaNormalizado}'`];

    // Log de horários e dia apenas uma vez por unit (útil para debug)
    console.log(`[dbtomodel] ${periodo}/${diaDaSemana}: Horários: F1=${horarioInicioF1}-${horarioFimF1}, F12=${horarioInicioF12}-${horarioFimF12}, F2=${horarioInicioF2}-${horarioFimF2} | Dia opções: ${JSON.stringify(opcoesDia)}`);

    // Queries com $in para diaDaSemana (flexível para aspas no DB) — log reduzido, só counts + 1 ex
    modelo.turmasf1 = await Turma.find({
        ano: ano,
        semestre: semestre,
        diaDaSemana: { $in: opcoesDia },
        horarioInicio: horarioInicioF1,
        horarioFim: horarioFimF1,
        user: user._id,
        totalTurma: { $gte: minAlunos }
    });
    const exF1 = modelo.turmasf1[0]?.idTurma || 'N/A';
    console.log(`[dbtomodel] ${periodo}/${diaDaSemana}: F1: ${modelo.turmasf1.length} turmas (ex: ${exF1})`);

    modelo.turmasf12 = await Turma.find({
        ano: ano,
        semestre: semestre,
        diaDaSemana: { $in: opcoesDia },
        horarioInicio: horarioInicioF12,
        horarioFim: horarioFimF12,
        user: user._id,
        totalTurma: { $gte: minAlunos }
    });
    const exF12 = modelo.turmasf12[0]?.idTurma || 'N/A';
    console.log(`[dbtomodel] ${periodo}/${diaDaSemana}: F12: ${modelo.turmasf12.length} turmas (ex: ${exF12})`);

    modelo.turmasf2 = await Turma.find({
        ano: ano,
        semestre: semestre,
        diaDaSemana: { $in: opcoesDia },
        horarioInicio: horarioInicioF2,
        horarioFim: horarioFimF2,
        user: user._id,
        totalTurma: { $gte: minAlunos }
    });
    const exF2 = modelo.turmasf2[0]?.idTurma || 'N/A';
    console.log(`[dbtomodel] ${periodo}/${diaDaSemana}: F2: ${modelo.turmasf2.length} turmas (ex: ${exF2})`);

    const totalTurmas = modelo.turmasf1.length + modelo.turmasf12.length + modelo.turmasf2.length;
    if (totalTurmas === 0) {
        console.warn(`[dbtomodel] ${periodo}/${diaDaSemana}: AVISO: 0 turmas qualificadas! Verifique horários/minAlunos.`);
    } else {
        console.log(`[dbtomodel] ${periodo}/${diaDaSemana}: Total turmas: ${totalTurmas}`);
    }

    // Salas: Normalize disp.dia também
    const salasDB = await Sala.find({ user: user._id });
    salasDB.forEach(sala => {
        let dispArray = sala.disponibilidade || [];
        dispArray.forEach(disp => {
            const dispDiaNormalizado = normalizarString(disp.dia);
            if (dispDiaNormalizado === diaNormalizado && disp.periodo === periodo && disp.disponivel === true) {
                modelo.salas.push(sala);
            }
        });
    });

    if (predioAux) {
        const numAux = config[0].numSalasAux || 0;
        for (let i = 0; i < numAux; i++) {
            let salaAux = new Sala({
                predio: "predioAux",
                numeroSala: "Sala A" + i.toString(),
                capacidade: config[0].capSalasAux || 0,
                user: user._id
            });
            modelo.salas.push(salaAux);
        }
    }

    // Distancias: Normalize predio/dept
    const distanciasDb = await Distancia.find({ user: user._id });
    modelo.distancias = distanciasDb.reduce((acc, cur) => {
        const predioNorm = normalizarString(cur.predio);
        const deptNorm = normalizarString(cur.departamento);
        acc[predioNorm] = acc[predioNorm] || {};
        acc[predioNorm][deptNorm] = cur.valorDist;
        return acc;
    }, {});
    if (predioAux) {
        modelo.distancias.predioAux = {};  // Vazio
    }

    // Resumo final (útil, mantém para cada unit)
    console.log(`[dbtomodel] ${periodo}/${diaDaSemana}: RESUMO - Turmas=${totalTurmas}, Salas=${modelo.salas.length}, Distancias=${Object.keys(modelo.distancias).length} prédios`);

    return modelo;
}

exports.dbtomodel = dbtomodel;