const mongoose = require('mongoose')

const Schema = mongoose.Schema

const distanciaSchema = new Schema({
    predio: {type:String, required:true, trim:true},
    departamento: {type:String, required:true, trim:true, },
    valorDist: {type:Number, required:true},
    // Campus da distância. Default "São Carlos" para manter os dados
    // existentes (todos de São Carlos) sem migração de valor no schema.
    campus: { type: String, trim: true, default: 'São Carlos' },
    user:{type:mongoose.Types.ObjectId,ref:'User',required:true}
})

// Índice único inclui campus: São Carlos e Sorocaba podem ter a mesma
// combinação prédio+departamento sem colidir.
distanciaSchema.index({predio: 1,departamento: 1,campus: 1,user:1}, {unique: true})

const Distancia = mongoose.model('Distancia',distanciaSchema)

// Sincroniza índices (remove o índice único antigo sem campus e cria o novo).
Distancia.syncIndexes()
    .then(() => console.info('Distancias: Índices sincronizados com sucesso.'))
    .catch((err) => console.error('Distancias: Erro ao sincronizar índices:', err));

module.exports = Distancia