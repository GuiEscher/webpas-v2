const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const turmaSchema = new Schema({
  idTurma: { type: String, trim: true }, // Não deve ser unique sozinho

  // Campo opcional para vínculo de horário
  horario_id: { type: String, trim: true },

  campus: { type: String, trim: true, default: "São Carlos" },
  departamentoTurma: { type: String, trim: true },
  codDisciplina: { type: String, trim: true },
  turma: { type: String, required: true, trim: true },
  nomeDisciplina: { type: String, required: true, trim: true },
  totalTurma: { type: Number, required: true, trim: true },
  departamentoOferta: { type: String, required: true, trim: true },
  diaDaSemana: { type: String, required: true, trim: true },
  horarioInicio: { type: String, required: true, trim: true },
  horarioFim: { type: String, required: true, trim: true },
  alocadoChefia: { type: Boolean, trim: true },
  creditosAula: { type: Number, trim: true },
  docentes: { type: String, trim: true },
  ano: { type: Number, required: true },
  semestre: { type: Number, required: true },
  user: { type: mongoose.Types.ObjectId, ref: "User", required: true },
  tipoQuadro: {
    type: String,
    enum: ["Verde", "Branco", "Indiferente"],
    default: "Indiferente",
  },
});

// --- ÍNDICE COMPOSTO (A CORREÇÃO) ---
// Garante que a turma só seja única considerando TAMBÉM o ano e semestre.
// Isso permite SMA0300-A em 2025/1 e SMA0300-A em 2026/1.
turmaSchema.index(
  {
    campus: 1,
    turma: 1,
    nomeDisciplina: 1,
    diaDaSemana: 1,
    horarioInicio: 1,
    ano: 1,
    semestre: 1,
    user: 1,
  },
  { unique: true },
);

// Índices auxiliares para performance
turmaSchema.index({ ano: 1, semestre: 1, user: 1 });

const Turma = mongoose.model("Turma", turmaSchema);

// --- FORÇA A LIMPEZA DE ÍNDICES ANTIGOS ---
// Isso remove índices criados anteriormente que podem estar causando o conflito
Turma.syncIndexes()
  .then(() => {
    console.info("Turmas: Índices sincronizados com sucesso.");
  })
  .catch((err) => {
    console.error("Turmas: Erro ao sincronizar índices:", err);
  });

module.exports = Turma;
