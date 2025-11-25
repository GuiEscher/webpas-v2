const router = require('express').Router();
const Turma = require('../models/turma.model');
const { protect } = require("../middleware/auth");
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ... imports (manter os mesmos)

router.post('/upload-csv', protect, upload.single('file'), async (req, res) => {
    console.log('--- ROTA /upload-csv ACIONADA ---');

    if (!req.file) {
        return res.status(400).json({ msg: 'Nenhum arquivo enviado.' });
    }

    const { ano, semestre, campusSelecionado } = req.body;
    const userId = req.user._id;

    console.log(`[INFO] Processando upload para: ${campusSelecionado || 'São Carlos'} | ${ano}/${semestre}`);

    if (!ano || !semestre) {
        return res.status(400).json({ msg: 'Ano e semestre são obrigatórios.' });
    }

    // --- DETECÇÃO AUTOMÁTICA DE SEPARADOR ---
    const fileContent = req.file.buffer.toString('utf8');
    const primeiraLinha = fileContent.split('\n')[0];
    let separator = ';'; // Padrão
    
    // Se tiver mais vírgulas que ponto-e-vírgulas, assumimos vírgula
    if ((primeiraLinha.match(/,/g) || []).length > (primeiraLinha.match(/;/g) || []).length) {
        separator = ',';
    }
    
    console.log(`[DEBUG] Separador detectado: '${separator}' (Baseado na linha: ${primeiraLinha.substring(0, 50)}...)`);
    // ----------------------------------------

    const turmasParaSalvar = [];
    let linhaCount = 0;

    const readableFileStream = new Readable();
    readableFileStream.push(req.file.buffer);
    readableFileStream.push(null);

    readableFileStream
        .pipe(csv({ 
            separator: separator, // Usa o separador detectado
            mapHeaders: ({ header }) => header.trim().replace(/'/g, '').replace(/"/g, '').toLowerCase()
        })) 
        .on('data', (row) => {
            linhaCount++;

            // [DEBUG AVANÇADO] Mostra a primeira linha lida para conferirmos as colunas
            if (linhaCount === 1) {
                console.log('[DEBUG] Colunas lidas pelo Parser:', Object.keys(row));
                console.log('[DEBUG] Exemplo de linha bruta:', row);
            }

            try {
                let novaTurma = {};

                // === LÓGICA SOROCABA ===
                if (campusSelecionado === 'Sorocaba') {
                    
                    // Verificação se as colunas essenciais existem no CSV de Sorocaba
                    // Você disse que as colunas são: cod_discip, nome, turma...
                    if (!row['cod_discip'] && !row['nome']) {
                        // Se falhar aqui, o parser não achou as colunas com esses nomes exatos
                        return; 
                    }

                    // Tratamento Campus
                    let campusValue = row['campus'];
                    if (!campusValue || String(campusValue).trim() === '' || String(campusValue).toLowerCase() === 'null') {
                        campusValue = 'Sorocaba';
                    }

                    // Tratamento Booleanos (alocado_chefia)
                    const alocadoStr = row['alocado_chefia'] ? String(row['alocado_chefia']).toLowerCase() : 'false';
                    const isAlocadoChefia = (alocadoStr === 'true' || alocadoStr === 'sim' || alocadoStr === 's');

                    novaTurma = {
                        idTurma: `${row['cod_discip'] || ''}-${row['turma'] || ''}`,
                        campus: campusValue,
                        departamentoTurma: row['departamento'] || 'N/A',
                        codDisciplina: row['cod_discip'] || 'N/A',
                        turma: row['turma'] || 'N/A',
                        nomeDisciplina: row['nome'] || 'N/A',
                        totalTurma: Number(row['numero_vagas']) || 0,
                        departamentoOferta: row['departamento'] || 'N/A',
                        diaDaSemana: row['dia'] || 'N/A',
                        horarioInicio: String(row['hora_inicio'] || '0').padStart(4, '0'),
                        horarioFim: String(row['hora_termino'] || '0').padStart(4, '0'), // Sorocaba usa hora_termino
                        creditosAula: Number(row['cred_aula']) || 0,
                        docentes: row['ministrantes'] || 'N/A',
                        ano: Number(ano),
                        semestre: Number(semestre),
                        user: userId,
                        alocadoChefia: isAlocadoChefia,
                        tipoQuadro: 'Indiferente'
                    };
                } 
                // === LÓGICA SÃO CARLOS ===
                else {
                    if (!row['cod_discip'] && !row['nome']) return;

                    novaTurma = {
                        idTurma: `${row['cod_discip'] || ''}-${row['turma'] || ''}`,
                        campus: row['campus'] || 'São Carlos',
                        departamentoTurma: row['departamento'] || 'N/A',
                        codDisciplina: row['cod_discip'] || 'N/A',
                        turma: row['turma'] || 'N/A',
                        nomeDisciplina: row['nome'] || 'N/A',
                        totalTurma: Number(row['numero_vagas']) || 0,
                        departamentoOferta: row['departamento'] || 'N/A',
                        diaDaSemana: row['dia'] || 'N/A',
                        horarioInicio: String(row['hora_inicio'] || '0').padStart(4, '0'),
                        horarioFim: String(row['hora_fim'] || '0').padStart(4, '0'),
                        creditosAula: Number(row['cred_aula']) || 0,
                        docentes: row['ministrantes'] || 'N/A',
                        ano: Number(ano),
                        semestre: Number(semestre),
                        user: userId,
                        tipoQuadro: 'Indiferente'
                    };
                }

                // Push
                turmasParaSalvar.push(novaTurma);

            } catch (e) {
                console.error(`Erro processando linha ${linhaCount}`, e);
            }
        })
        .on('end', async () => {
            console.log(`\n[RESUMO] Linhas lidas: ${linhaCount} | Válidas para salvar: ${turmasParaSalvar.length}`);

            if (turmasParaSalvar.length === 0) {
                // Aqui está o seu erro 400. Vamos mandar uma mensagem melhor pro frontend.
                return res.status(400).json({ 
                    msg: `Erro: CSV lido, mas nenhuma turma identificada. Separador usado: '${separator}'. Verifique se as colunas 'cod_discip' e 'nome' existem.` 
                });
            }

            try {
                await Turma.insertMany(turmasParaSalvar, { ordered: false });
                res.status(201).json({ msg: `${turmasParaSalvar.length} turmas salvas com sucesso!` });
            } catch (error) {
                if (error.code === 11000 || (error.writeErrors && error.writeErrors.length > 0)) {
                    const duplicados = error.writeErrors ? error.writeErrors.length : 0;
                    return res.status(201).json({ msg: `Salvas: ${turmasParaSalvar.length - duplicados}. Duplicadas ignoradas: ${duplicados}.` });
                }
                console.error(error);
                res.status(500).json({ msg: 'Erro ao salvar no banco.', error: error.message });
            }
        })
        .on('error', (error) => {
            console.error(error);
            res.status(500).json({ msg: 'Erro fatal ao ler CSV.' });
        });
});

// ... (Mantenha o resto das rotas GET, DELETE, ADD manual igual ao anterior) ...
// Abaixo apenas para garantir que o arquivo não quebre se você copiar e colar
const arrayUnique = array => {
    var a = array.concat();
    for(var i=0; i<a.length; ++i) {
        for(var j=i+1; j<a.length; ++j) {
            if(a[i] === a[j])
                a.splice(j--, 1);
        }
    }
    return a;
}

router.route('/').get(protect,(req,res)=>{
    const user = req.user
    Turma.find({user:user._id})
        .then(turmas => res.json(turmas))
        .catch(err => res.status(400).json(err))
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
    const user = req.user
    Turma.find({ano:req.params.ano,semestre:req.params.semestre,user:user._id})
        .then(turmas => res.json(turmas))
        .catch(err => res.json(err))
})

router.route('/dep/').get(protect,(req,res)=>{
    const user = req.user
    Turma.find({user:user._id}).distinct('departamentoOferta')
        .then(turmas => res.json(turmas))
        .catch(err => res.status(400).json(err))
})

router.route('/add').post(protect,(req,res) =>{
    const { idTurma, campus, departamentoTurma, codDisciplina, turma, nomeDisciplina, totalTurma, departamentoOferta, diaDaSemana, horarioInicio, horarioFim, creditosAula, creditosPratico, docente, ano, semestre, tipoQuadro } = req.body;
    const user = req.user;
    
    const valorQuadro = tipoQuadro || 'Indiferente';
    const valorCampus = campus || 'São Carlos';

    const novaTurma = new Turma({ idTurma, campus: valorCampus, departamentoTurma, codDisciplina, turma, nomeDisciplina, totalTurma, departamentoOferta, diaDaSemana, horarioInicio, horarioFim, creditosAula, creditosPratico, docente, ano, semestre, user: user._id, tipoQuadro: valorQuadro });
    
    novaTurma.save()
        .then(() => res.json('Turma adicionada'))
        .catch(err => res.status(400).json(err));
})

router.route('/:id').get(protect,(req,res)=>{
    Turma.findById(req.params.id)
        .then(turma => res.json(turma))
        .catch(err => res.status(400).json(err))
})

router.route('/arquivoturma').post(protect,async (req,res) =>{ 
    const novasTurmas = req.body.novasTurmas
    Turma.insertMany(novasTurmas,{ordered:false})
        .then(()=> res.json('Turmas adicionadas'))
        .catch(err =>{
            res.status(400).json(err)}) 
})

router.route('/delete/:id').delete(protect,(req,res)=>{
    Turma.findByIdAndDelete(req.params.id)
        .then(()=> res.json('Turma deletada'))
        .catch(err => res.status(400).json(err))
})

router.route('/deleteMany').post(protect,(req,res)=>{
    const turmasIds = req.body.turmasID
    Turma.deleteMany({_id:{$in:turmasIds}})
        .then(()=> res.json('Turmas deletadas'))
        .catch(err => res.status(400).json(err))
})

router.route('/delete/:ano/:semestre').delete(protect,(req,res)=>{
    const user = req.user
    const {ano,semestre} = req.params
    Turma.deleteMany({user:user._id,ano:ano,semestre:semestre})
        .then(()=>res.json('Turmas deletadas'))
        .catch(err=> res.status(400).json(err))

})

router.route('/update/:id').post(protect,(req,res)=>{
    Turma.findById(req.params.id)
        .then(turma => {
            Object.assign(turma, req.body);
            turma.save()
                .then(() => res.json('Turma atualizada'))
                .catch(err => res.status(400).json(err));
        })
        .catch(err => res.status(400).json(err));
})

module.exports = router;