// Utilitário de campus no frontend (espelha backend/utils/campus.js).

// Reduz um valor a "São Carlos" ou "Sorocaba".
export const canonizarCampus = (valor) =>
  String(valor || "São Carlos").toLowerCase().includes("sorocaba")
    ? "Sorocaba"
    : "São Carlos";

// Compara dois valores de campus de forma tolerante (acento/caixa/aspas).
export const mesmoCampus = (a, b) => canonizarCampus(a) === canonizarCampus(b);
