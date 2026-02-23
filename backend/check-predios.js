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

async function checkPredios() {
  try {
    console.log("\n🔍 Analisando prédios particionados...\n");

    const salas = await Sala.find({}).select("nomeSala predio");

    // Agrupa por prédio
    const predios = {};
    salas.forEach((sala) => {
      const predio = sala.predio || "SEM_PREDIO";
      if (!predios[predio]) {
        predios[predio] = 0;
      }
      predios[predio]++;
    });

    // Separa por tipo
    const prediosTerreo = [];
    const prediosPrancheta = [];
    const prediosQV = [];
    const prediosQB = [];
    const prediosLab = [];
    const prediosNormais = [];

    Object.keys(predios)
      .sort()
      .forEach((predio) => {
        const upper = predio.toUpperCase();
        if (upper.includes("(T)")) {
          prediosTerreo.push({ predio, salas: predios[predio] });
        } else if (upper.includes(".PR")) {
          prediosPrancheta.push({ predio, salas: predios[predio] });
        } else if (upper.includes(".QV")) {
          prediosQV.push({ predio, salas: predios[predio] });
        } else if (upper.includes(".QB")) {
          prediosQB.push({ predio, salas: predios[predio] });
        } else if (upper.includes("(LAB)")) {
          prediosLab.push({ predio, salas: predios[predio] });
        } else {
          prediosNormais.push({ predio, salas: predios[predio] });
        }
      });

    console.log("🏢 PRÉDIOS COM TÉRREO (T):");
    if (prediosTerreo.length === 0) {
      console.log("   ⚠️  NENHUM prédio com (T) encontrado!");
      console.log("   Você precisa criar prédios separados para térreo.");
    } else {
      prediosTerreo.forEach((p) => {
        console.log(`   ✅ ${p.predio} (${p.salas} salas)`);
      });
    }

    console.log("\n🎨 PRÉDIOS COM PRANCHETA (.Pr):");
    if (prediosPrancheta.length === 0) {
      console.log("   ⚠️  NENHUM prédio com .Pr encontrado!");
    } else {
      prediosPrancheta.forEach((p) => {
        console.log(`   ✅ ${p.predio} (${p.salas} salas)`);
      });
    }

    console.log("\n🟢 PRÉDIOS COM QUADRO VERDE (.Qv):");
    if (prediosQV.length === 0) {
      console.log("   ⚠️  NENHUM prédio com .Qv encontrado!");
    } else {
      prediosQV.forEach((p) => {
        console.log(`   ✅ ${p.predio} (${p.salas} salas)`);
      });
    }

    console.log("\n⚪ PRÉDIOS COM QUADRO BRANCO (.Qb):");
    if (prediosQB.length === 0) {
      console.log("   ⚠️  NENHUM prédio com .Qb encontrado!");
    } else {
      prediosQB.forEach((p) => {
        console.log(`   ✅ ${p.predio} (${p.salas} salas)`);
      });
    }

    console.log("\n🔬 PRÉDIOS COM LABORATÓRIO ((LAB)):");
    if (prediosLab.length === 0) {
      console.log("   ⚠️  NENHUM prédio com (LAB) encontrado!");
    } else {
      prediosLab.forEach((p) => {
        console.log(`   ✅ ${p.predio} (${p.salas} salas)`);
      });
    }

    console.log(
      `\n📊 Total: ${Object.keys(predios).length} prédios diferentes`,
    );
    console.log(`   - Térreo (T): ${prediosTerreo.length}`);
    console.log(`   - Prancheta (.Pr): ${prediosPrancheta.length}`);
    console.log(`   - Quadro Verde (.Qv): ${prediosQV.length}`);
    console.log(`   - Quadro Branco (.Qb): ${prediosQB.length}`);
    console.log(`   - Laboratório (LAB): ${prediosLab.length}`);
    console.log(`   - Normais: ${prediosNormais.length}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Erro:", error);
    process.exit(1);
  }
}

checkPredios();
