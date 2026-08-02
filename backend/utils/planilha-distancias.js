/**
 * Leitura da matriz de distâncias (aba "Distancias") das planilhas de alocação.
 * Puro (recebe o XLSX por parâmetro), para ser testável sem mongoose.
 *
 * A matriz não fica sempre no canto A1: dependendo da versão da planilha há
 * linhas/colunas de numeração antes dela. Por isso a posição é detectada pela
 * célula de cabeçalho "predio" em vez de ser fixa.
 *
 *        | ...  | predio       | DHb  | DC   |
 *        | ...  | AT01         | 3000 | 3000 |
 *        | ...  | AT02 (T)     |  200 |   50 |
 */

const VALOR_PADRAO = 3000;
const LIMITE_BUSCA_CABECALHO = 20;

// Remove acentos, aspas e caixa para comparar rótulos de cabeçalho.
const chaveCabecalho = (valor) =>
  String(valor === undefined || valor === null ? '' : valor)
    .replace(/['"]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const textoCelula = (XLSX, sheet, r, c) => {
  const cell = sheet[XLSX.utils.encode_cell({ r, c })];
  if (!cell || cell.v === undefined || cell.v === null) return '';
  return String(cell.v).replace(/['"]/g, '').trim();
};

// Localiza a célula "predio": ela marca a linha dos departamentos e a coluna
// dos prédios. Sem ela, assume o layout antigo (cabeçalho em A1).
const localizarCabecalho = (XLSX, sheet, range) => {
  const maxR = Math.min(LIMITE_BUSCA_CABECALHO, range.e.r);
  const maxC = Math.min(LIMITE_BUSCA_CABECALHO, range.e.c);
  for (let r = range.s.r; r <= maxR; ++r) {
    for (let c = range.s.c; c <= maxC; ++c) {
      if (chaveCabecalho(textoCelula(XLSX, sheet, r, c)) === 'predio') {
        return { linhaCabecalho: r, colunaPredio: c };
      }
    }
  }
  return { linhaCabecalho: range.s.r, colunaPredio: range.s.c };
};

/**
 * Extrai os pares prédio x departamento da aba de distâncias.
 *
 * O nome do prédio é preservado por inteiro, com sufixos: "AT02 (T)" e
 * "AT05.Pr" são prédios distintos de "AT02" e "AT05" tanto para o cadastro de
 * salas quanto para as penalidades de solicitação no solver.
 *
 * @returns {{ distancias: Array<{predio: string, departamento: string, valorDist: number}>,
 *             departamentos: string[], predios: string[] }}
 */
const parseDistanciasSheet = (XLSX, sheet) => {
  const vazio = { distancias: [], departamentos: [], predios: [] };
  if (!sheet || !sheet['!ref']) return vazio;

  const range = XLSX.utils.decode_range(sheet['!ref']);
  const { linhaCabecalho, colunaPredio } = localizarCabecalho(XLSX, sheet, range);

  // Departamentos ficam à direita da coluna de prédios. A matriz é contígua,
  // então a primeira coluna vazia marca o fim (a aba costuma ter centenas de
  // colunas de sobra com lixo de numeração).
  const departamentos = [];
  for (let c = colunaPredio + 1; c <= range.e.c; ++c) {
    const nome = textoCelula(XLSX, sheet, linhaCabecalho, c);
    if (!nome) break;
    departamentos.push({ nome, coluna: c });
  }
  if (departamentos.length === 0) return vazio;

  // Abaixo da matriz existem outras tabelas que repetem nomes de prédio, então
  // a leitura para na primeira linha sem prédio.
  const distancias = [];
  const predios = [];
  const vistos = new Set();
  for (let r = linhaCabecalho + 1; r <= range.e.r; ++r) {
    const predio = textoCelula(XLSX, sheet, r, colunaPredio);
    if (!predio) break;
    predios.push(predio);

    departamentos.forEach(({ nome, coluna }) => {
      const chave = `${predio}|${nome}`;
      if (vistos.has(chave)) return;
      vistos.add(chave);

      const cell = sheet[XLSX.utils.encode_cell({ r, c: coluna })];
      const bruto = cell ? Number(cell.v) : NaN;
      const valorDist = Number.isFinite(bruto) ? bruto : VALOR_PADRAO;
      distancias.push({ predio, departamento: nome, valorDist });
    });
  }

  return { distancias, departamentos: departamentos.map((d) => d.nome), predios };
};

module.exports = { parseDistanciasSheet, VALOR_PADRAO };
