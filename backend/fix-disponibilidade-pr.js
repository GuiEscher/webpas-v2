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

async function fixDisponibilidade() {
  try {
    // Buscar salas nos prédios .Pr
    const salasPr = await Sala.find({
      predio: { $regex: /\.Pr/i },
    });

    console.log(
      `\n🔧 Corrigindo disponibilidade de ${salasPr.length} salas em prédios .Pr...\n`,
    );

    for (const sala of salasPr) {
      const disp = sala.disponibilidade || [];
      let modificada = false;

      // Marca todos os slots como disponíveis
      const novaDisp = disp.map((d) => {
        if (d.disponivel !== true) {
          modificada = true;
          return { ...d.toObject(), disponivel: true };
        }
        return d;
      });

      if (modificada) {
        sala.disponibilidade = novaDisp;
        await sala.save();
        console.log(
          `  ✅ ${sala.predio} - ${sala.nomeSala || sala.numeroSala}: disponibilidade corrigida`,
        );
      } else {
        console.log(
          `  ℹ️ ${sala.predio} - ${sala.nomeSala || sala.numeroSala}: já estava disponível`,
        );
      }
    }

    console.log("\n✅ Pronto! Agora rode o solver novamente.\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro:", error);
    process.exit(1);
  }
}

fixDisponibilidade();
