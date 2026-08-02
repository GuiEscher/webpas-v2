const { test } = require('node:test');
const assert = require('node:assert');
const XLSX = require('xlsx');
const { parseDistanciasSheet } = require('../utils/planilha-distancias');

// Monta uma aba a partir de uma matriz (null = célula vazia).
const sheetDe = (aoa) => XLSX.utils.aoa_to_sheet(aoa);

test('lê a matriz quando ela começa em A1 (layout antigo)', () => {
  const sheet = sheetDe([
    ['predio', 'DC', 'DM'],
    ['AT01', 100, 200],
    ['AT02', 50, 300],
  ]);

  const { distancias, predios, departamentos } = parseDistanciasSheet(XLSX, sheet);

  assert.deepStrictEqual(departamentos, ['DC', 'DM']);
  assert.deepStrictEqual(predios, ['AT01', 'AT02']);
  assert.strictEqual(distancias.length, 4);
  assert.deepStrictEqual(distancias[0], { predio: 'AT01', departamento: 'DC', valorDist: 100 });
});

test('lê a matriz deslocada por linha/coluna de numeração', () => {
  const sheet = sheetDe([
    [1, 2, 3, 4],
    [null, 'predio', 'DC', 'DM'],
    [null, 'AT01', 100, 200],
    [null, 'AT02', 50, 300],
  ]);

  const { distancias, predios, departamentos } = parseDistanciasSheet(XLSX, sheet);

  assert.deepStrictEqual(departamentos, ['DC', 'DM']);
  assert.deepStrictEqual(predios, ['AT01', 'AT02']);
  assert.strictEqual(distancias.length, 4);
});

test('preserva sufixos do prédio, que são partições distintas', () => {
  const sheet = sheetDe([
    [null, 'predio', 'DC'],
    [null, 'AT02', 3000],
    [null, 'AT02 (T)', 50],
    [null, 'AT05.Pr', 400],
  ]);

  const { distancias, predios } = parseDistanciasSheet(XLSX, sheet);

  assert.deepStrictEqual(predios, ['AT02', 'AT02 (T)', 'AT05.Pr']);
  // Sem os sufixos, os três colidiriam no índice único {predio, departamento}.
  assert.strictEqual(new Set(distancias.map((d) => d.predio)).size, 3);
});

test('para na primeira linha sem prédio (há outras tabelas abaixo da matriz)', () => {
  const sheet = sheetDe([
    [null, 'predio', 'DC'],
    [null, 'AT01', 100],
    [null, null, null],
    [null, 'AT01', 999], // outra tabela: duplicaria a chave se fosse lida
  ]);

  const { distancias } = parseDistanciasSheet(XLSX, sheet);

  assert.strictEqual(distancias.length, 1);
  assert.strictEqual(distancias[0].valorDist, 100);
});

test('ignora colunas de lixo à direita da matriz', () => {
  const sheet = sheetDe([
    [null, 'predio', 'DC', null, 'lixo', 'mais lixo'],
    [null, 'AT01', 100, null, 7, 8],
  ]);

  const { departamentos } = parseDistanciasSheet(XLSX, sheet);

  assert.deepStrictEqual(departamentos, ['DC']);
});

test('distância 0 é preservada e célula vazia vira o padrão 3000', () => {
  const sheet = sheetDe([
    [null, 'predio', 'DC', 'DM'],
    [null, 'AT01', 0, null],
  ]);

  const { distancias } = parseDistanciasSheet(XLSX, sheet);

  assert.strictEqual(distancias[0].valorDist, 0);
  assert.strictEqual(distancias[1].valorDist, 3000);
});

test('remove aspas embutidas de prédios e departamentos', () => {
  const sheet = sheetDe([
    [null, 'predio', "'DC'"],
    [null, "'AT01'", 100],
  ]);

  const { distancias } = parseDistanciasSheet(XLSX, sheet);

  assert.deepStrictEqual(distancias[0], { predio: 'AT01', departamento: 'DC', valorDist: 100 });
});

test('aba vazia ou sem cabeçalho não quebra', () => {
  assert.deepStrictEqual(parseDistanciasSheet(XLSX, null).distancias, []);
  assert.deepStrictEqual(parseDistanciasSheet(XLSX, sheetDe([['predio']])).distancias, []);
});
