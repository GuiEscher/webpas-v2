const express = require('express');
const router = express.Router();
const Distancia = require('../models/distancia.model');
const Turma = require('../models/turma.model');
const Sala = require('../models/sala.model');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const XLSX = require('xlsx');
const { canonizarCampus } = require('../utils/campus');
const { parseDistanciasSheet } = require('../utils/planilha-distancias');

// A aba pode vir como "Distancias", "Distâncias" ou variações de caixa.
const acharAbaDistancias = (workbook) => {
    const alvo = 'distancias';
    return workbook.SheetNames.find(
        (nome) =>
            String(nome)
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim()
                .toLowerCase() === alvo,
    );
};

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
        const campus = canonizarCampus(req.body.campus || req.body.campusSelecionado);
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = acharAbaDistancias(workbook);
        if (!sheetName) {
            return res.status(400).json({ msg: 'Aba "Distancias" não encontrada na planilha.' });
        }

        const { distancias, departamentos, predios } = parseDistanciasSheet(
            XLSX,
            workbook.Sheets[sheetName],
        );

        if (distancias.length === 0) {
            return res.status(400).json({
                msg: 'Nenhuma distância válida encontrada na aba "Distancias". '
                    + 'A matriz precisa ter uma célula de cabeçalho "predio", com os departamentos à direita e os prédios abaixo.',
            });
        }

        const distanciasParaSalvar = distancias.map((d) => ({ ...d, campus, user: userId }));

        // Só apaga o que já existe depois de saber que há dados válidos para
        // repor — antes, uma planilha ilegível zerava as distâncias do campus.
        // O backup permite desfazer se a inserção falhar.
        const backup = await Distancia.find({ user: userId, campus }).lean();
        await Distancia.deleteMany({ user: userId, campus });

        let result;
        try {
            result = await Distancia.insertMany(distanciasParaSalvar);
        } catch (erroInsercao) {
            if (backup.length > 0) {
                await Distancia.insertMany(backup, { ordered: false }).catch(() => {});
            }
            throw erroInsercao;
        }

        console.log(
            `[distancias] ${sheetName}: ${predios.length} prédio(s) x ${departamentos.length} departamento(s) `
            + `= ${result.length} distância(s) em ${campus}.`,
        );
        res.status(201).json({
            msg: `Processamento concluído. ${result.length} distâncias foram adicionadas com sucesso `
                + `(${predios.length} prédios x ${departamentos.length} departamentos).`,
        });
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