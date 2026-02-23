const mongoose = require("mongoose");
require("dotenv").config();

mongoose
  .connect(process.env.ATLAS_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB conectado"))
  .catch((err) => {
    console.error("❌ Erro ao conectar MongoDB:", err);
    process.exit(1);
  });

const Turma = require("./models/turma.model");

async function checkSolicitacoes() {
  try {
    console.log("\n🔍 Buscando turmas com solicitações...\n");

    const turmasComSolicitacao = await Turma.find({
      solicitacao: { $exists: true, $ne: null },
    })
      .select("idTurma nomeDisciplina turma departamentoTurma solicitacao")
      .limit(10);

    if (turmasComSolicitacao.length === 0) {
      console.log("⚠️  NENHUMA turma com solicitação encontrada!");
      console.log(
        "   Isso significa que o campo 'solicitacao' não foi salvo no banco.",
      );
      console.log(
        "   Verifique se você clicou em 'Aplicar Todas' na página de Solicitações.",
      );
      process.exit(0);
    }

    console.log(
      `✅ Encontradas ${turmasComSolicitacao.length} turmas com solicitação:\n`,
    );

    turmasComSolicitacao.forEach((turma, i) => {
      console.log(`${i + 1}. ${turma.idTurma} - ${turma.nomeDisciplina}`);
      console.log(`   Departamento: ${turma.departamentoTurma}`);
      console.log(`   Solicitação: "${turma.solicitacao}"`);
      console.log("");
    });

    // Busca todas as turmas e mostra quantas têm solicitação
    const totalTurmas = await Turma.countDocuments({});
    const totalComSolicitacao = await Turma.countDocuments({
      solicitacao: { $exists: true, $ne: null },
    });

    console.log(`📊 Estatísticas:`);
    console.log(`   Total de turmas: ${totalTurmas}`);
    console.log(`   Com solicitação: ${totalComSolicitacao}`);
    console.log(`   Sem solicitação: ${totalTurmas - totalComSolicitacao}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Erro:", error);
    process.exit(1);
  }
}

checkSolicitacoes();
