/**
 * Script de teste para verificar criação de turmas
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

    // Aguardar um pouco para syncIndexes terminar
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("\n🧪 Testando criação de turma...");

    const turmaTeste = new Turma({
      idTurma: "TEST-A",
      campus: "São Carlos",
      codDisciplina: "TEST123",
      turma: "A",
      nomeDisciplina: "Disciplina de Teste",
      totalTurma: 30,
      departamentoOferta: "TESTE",
      diaDaSemana: "Segunda",
      horarioInicio: "8",
      horarioFim: "10",
      ano: 2026,
      semestre: 1,
      user: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"), // ID fake para teste
    });

    try {
      const salva = await turmaTeste.save();
      console.log("✅ Turma salva com sucesso:", salva._id);

      // Verificar se foi realmente salva
      const encontrada = await Turma.findById(salva._id);
      if (encontrada) {
        console.log("✅ Turma encontrada no banco:", encontrada.nomeDisciplina);
      }

      // Limpar teste
      await Turma.findByIdAndDelete(salva._id);
      console.log("🗑️  Turma de teste removida");
    } catch (error) {
      console.error("❌ Erro ao salvar turma:", error.message);
      if (error.errors) {
        Object.keys(error.errors).forEach((key) => {
          console.error(`  - ${key}: ${error.errors[key].message}`);
        });
      }
    }

    // Verificar coleções existentes
    console.log("\n📋 Coleções no banco:");
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    collections.forEach((col) => {
      console.log(`  - ${col.name}`);
    });

    await mongoose.connection.close();
    console.log("\n✅ Teste concluído");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Erro ao conectar:", err);
    process.exit(1);
  });
