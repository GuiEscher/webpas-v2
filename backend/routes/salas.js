const express = require('express');
const router = express.Router();
const Sala = require('../models/sala.model');
const Config = require('../models/config.model');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const XLSX = require('xlsx');

// Configuração do multer para buffer em memória
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/uploadPlanilha', protect, upload.single('file'), async (req, res) => {
    console.log('--- ROTA /salas/uploadPlanilha ACIONADA ---');
    if (!req.file) {
        return res.status(400).json({ msg: 'Nenhum arquivo de planilha enviado.' });
    }

    try {
        const userId = req.user._id;
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = 'AT';
        const salasSheet = workbook.Sheets[sheetName];
        if (!salasSheet) {
            return res.status(400).json({ msg: `Aba "${sheetName}" não encontrada na planilha.` });
        }

        // Encontrar a posição inicial da coluna "AT"
        const range = XLSX.utils.decode_range(salasSheet['!ref']);
        let startRow = -1;
        let startColAt = -1;
        for (let R = 0; R <= Math.min(10, range.e.r); ++R) {
            for (let C = 0; C <= Math.min(10, range.e.c); ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = salasSheet[cellAddress];
                if (cell && cell.v && String(cell.v).trim().startsWith('AT')) {
                    startRow = R;
                    startColAt = C;
                    break;
                }
            }
            if (startRow !== -1) break;
        }

        if (startRow === -1 || startColAt === -1) {
            return res.status(400).json({ msg: 'Coluna "AT" não localizada na aba "AT".' });
        }

        const colIndices = [startColAt - 3, startColAt - 2, startColAt - 1, startColAt, startColAt + 1, startColAt + 2];
        const salasParaSalvar = [];

        // Buscar config do usuário
        const config = await Config.findOne({ user: userId });
        if (!config) {
            return res.status(400).json({ msg: 'Configuração do usuário não encontrada.' });
        }
        const dias = config.dias || ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
        const periodMap = { M: 'Manhã', T: 'Tarde', N: 'Noite' };

        // Deletar salas existentes para este usuário (substituição completa)
        await Sala.deleteMany({ user: userId });

        // Extrair dados a partir da linha inicial
        for (let R = startRow; R <= range.e.r; ++R) {
            const rowCells = colIndices.map(C => {
                if (C < 0 || C > range.e.c) return '';
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = salasSheet[cellAddress];
                return cell ? cell.v : '';
            });
            const [M_str, T_str, N_str, AT, Sala_str, Cap_str] = rowCells.map(v => String(v).trim());
            const M = parseInt(M_str) || 0;
            const T = parseInt(T_str) || 0;
            const N = parseInt(N_str) || 0;
            const Cap = parseInt(Cap_str) || 0;

            if (AT && Sala_str && Cap > 0) {
                const predio = AT.trim();
                const numeroSala = Sala_str.trim();
                const disponibilidade = [];

                // Expandir disponibilidade para todos os dias e períodos
                dias.forEach(dia => {
                    Object.entries({ M, T, N }).forEach(([key, valor]) => {
                        if (periodMap[key]) {
                            disponibilidade.push({
                                dia,
                                periodo: periodMap[key],
                                disponivel: valor === 1
                            });
                        }
                    });
                });

                salasParaSalvar.push({
                    predio,
                    numeroSala,
                    capacidade: Cap,
                    disponibilidade,
                    tipoQuadro: 'Indiferente', // Default para importação via Planilha
                    terreo: false, // Default
                    acessivel: false, // Default
                    user: userId
                });
            }
        }

        if (salasParaSalvar.length === 0) {
            return res.status(400).json({ msg: 'Nenhuma sala válida encontrada na aba "AT".' });
        }

        const result = await Sala.insertMany(salasParaSalvar);
        res.status(201).json({ msg: `Processamento concluído. ${result.length} salas foram adicionadas com sucesso.` });
    } catch (error) {
        console.error('Erro ao processar a planilha de salas:', error);
        res.status(500).json({ msg: 'Ocorreu um erro interno ao processar o arquivo.' });
    }
});

// --- ROTAS ---

router.route('/').get(protect, (req, res) => {
    const user = req.user;
    Sala.find({ user: user._id })
        .then(salas => res.json(salas))
        .catch(err => res.status(400).json('Error: ' + err));
});

router.route('/p/').get(protect, (req, res) => {
    const user = req.user;
    Sala.find({ user: user._id }).distinct('predio')
        .then(predios => res.json(predios))
        .catch(err => res.status(400).json(err));
});

