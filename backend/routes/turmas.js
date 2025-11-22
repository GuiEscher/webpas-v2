const router = require('express').Router();
const Turma = require('../models/turma.model');
const { protect } = require("../middleware/auth");
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/upload-csv', protect, upload.single('file'), async (req, res) => {
    console.log('--- ROTA /upload-csv ACIONADA ---');

    if (!req.file) {
        return res.status(400).json({ msg: 'Nenhum arquivo enviado.' });
    }

    const { ano, semestre } = req.body;
    const userId = req.user._id;

    if (!ano || !semestre) {
        return res.status(400).json({ msg: 'Ano e semestre são obrigatórios.' });
    }

    const turmasParaSalvar = [];
    const errosDeLeitura = [];
    let linhaCount = 0;

    const readableFileStream = new Readable();
    readableFileStream.push(req.file.buffer);
    readableFileStream.push(null);

    readableFileStream
        .pipe(csv({ 
            separator: ';',
            mapHeaders: ({ header }) => header.trim().replace(/'/g, '')
        })) 
       
        .on('data', (row) => {
            linhaCount++;
            console.log(`\n[Linha ${linhaCount} Bruta Recebida]:`, row);

            try {
                const novaTurma = {
                    idTurma: `${row.cod_discip || ''}-${row.turma || ''}`,
                    campus: row.campus || 'N/A',
                    departamentoTurma: row.departamento || 'N/A',
                    codDisciplina: row.cod_discip || 'N/A',
                    turma: row.turma || 'N/A',
                    nomeDisciplina: row.nome || 'N/A',
                    totalTurma: Number(row.numero_vagas) || 0,
                    departamentoOferta: row.departamento || 'N/A',
                    diaDaSemana: row.dia || 'N/A',
                    horarioInicio: String(row.hora_inicio || '0').padStart(4, '0'),
                    horarioFim: String(row.hora_fim || '0').padStart(4, '0'),
                    creditosAula: Number(row.cred_aula) || 0,
                    docentes: row.ministrantes || 'N/A',
                    ano: Number(ano),
                    semestre: Number(semestre),
                    user: userId,
                };
                
                console.log(`[Linha ${linhaCount} Formatada]:`, novaTurma);
                turmasParaSalvar.push(novaTurma);

            } catch (e) {
                console.error(`!!!! ERRO AO PROCESSAR A LINHA ${linhaCount} !!!!`, e);
                errosDeLeitura.push({ turma: row, tipo: `Erro ao ler linha: ${e.message}` });
            }
        })
        .on('end', async () => {
            console.log('\n--- FIM DA LEITURA DO ARQUIVO ---');
            console.log(`Total de turmas para salvar: ${turmasParaSalvar.length}`);
            
            if (turmasParaSalvar.length === 0) {
                return res.status(400).json({ msg: 'Nenhuma turma válida foi encontrada no arquivo.', erros: errosDeLeitura });
            }
            try {
                await Turma.insertMany(turmasParaSalvar, { ordered: false });
                console.log('--- SUCESSO AO SALVAR NO BANCO DE DADOS ---');
                res.status(201).json({ msg: `${turmasParaSalvar.length} turmas processadas com sucesso!`, erros: errosDeLeitura });
            } catch (error) {
                console.error('!!!! ERRO AO SALVAR NO MONGODB !!!!', error);
                const duplicados = error.writeErrors ? error.writeErrors.length : 0;
                res.status(409).json({ msg: `Conflito ao salvar. ${duplicados} turma(s) já existia(m).`, erros: [] });
            }
        })
        .on('error', (error) => {
            console.error('!!!! ERRO FATAL NO PARSER DO CSV !!!!', error);
            res.status(500).json({ msg: 'Erro fatal ao processar o arquivo CSV.', error: error.message });
        });
});


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
    const { idTurma, campus, departamentoTurma, codDisciplina, turma, nomeDisciplina, totalTurma, departamentoOferta, diaDaSemana, horarioInicio, horarioFim, creditosAula, creditosPratico, docente, ano, semestre } = req.body;
    const user = req.user;
    const novaTurma = new Turma({ idTurma, campus, departamentoTurma, codDisciplina, turma, nomeDisciplina, totalTurma, departamentoOferta, diaDaSemana, horarioInicio, horarioFim, creditosAula, creditosPratico, docente, ano, semestre, user: user._id });
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