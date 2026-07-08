/**
 * Utilitários de campus, centralizados e SEM dependências (mongoose, etc.)
 * para poderem ser testados isoladamente.
 *
 * O sistema tem dois campi: "São Carlos" e "Sorocaba".
 */

// Reduz qualquer valor a um dos dois campi canônicos.
// Qualquer coisa que não seja Sorocaba cai em "São Carlos" (default do sistema).
const canonizarCampus = (valor) => {
  const s = String(valor || '')
    .replace(/['"]/g, '')
    .toLowerCase();
  if (s.includes('sorocaba')) return 'Sorocaba';
  return 'São Carlos';
};

// Regex para filtrar por campus em queries do Mongo, tolerante a
// acento/maiúsculas. IMPORTANTE: precisa do toLowerCase() — sem ele,
// "Sorocaba".includes("sorocaba") é falso e tudo cairia em São Carlos
// (foi um bug real). Os testes cobrem exatamente esse caso.
const campusRegex = (campus) => {
  const norm = String(campus || 'São Carlos')
    .replace(/['"]/g, '')
    .toLowerCase();
  return norm.includes('sorocaba') ? /sorocaba/i : /s[aã]o\s*carlos/i;
};

// Compara dois valores de campus de forma robusta (acento/caixa/aspas).
const mesmoCampus = (a, b) => canonizarCampus(a) === canonizarCampus(b);

module.exports = { canonizarCampus, campusRegex, mesmoCampus };
