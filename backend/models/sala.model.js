const mongoose = require('mongoose')

const Schema = mongoose.Schema

const salaSchema = new Schema({
    predio: {type:String, required:true, index:true},
    numeroSala:{type:String, required: true},
    capacidade:{type:Number,required:true},
    tipoQuadro: { type: String, enum: ['Verde', 'Branco', 'Indiferente'], default: 'Indiferente' },
    // Campus da sala. Default "São Carlos" para manter os dados existentes
    // (todos de São Carlos) sem migração de valor no schema.
    campus: { type: String, trim: true, default: 'São Carlos' },
    disponibilidade:[{
        dia:{type:String,required:true},
        periodo:{type:String,required:true},
        disponivel:{type:Boolean,required:true}
    }],
    terreo: { type: Boolean, default: false },
    acessivel: { type: Boolean, default: false },
    prancheta: { type: Boolean, default: false },
    laboratorio: { type: Boolean, default: false },
    regiao: { type: String, enum: ['norte', 'sul', null], default: null },
    user:{type:mongoose.Types.ObjectId,ref:'User',required:true}
})

// Índice único inclui campus: permite que São Carlos e Sorocaba tenham
// prédios/salas com o mesmo nome sem colidir.
salaSchema.index({predio: 1,numeroSala: 1,campus: 1,user:1}, {unique: true})

const Sala = mongoose.model('Sala',salaSchema)

// Sincroniza índices (remove o índice único antigo sem campus e cria o novo).
Sala.syncIndexes()
    .then(() => console.info('Salas: Índices sincronizados com sucesso.'))
    .catch((err) => console.error('Salas: Erro ao sincronizar índices:', err));

module.exports = Sala
