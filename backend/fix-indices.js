/**
 * Script para corrigir índices da coleção Turma
 * Execute com: node fix-indices.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

// Conectar ao MongoDB
const dbURI =
  process.env.ATLAS_URI ||
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/webpas";

mongoose
  .connect(dbURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ Conectado ao MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("turmas");

    try {
      // 1. Listar índices existentes
      console.log("\n📋 Índices atuais:");
      const indicesAntigos = await collection.indexes();
      indicesAntigos.forEach((idx) => {
        console.log(`  - ${idx.name}:`, JSON.stringify(idx.key));
      });

      // 2. Dropar TODOS os índices exceto _id
      console.log("\n🗑️  Removendo índices antigos...");
      await collection.dropIndexes();
      console.log("✅ Índices antigos removidos");

      // 3. Criar o índice composto correto
      console.log("\n🔨 Criando índice composto correto...");
      await collection.createIndex(
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
      console.log("✅ Índice composto criado com sucesso");

      // 4. Criar índice auxiliar
      console.log("\n🔨 Criando índice auxiliar...");
      await collection.createIndex({ ano: 1, semestre: 1, user: 1 });
      console.log("✅ Índice auxiliar criado");

      // 5. Verificar índices finais
      console.log("\n📋 Índices finais:");
      const indicesNovos = await collection.indexes();
      indicesNovos.forEach((idx) => {
        console.log(`  - ${idx.name}:`, JSON.stringify(idx.key));
      });

      console.log("\n✅ CONCLUÍDO! Os índices foram corrigidos com sucesso.");
      console.log(
        "Agora você pode inserir o mesmo CSV em semestres diferentes.\n",
      );
    } catch (error) {
      console.error("❌ Erro:", error);
    } finally {
      await mongoose.connection.close();
      console.log("Conexão fechada.");
      process.exit(0);
    }
  })
  .catch((err) => {
    console.error("❌ Erro ao conectar ao MongoDB:", err);
    process.exit(1);
  });
