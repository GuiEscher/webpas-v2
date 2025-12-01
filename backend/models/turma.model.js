const mongoose = require('mongoose')

const Schema = mongoose.Schema

const turmaSchema = new Schema({
    idTurma: {type:String, trim:true},
    campus: {type:String, trim:true, default: 'São Carlos'}, 
    departamentoTurma: {type:String, trim:true},
    codDisciplina: {type:String, trim:true},
    turma: {type:String, required:true, trim:true},
    nomeDisciplina: {type:String, required:true, trim:true},
    totalTurma: {type:Number, required:true, trim:true},
    departamentoOferta: {type:String, required:true, trim:true},
    diaDaSemana: {type:String, required:true, trim:true},
    horarioInicio: {type:String, required:true, trim:true},
    horarioFim: {type:String, required:true, trim:true},
    alocadoChefia: {type:Boolean, trim:true}, 
    creditosAula: {type:Number, trim:true},
    docentes: {type:String,trim:true},
    ano:{type:Number,required:true},
    semestre:{type:Number, required:true},
    user:{type:mongoose.Types.ObjectId,ref:'User',required:true},
    tipoQuadro: {type:String, enum: ['Verde', 'Branco', 'Indiferente'], default: 'Indiferente'}
})

// MUDANÇA CRÍTICA: O índice DEVE incluir 'ano' e 'semestre' para permitir histórico
// Exemplo: Turma A de Cálculo pode existir em 2023/1 E em 2025/1.
// Se ano/semestre não estiverem no índice unique, o banco acha que é duplicado.
turmaSchema.index({
    campus: 1, 
    turma: 1, 
    nomeDisciplina: 1, 
    diaDaSemana: 1, 
    horarioInicio: 1, 
    ano: 1,        // <--- Essencial
    semestre: 1,   // <--- Essencial
    user: 1
}, { unique: true })

// Índice simples para buscas rápidas
turmaSchema.index({ano:1, semestre:1, user:1})

const Turma = mongoose.model('Turma', turmaSchema)

Turma.on('index', function(err) {
    if (err) {
        console.error('Turmas: User index error: %s', err);
    } else {
        console.info('Turmas: User indexing complete');
    }
});

module.exports = Turma