// db-save-data.js (atualizado com dotenv pra carregar .env)
require('dotenv').config(); // Adicione isso no topo pra ler ATLAS_URI do .env

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Importar modelos (ajuste caminhos conforme sua estrutura)
const Sala = require('./models/sala.model');
const Distancia = require('./models/distancia.model');
const Config = require('./models/config.model');
const User = require('./models/user.model'); // Ajuste se necessário (ex: user.model.js)

// Configurações
const MONGODB_URI = process.env.ATLAS_URI; // Agora carrega do .env (sem fallback local)
const USER_EMAIL = 'teste@gmail.com'; // SUBSTITUA pelo email real do user
const JSON_PATH = path.join(__dirname, 'dados_completos_final.json'); // Seu JSON aqui

async function loadFromJson() {
    try {
        // Conectar ao MongoDB (usando ATLAS_URI)
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Conectado ao MongoDB Atlas');

        // Buscar user por email
        const user = await User.findOne({ email: USER_EMAIL });
        if (!user) {
            throw new Error(`Usuário com email '${USER_EMAIL}' não encontrado.`);
        }
        const USER_ID = user._id;
        console.log(`✅ User encontrado: ${USER_ID} (email: ${USER_EMAIL})`);

        if (!fs.existsSync(JSON_PATH)) {
            throw new Error(`Arquivo JSON não encontrado: ${JSON_PATH}`);
        }

        const jsonData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
        if (!Array.isArray(jsonData)) {
            throw new Error('JSON deve ser um array de ATs.');
        }
        console.log(`📄 JSON lido: ${jsonData.length} ATs`);

        // Buscar config do usuário
        const config = await Config.findOne({ user: USER_ID });
        if (!config) {
            throw new Error(`Config não encontrado para o usuário ${USER_ID}`);
        }
        console.log('✅ Config carregada');
        const dias = config.dias || ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
        const periodMap = { M: 'Manhã', T: 'Tarde', N: 'Noite' };

        // Deletar dados existentes para este user
        await Sala.deleteMany({ user: USER_ID });
        await Distancia.deleteMany({ user: USER_ID });
        console.log('🗑️ Dados existentes removidos');

        let totalSalas = 0;
        let totalDistancias = 0;

        const salasParaSalvar = [];
        const distanciasParaSalvar = [];

        jsonData.forEach(at => {
            const predio = at.codigo;

            // Salvar salas
            if (at.salas && Array.isArray(at.salas)) {
                at.salas.forEach(salaData => {
                    if (salaData.Sala && salaData.Capacidade > 0) {
                        const disponibilidade = [];
                        dias.forEach(dia => {
                            Object.entries(salaData.disponibilidade || {}).forEach(([key, valor]) => {
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
                            numeroSala: String(salaData.Sala).trim(),
                            capacidade: parseInt(salaData.Capacidade),
                            disponibilidade,
                            terreo: false,
                            acessivel: false,
                            user: USER_ID
                        });
                        totalSalas++;
                    }
                });
            }

            // Salvar distâncias
            if (at.distancias_departamentos && typeof at.distancias_departamentos === 'object') {
                Object.entries(at.distancias_departamentos).forEach(([departamento, valorDist]) => {
                    const valor = parseInt(valorDist);
                    if (departamento && valor >= 0) {
                        const depClean = String(departamento).trim().replace(/^['"]|['"]$/g, '');
                        if (depClean) {
                            distanciasParaSalvar.push({
                                predio,
                                departamento: depClean,
                                valorDist: valor,
                                user: USER_ID
                            });
                            totalDistancias++;
                        }
                    }
                });
            }
        });

        if (salasParaSalvar.length > 0) {
            await Sala.insertMany(salasParaSalvar);
            console.log(`✅ ${totalSalas} salas salvas`);
        }

        if (distanciasParaSalvar.length > 0) {
            await Distancia.insertMany(distanciasParaSalvar);
            console.log(`✅ ${totalDistancias} distâncias salvas`);
        }

        console.log('\n🎉 Processo concluído! Verifique o banco de dados.');

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado do MongoDB');
    }
}

loadFromJson();