const router = require('express').Router();
const Turma = require('../models/turma.model');
const { protect } = require("../middleware/auth");
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- ROTA DE UPLOAD CSV ---
router.post('/upload-csv', protect, upload.single('file'), async (req, res) => {
    console.log('--- ROTA /upload-csv ACIONADA ---');

    if (!req.file) {
        return res.status(400).json({ msg: 'Nenhum arquivo enviado.' });
    }

    const { ano, semestre, campusSelecionado } = req.body;
    const userId = req.user._id;

    console.log(`[INFO] Upload para: ${campusSelecionado || 'São Carlos'} | ${ano}/${semestre}`);

    if (!ano || !semestre) {
        return res.status(400).json({ msg: 'Ano e semestre são obrigatórios.' });
    }

    // 1. Detecção de Separador (; ou ,)
    const fileContent = req.file.buffer.toString('utf8');
    const primeiraLinha = fileContent.split('\n')[0];
    
    const countVirgula = (primeiraLinha.match(/,/g) || []).length;
    const countPontoVirgula = (primeiraLinha.match(/;/g) || []).length;
    
    let separator = ';'; 
    if (countVirgula > countPontoVirgula) separator = ',';
    
    console.log(`[DEBUG] Separador detectado: '${separator}'`);

    const turmasParaSalvar = [];
    let linhaCount = 0;

    const readableFileStream = new Readable();
    readableFileStream.push(req.file.buffer);
    readableFileStream.push(null);

    readableFileStream
        .pipe(csv({ 
            separator: separator, 
            mapHeaders: ({ header }) => header.trim().replace(/'/g, '').replace(/"/g, '').toLowerCase()
        })) 
        .on('data', (row) => {
            linhaCount++;
            try {
                let novaTurma = {};

                // --- 1. CORREÇÃO: Turma Vazia vira 'A' ---
                let letraTurma = row['turma'];
                if (!letraTurma || String(letraTurma).trim() === '' || String(letraTurma).toLowerCase() === 'null') {
                    letraTurma = 'A';
                }

                // --- 2. CORREÇÃO: Alocado Chefia (true, t, 1, sim) ---
                let isAlocadoChefia = false;
                const rawAlocado = row['alocado_chefia'];
                if (rawAlocado) {
                    const val = String(rawAlocado).trim().toLowerCase();
                    // Verifica todas as variações possíveis de "Sim"
                    if (['true', 't', '1', 'sim', 's', 'yes', 'y'].includes(val)) {
                        isAlocadoChefia = true;
                    }
                }

                // --- LÓGICA POR CAMPUS ---
                if (campusSelecionado === 'Sorocaba') {
                    if (!row['cod_discip'] && !row['nome']) return;

                    // Tratamento de Campus (Null vira Sorocaba)
                    let campusValue = row['campus'];
                    const campusCheck = String(campusValue || '').trim().toLowerCase();
                    if (!campusValue || campusCheck === '' || campusCheck === 'null' || campusCheck === '(null)') {
                        campusValue = 'Sorocaba';
                    }

                    const hInicio = row['hora_inicio'] ? String(Number(row['hora_inicio'])) : '0';
                    const hFim = row['hora_termino'] ? String(Number(row['hora_termino'])) : '0';

                    novaTurma = {
                        idTurma: `${row['cod_discip'] || ''}-${letraTurma}`,
                        campus: campusValue,
                        departamentoTurma: row['departamento'] || 'N/A',
                        codDisciplina: row['cod_discip'] || 'N/A',
                        turma: letraTurma, 
                        nomeDisciplina: row['nome'] || 'N/A',
                        totalTurma: Number(row['numero_vagas']) || 0,
                        departamentoOferta: row['departamento'] || 'N/A',
                        diaDaSemana: row['dia'] || 'N/A',
                        horarioInicio: hInicio,
                        horarioFim: hFim, 
                        creditosAula: Number(row['cred_aula']) || 0,
                        docentes: row['ministrantes'] || 'N/A',
                        ano: Number(ano),
                        semestre: Number(semestre),
                        user: userId,
                        alocadoChefia: isAlocadoChefia, // Salva o booleano correto
                        tipoQuadro: 'Indiferente'
                    };
                } else {
                    // São Carlos
                    if ((!row['cod_discip'] || row['cod_discip'] === '') && (!row['nome'] || row['nome'] === '')) return;

                    const hInicioSC = row['hora_inicio'] ? String(Number(row['hora_inicio'])) : '0';
                    const hFimSC = row['hora_fim'] ? String(Number(row['hora_fim'])) : '0';

                    novaTurma = {
                        idTurma: `${row['cod_discip'] || ''}-${letraTurma}`, 
                        campus: 'São Carlos',
                        departamentoTurma: row['departamento'] || 'N/A',
                        codDisciplina: row['cod_discip'] || 'N/A',
                        turma: letraTurma, 
                        nomeDisciplina: row['nome'] || 'N/A',
                        totalTurma: Number(row['numero_vagas']) || 0,
                        departamentoOferta: row['departamento'] || 'N/A',
                        diaDaSemana: row['dia'] || 'N/A',
                        horarioInicio: hInicioSC,
                        horarioFim: hFimSC,
                        creditosAula: Number(row['cred_aula']) || 0,
                        docentes: row['ministrantes'] || 'N/A',
                        ano: Number(ano),
                        semestre: Number(semestre),
                        user: userId,
                        alocadoChefia: isAlocadoChefia, // Salva o booleano correto
                        tipoQuadro: 'Indiferente'
                    };
                }
                turmasParaSalvar.push(novaTurma);
            } catch (e) { console.error(`Erro processando linha ${linhaCount}`, e); }
        })
        .on('end', async () => {
            console.log(`\n[RESUMO] Linhas lidas: ${linhaCount} | Válidas: ${turmasParaSalvar.length}`);
            
            if (turmasParaSalvar.length === 0) {
                return res.status(400).json({ msg: `Erro: Nenhuma turma identificada. Verifique o arquivo.` });
            }

            try {
                await Turma.insertMany(turmasParaSalvar, { ordered: false });
                res.status(201).json({ msg: `${turmasParaSalvar.length} turmas processadas com sucesso!` });
            } catch (error) {
                if (error.code === 11000 || (error.writeErrors && error.writeErrors.length > 0)) {
                    const duplicados = error.writeErrors ? error.writeErrors.length : 0;
                    const salvos = turmasParaSalvar.length - duplicados;
                    return res.status(201).json({ msg: `Upload parcial: ${salvos} novas turmas salvas. (${duplicados} já existiam).` });
                }
                res.status(500).json({ msg: 'Erro ao salvar no banco.', error: error.message });
            }
        })
        .on('error', (error) => {
            res.status(500).json({ msg: 'Erro fatal ao ler CSV.', error: error.message });
        });
});

// --- ROTAS PARA GERENCIAMENTO DE PERÍODOS ---

router.get('/info/semestres-disponiveis', protect, async (req, res) => {
    try {
        const user = req.user;
        const periodos = await Turma.aggregate([
            { $match: { user: user._id } },
            { $group: { _id: { ano: "$ano", semestre: "$semestre" } } },
            { $sort: { "_id.ano": -1, "_id.semestre": -1 } }
        ]);
        const formatado = periodos.map(p => ({ ano: p._id.ano, semestre: p._id.semestre }));
        res.json(formatado);
    } catch (err) { res.status(400).json(err); }
});

router.post('/delete-periodos', protect, async (req, res) => {
    const { periodos } = req.body; 
    const user = req.user;
    if (!periodos || periodos.length === 0) return res.status(400).json({ msg: "Nenhum período selecionado." });

    try {
        const query = {
            user: user._id,
            $or: periodos.map(p => ({ ano: p.ano, semestre: p.semestre }))
        };
        const result = await Turma.deleteMany(query);
        res.json({ msg: `${result.deletedCount} turmas deletadas com sucesso.` });
    } catch (err) { res.status(400).json(err); }
});

// --- ROTAS PADRÃO ---

const arrayUnique = array => [...new Set(array)];

router.route('/').get(protect,(req,res)=>{
    Turma.find({user:req.user._id}).then(turmas => res.json(turmas)).catch(err => res.status(400).json(err))
})

router.route('/d/').get(protect,(req,res)=>{
    const user = req.user
    Turma.find({user:user._id}).distinct('departamentoOferta')
        .then(departamentosOferta=>{
            Turma.find({user:user._id}).distinct('departamentoTurma')
                .then(departamentosTurma =>{
                    const departamentos = arrayUnique(departamentosOferta.concat(departamentosTurma))
                    res.json(departamentos)
                }).catch(err => res.status(400).json(err))
        }).catch(err => res.status(400).json(err))
})

router.route('/:ano/:semestre').get(protect,(req,res)=>{
    Turma.find({ano:req.params.ano,semestre:req.params.semestre,user:req.user._id})
        .then(turmas => res.json(turmas)).catch(err => res.json(err))
})

router.route('/dep/').get(protect,(req,res)=>{
    Turma.find({user:req.user._id}).distinct('departamentoOferta')
        .then(turmas => res.json(turmas)).catch(err => res.status(400).json(err))
})

router.route('/add').post(protect,(req,res) =>{
    const { idTurma, campus, departamentoTurma, codDisciplina, turma, nomeDisciplina, totalTurma, departamentoOferta, diaDaSemana, horarioInicio, horarioFim, creditosAula, creditosPratico, docente, ano, semestre, tipoQuadro, alocadoChefia } = req.body;
    const user = req.user;
    
    const hInicio = horarioInicio ? String(Number(horarioInicio)) : '';
    const hFim = horarioFim ? String(Number(horarioFim)) : '';
    const valorQuadro = tipoQuadro || 'Indiferente';
    const valorCampus = campus || 'São Carlos';
    
    const letraTurma = (turma && turma.trim() !== '') ? turma : 'A';
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
        alocadoChefia: alocadoChefia || false 
    });
    
    novaTurma.save().then(() => res.json('Turma adicionada')).catch(err => res.status(400).json(err));
})

