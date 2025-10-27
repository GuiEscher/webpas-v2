const express = require('express');
const router = express.Router();
const Distancia = require('../models/distancia.model');
const Turma = require('../models/turma.model');
const Sala = require('../models/sala.model');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const XLSX = require('xlsx');

// Configuração do multer para buffer em memória
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/uploadPlanilha', protect, upload.single('file'), async (req, res) => {
    console.log('--- ROTA /distancias/uploadPlanilha ACIONADA ---');
    if (!req.file) {
        return res.status(400).json({ msg: 'Nenhum arquivo de planilha enviado.' });
    }

    try {
        const userId = req.user._id;
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = 'Distancias';
        const distSheet = workbook.Sheets[sheetName];
        if (!distSheet) {
            return res.status(400).json({ msg: `Aba "${sheetName}" não encontrada na planilha.` });
        }

        const range = XLSX.utils.decode_range(distSheet['!ref']);

        // Extrair headers da linha 0 (1-index), cols 1+ (B+)
        const headers = [];
        for (let C = 1; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
            const cell = distSheet[cellAddress];
            if (cell && cell.v) {
                headers.push(String(cell.v).trim());
            }
        }

        const distanciasParaSalvar = [];

        // Deletar distâncias existentes para este usuário (substituição completa)
        await Distancia.deleteMany({ user: userId });

        // Extrair dados a partir da linha 1 (2-index)
        for (let R = 1; R <= range.e.r; ++R) {
            const atAddress = XLSX.utils.encode_cell({ r: R, c: 0 }); // Col A
            const atCell = distSheet[atAddress];
            if (atCell && atCell.v && String(atCell.v).trim().startsWith('AT')) {
                const atOriginal = String(atCell.v).trim();
                const atMatch = atOriginal.match(/(AT\d+)/);
                const predio = atMatch ? atMatch[1] : null;
                if (!predio) continue;

                headers.forEach((depto, idx) => {
                    const col = 1 + idx;
                    const valAddress = XLSX.utils.encode_cell({ r: R, c: col });
                    const valCell = distSheet[valAddress];
                    let valorDist = 3000; // Default
                    if (valCell && valCell.v) {
                        valorDist = parseInt(valCell.v) || 3000;
                    }
                    // Salvar todas, incluindo 3000 se necessário; ajuste filtro se quiser ignorar defaults
                    const departamento = depto.replace(/^['"]|['"]$/g, '').trim(); // Remove aspas como no DB exemplo
                    if (departamento) {
                        distanciasParaSalvar.push({
                            predio,
                            departamento,
                            valorDist,
                            user: userId
                        });
                    }
                });
            }
        }

        if (distanciasParaSalvar.length === 0) {
            return res.status(400).json({ msg: 'Nenhuma distância válida encontrada na aba "Distancias".' });
        }

        const result = await Distancia.insertMany(distanciasParaSalvar);
        res.status(201).json({ msg: `Processamento concluído. ${result.length} distâncias foram adicionadas com sucesso.` });
    } catch (error) {
        console.error('Erro ao processar a planilha de distâncias:', error);
        res.status(500).json({ msg: 'Ocorreu um erro interno ao processar o arquivo.' });
    }
});

// --- ROTAS ANTIGAS (mantidas e corrigidas) ---
const arrayUnique = array => {
    var a = array.concat();
    for(var i=0; i<a.length; ++i) { 
        for(var j=i+1; j<a.length; ++j) { 
            if(a[i] === a[j]) a.splice(j--, 1); 
        } 
    }
    return a;
};

router.route('/').get(protect, (req, res) => {
    const user = req.user;
    Distancia.find({ user: user._id })
        .then(distancias => res.json(distancias))
        .catch(err => res.status(400).json('Error: ' + err));
});

router.route('/id/:id').get(protect, (req, res) => {
    Distancia.findById(req.params.id)
        .then(distancia => res.json(distancia))
        .catch(err => res.status(400).json('Error: ' + err));
});

router.route('/add').post(protect, (req, res) => {
    const { departamento, predio, valorDist } = req.body;
    const user = req.user;
    const novaDistancia = new Distancia({ departamento, predio, valorDist, user: user._id });
    novaDistancia.save()
        .then(() => res.json('Distancia adicionada'))
        .catch(err => res.status(400).json(err));
});

router.route('/arquivodistancia').post(protect, (req, res) => {
    const user = req.user;
    let novasDistancias = req.body.novasDistancias;
    novasDistancias.forEach(distancia => distancia.user = user._id);
    Distancia.insertMany(novasDistancias, { ordered: false })
        .then(() => res.json('Distancias adicionadas'))
        .catch(err => res.status(400).json(err));
});

router.route('/:id').delete(protect, (req, res) => {
    Distancia.findByIdAndDelete(req.params.id)
        .then(() => res.json('Distancia deletada'))
        .catch(err => res.status(400).json('Error: ' + err));
});

router.route('/update/:id').post(protect, (req, res) => {
    Distancia.findById(req.params.id)
        .then(distancia => {
            Object.assign(distancia, req.body);
            distancia.save()
                .then(() => res.json('Distancia atualizada'))
                .catch(err => res.status(400).json(err));
        })
        .catch(err => res.status(400).json(err));
});

router.route('/deleteMany').post(protect, (req, res) => {
    const distanciasIds = req.body.distanciasID;
    Distancia.deleteMany({ _id: { $in: distanciasIds } })
        .then(() => res.json('Distâncias deletadas'))
        .catch(err => res.status(400).json(err));
});

router.route('/iscomplete').get(protect, async (req, res) => {
    try {
        const user = req.user;
        const predios = await Sala.find({ user: user._id }).distinct('predio');
        const departamentosOferta = await Turma.find({ user: user._id }).distinct('departamentoOferta');
        const departamentosTurma = await Turma.find({ user: user._id }).distinct('departamentoTurma');
        const departamentos = arrayUnique(departamentosOferta.concat(departamentosTurma));
        
        const distancias = await Distancia.find({ user: user._id });
        const indiceDistancias = distancias.reduce((acc, cur) => {
            if (!acc[cur.predio]) acc[cur.predio] = {};
            acc[cur.predio][cur.departamento] = cur.valorDist;
            return acc;
        }, {});

        let distanciasFaltantes = { isComplete: true, distancias: [] };

        predios.forEach(predio => {
            departamentos.forEach(departamento => {
                if (!indiceDistancias[predio] || indiceDistancias[predio][departamento] === undefined) {
                    distanciasFaltantes.isComplete = false;
                    distanciasFaltantes.distancias.push({ predio, departamento });
                }
            });
        });
        res.send(distanciasFaltantes);
    } catch (err) {
        res.status(400).json(err);
    }
});

module.exports = router;