/**
 * Script para testar upload de CSV via API
 */

const mongoose = require("mongoose");
require("dotenv").config();

const dbURI = process.env.ATLAS_URI || "mongodb://localhost:27017/webpas";

mongoose
  .connect(dbURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ Conectado ao MongoDB");

    const Turma = require("./models/turma.model");
    const User = require("./models/user.model");

    // Buscar um usuário real
    const user = await User.findOne();
    if (!user) {
      console.error("❌ Nenhum usuário encontrado no banco!");
      process.exit(1);
    }

    console.log(`📌 Usando usuário: ${user.email || user._id}`);

    // Contar turmas antes
    const antesSemestre1 = await Turma.countDocuments({
      ano: 2026,
      semestre: 1,
      user: user._id,
    });
    const antesSemestre2 = await Turma.countDocuments({
      ano: 2026,
      semestre: 2,
      user: user._id,
    });

    console.log(`\n📊 Turmas atuais:`);
    console.log(`  - 2026/1: ${antesSemestre1} turmas`);
    console.log(`  - 2026/2: ${antesSemestre2} turmas`);

    // Tentar criar uma turma em 2026/1
    console.log(`\n🧪 Criando turma teste em 2026/1...`);
    const turma1 = new Turma({
      idTurma: "API-TEST-A",
      campus: "São Carlos",
      codDisciplina: "API123",
      turma: "A",
      nomeDisciplina: "API Test Disciplina",
      totalTurma: 30,
      departamentoOferta: "API-TEST",
      diaDaSemana: "Segunda",
      horarioInicio: "8",
      horarioFim: "10",
      ano: 2026,
      semestre: 1,
      user: user._id,
    });

    try {
      await turma1.save();
      console.log("✅ Turma criada em 2026/1");
    } catch (err) {
      console.error(`❌ Erro ao criar em 2026/1: ${err.message}`);
    }

    // Tentar criar a MESMA turma em 2026/2 (deveria funcionar!)
    console.log(`\n🧪 Criando MESMA turma em 2026/2...`);
    const turma2 = new Turma({
      idTurma: "API-TEST-A",
      campus: "São Carlos",
      codDisciplina: "API123",
      turma: "A",
      nomeDisciplina: "API Test Disciplina",
      totalTurma: 30,
      departamentoOferta: "API-TEST",
      diaDaSemana: "Segunda",
      horarioInicio: "8",
      horarioFim: "10",
      ano: 2026,
      semestre: 2, // <<< DIFERENTE!
      user: user._id,
    });

    try {
      await turma2.save();
      console.log("✅ Turma criada em 2026/2 (sem conflito!)");
    } catch (err) {
      console.error(`❌ Erro ao criar em 2026/2: ${err.message}`);
      if (err.code === 11000) {
        console.error(`   Chave duplicada:`, err.keyValue);
      }
    }

    // Contar turmas depois
    const depoisSemestre1 = await Turma.countDocuments({
      ano: 2026,
      semestre: 1,
      user: user._id,
    });
    const depoisSemestre2 = await Turma.countDocuments({
      ano: 2026,
      semestre: 2,
      user: user._id,
    });

    console.log(`\n📊 Turmas após teste:`);
    console.log(
      `  - 2026/1: ${depoisSemestre1} turmas (+${depoisSemestre1 - antesSemestre1})`,
    );
    console.log(
      `  - 2026/2: ${depoisSemestre2} turmas (+${depoisSemestre2 - antesSemestre2})`,
    );

    // Limpar testes
    await Turma.deleteMany({ codDisciplina: "API123", user: user._id });
    console.log(`\n🗑️  Turmas de teste removidas`);

    await mongoose.connection.close();
    console.log("\n✅ Teste concluído");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Erro:", err);
    process.exit(1);
  });