// ATUALIZADO: Recebe tipoQuadro e salva nas salas
router.route('/addPredio').post(protect, (req, res) => {
    const { predio, capacidade, nSalas, disponibilidade, tipoQuadro } = req.body;
    const user = req.user;
    
    const quadroDefinido = tipoQuadro || 'Indiferente';

    Sala.find({ predio: predio, user: user._id })
        .then(salas => {
            if (salas.length > 0) {
                return res.status(400).json({ code: 1, msg: 'Um prédio com o nome ' + predio + ' já existe' });
            }
            const novasSalas = Array.from({ length: nSalas }, (_, i) => ({
                predio: predio,
                numeroSala: 'Sala ' + (i + 1),
                capacidade: capacidade,
                disponibilidade: disponibilidade,
                tipoQuadro: quadroDefinido, // Salva o tipo de quadro
                user: user._id
            }));
            Sala.insertMany(novasSalas)
                .then(() => res.json('Predio adicionado'))
                .catch(err => res.status(400).json('Error: ' + err));
        }).catch(err => res.status(400).json('Error: ' + err));
});

router.route('/:predio').get(protect, (req, res) => {
    const user = req.user;
    Sala.find({ predio: req.params.predio, user: user._id })
        .then(salas => res.json(salas))
        .catch(err => res.status(400).json('Error: ' + err));
});

router.route('/:predio/update').post(protect, (req, res) => {
    const predioVelho = req.params.predio;
    const { predioNovo } = req.body;
    const user = req.user;
    Sala.find({ predio: predioNovo, user: user._id })
        .then(salasN => {
            if (salasN.length > 0) {
                return res.status(400).json({ code: 1, msg: 'Um prédio com o nome ' + predioNovo + ' já existe' });
            }
            Sala.updateMany({ predio: predioVelho, user: user._id }, { predio: predioNovo })
                .then(() => res.json('Predio Atualizado'))
                .catch(err => res.status(400).json('Error: ' + err));
        }).catch(err => res.status(400).json('Error: ' + err));
});

router.route('/:predio/delete').delete(protect, (req, res) => {
    const user = req.user;
    Sala.deleteMany({ predio: req.params.predio, user: user._id })
        .then(() => res.json('Predio deletado'))
        .catch(err => res.status(400).json('Error: ' + err));
});

// ATUALIZADO: Adicionar sala avulsa com quadro específico
router.route('/:predio/addSala').post(protect, (req, res) => {
    const predio = req.params.predio;
    const { numeroSala, capacidade, disponibilidade, tipoQuadro } = req.body;
    const user = req.user;
    
    const novaSala = new Sala({ 
        predio, 
        numeroSala, 
        capacidade, 
        disponibilidade, 
        tipoQuadro: tipoQuadro || 'Indiferente',
        user: user._id 
    });

    novaSala.save()
        .then(() => res.json('Sala adicionada'))
        .catch(err => { res.status(400).json(err) });
});

// ATUALIZADO: Editar sala (incluindo quadro)
router.route('/:predio/update/:id').post(protect, (req, res) => {
    Sala.findById(req.params.id)
        .then(sala => {
            sala.numeroSala = req.body.numeroSala;
            sala.capacidade = req.body.capacidade;
            sala.disponibilidade = req.body.disponibilidade;
            if(req.body.tipoQuadro) {
                sala.tipoQuadro = req.body.tipoQuadro;
            }
            sala.save()
                .then(() => res.json('Sala atualizada'))
                .catch(err => res.status(400).json(err));
        })
        .catch(err => res.status(400).json(err));
});

router.route('/:id').delete(protect, (req, res) => {
    Sala.findByIdAndDelete(req.params.id)
        .then(() => res.json('Sala deletada'))
        .catch(err => res.status(400).json(err));
});

router.route('/deleteMany').post(protect, (req, res) => {
    const salasIds = req.body.salasID;
    Sala.deleteMany({ _id: { $in: salasIds } })
        .then(() => res.json('Salas deletadas'))
        .catch(err => res.status(400).json(err));
});

router.route('/arquivosala').post(protect, (req, res) => {
    let novasSalas = req.body.novasSalas;
    novasSalas.forEach(sala => sala.user = req.user._id);
    Sala.insertMany(novasSalas, { ordered: false })
        .then(() => res.json('Salas adicionadas'))
        .catch(err => res.status(400).json(err));
});

module.exports = router;