router.route('/:id').get(protect,(req,res)=>{
    Turma.findById(req.params.id).then(turma => res.json(turma)).catch(err => res.status(400).json(err))
})

router.route('/arquivoturma').post(protect,async (req,res) =>{ 
    const novasTurmas = req.body.novasTurmas
    Turma.insertMany(novasTurmas,{ordered:false}).then(()=> res.json('Turmas adicionadas')).catch(err =>{ res.status(400).json(err)}) 
})

router.route('/delete/:id').delete(protect,(req,res)=>{
    Turma.findByIdAndDelete(req.params.id).then(()=> res.json('Turma deletada')).catch(err => res.status(400).json(err))
})

router.route('/deleteMany').post(protect,(req,res)=>{
    const turmasIds = req.body.turmasID
    Turma.deleteMany({_id:{$in:turmasIds}}).then(()=> res.json('Turmas deletadas')).catch(err => res.status(400).json(err))
})

router.route('/delete/:ano/:semestre').delete(protect,(req,res)=>{
    const {ano,semestre} = req.params
    Turma.deleteMany({user:req.user._id,ano:ano,semestre:semestre}).then(()=>res.json('Turmas deletadas')).catch(err=> res.status(400).json(err))
})

router.route('/update/:id').post(protect,(req,res)=>{
    Turma.findById(req.params.id)
        .then(turma => {
            Object.assign(turma, req.body);
            if (turma.horarioInicio) turma.horarioInicio = String(Number(turma.horarioInicio));
            if (turma.horarioFim) turma.horarioFim = String(Number(turma.horarioFim));
            
            if (!turma.turma || turma.turma.trim() === '') turma.turma = 'A';
            if (turma.codDisciplina && turma.turma) turma.idTurma = `${turma.codDisciplina}-${turma.turma}`;

            turma.save().then(() => res.json('Turma atualizada')).catch(err => res.status(400).json(err));
        })
        .catch(err => res.status(400).json(err));
})

module.exports = router;