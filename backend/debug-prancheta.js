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

const Sala = require("./models/sala.model");
const Distancia = require("./models/distancia.model");

async function debugPrancheta() {
  try {
    console.log("\n🔍 Investigando prédios de prancheta...\n");

    // 1. Buscar salas nos prédios .Pr
    const salasPr = await Sala.find({
      predio: { $regex: /\.Pr/i },
    });

    console.log(`📦 Salas em prédios .Pr: ${salasPr.length}\n`);

    if (salasPr.length === 0) {
      console.log("⚠️  NENHUMA sala encontrada em prédios com .Pr!");

      // Verificar todos os prédios existentes
      const todasSalas = await Sala.find({})
        .select("predio")
        .distinct("predio");
      console.log("\n📋 Todos os prédios existentes:");
      todasSalas.sort().forEach((p) => console.log(`   - "${p}"`));
      process.exit(0);
    }

    salasPr.forEach((sala) => {
      console.log(`  🏢 Prédio: "${sala.predio}"`);
      console.log(`     Sala: "${sala.nomeSala || sala.numeroSala}"`);
      console.log(`     Capacidade: ${sala.capacidade}`);

      // Verificar disponibilidade
      const disp = sala.disponibilidade || [];
      if (disp.length === 0) {
        console.log(`     ⚠️  SEM DISPONIBILIDADE CONFIGURADA!`);
      } else {
        const disponiveis = disp.filter((d) => d.disponivel === true);
        const indisponiveis = disp.filter((d) => d.disponivel !== true);
        console.log(
          `     Disponibilidade: ${disponiveis.length} slots disponíveis, ${indisponiveis.length} indisponíveis`,
        );
        disponiveis.forEach((d) => {
          console.log(`       ✅ ${d.dia} / ${d.periodo}`);
        });
        if (disponiveis.length === 0) {
          console.log(
            `     ⚠️  NENHUM SLOT DISPONÍVEL! A sala não será usada pelo solver.`,
          );
        }
      }
      console.log("");
    });

    // 2. Verificar distâncias configuradas para prédios .Pr
    console.log("\n📏 Distâncias para prédios .Pr:\n");

    const distanciasPr = await Distancia.find({
      predio: { $regex: /\.Pr/i },
    });

    if (distanciasPr.length === 0) {
      console.log("⚠️  NENHUMA distância configurada para prédios com .Pr!");

      // Buscar todos os prédios que têm distâncias
      const prediosComDist = await Distancia.find({})
        .select("predio")
        .distinct("predio");
      console.log("\n📋 Prédios com distâncias configuradas:");
      prediosComDist.sort().forEach((p) => console.log(`   - "${p}"`));
    } else {
      distanciasPr.forEach((d) => {
        console.log(`  📏 ${d.predio} ← ${d.departamento}: ${d.distancia}`);
      });
    }

    // 3. Comparar com prédios de térreo (que funcionam)
    console.log("\n\n📊 COMPARAÇÃO COM TÉRREO (que funciona):\n");

    const salasTerreo = await Sala.find({
      predio: { $regex: /\(T\)/i },
    });
    console.log(`Salas em prédios (T): ${salasTerreo.length}`);

    if (salasTerreo.length > 0) {
      const exemploTerreo = salasTerreo[0];
      const dispTerreo = (exemploTerreo.disponibilidade || []).filter(
        (d) => d.disponivel === true,
      );
      console.log(
        `  Exemplo: "${exemploTerreo.predio}" - "${exemploTerreo.nomeSala || exemploTerreo.numeroSala}"`,
      );
      console.log(`  Slots disponíveis: ${dispTerreo.length}`);
      dispTerreo.slice(0, 3).forEach((d) => {
        console.log(`    ✅ ${d.dia} / ${d.periodo}`);
      });
    }

    const distTerreo = await Distancia.find({
      predio: { $regex: /\(T\)/i },
    });
    console.log(`Distâncias para prédios (T): ${distTerreo.length}`);
    distTerreo.slice(0, 3).forEach((d) => {
      console.log(`  📏 ${d.predio} ← ${d.departamento}: ${d.distancia}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Erro:", error);
    process.exit(1);
  }
}

debugPrancheta();
