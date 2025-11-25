const mongoose = require('mongoose')

const Schema = mongoose.Schema

const turmaSchema = new Schema({
    idTurma: {type:String, trim:true},
    // Default São Carlos para manter compatibilidade
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

// === IMPORTANTE ===
// Este índice permite turmas com mesmo nome/horário se o CAMPUS for diferente.
turmaSchema.index({campus: 1, turma:1, nomeDisciplina:1, diaDaSemana:1, horarioInicio:1, ano:1, semestre:1, user:1},{ unique:true})

turmaSchema.index({ano:1,semestre:1,user:1})

const Turma = mongoose.model('Turma',turmaSchema)

Turma.on('index', function(err) {
    if (err) {
        console.error('Turmas: User index error: %s', err);
    } else {
        console.info('Turmas: User indexing complete');
    }
});

module.exports = Turma