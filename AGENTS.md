# WebPAS — Contexto Completo do Projeto

> **Última Atualização**: Fevereiro 2026  
> **Status**: Sistema de acessibilidade por penalidades ✅ | Sistema de junção de turmas ⚠️ (implementado, não testado)

## Changelog Recente

- **Fev/2026**: Sistema de acessibilidade **reformulado** — substituído sistema de "departamentos fake" por **penalidades por sufixo de prédio** no solver
- **Fev/2026**: Sistema de **junção de turmas** implementado (agrupamento por `juncao_id`) — aguardando testes
- **Jan/2026**: Correção de bugs de normalização (case mismatch, aspas embutidas em CSVs)

---

## 1. Visão Geral

**WebPAS** (Programa de Alocação de Salas) é um sistema web para **alocação automática de turmas em salas** de universidades. Usa um **solver de programação linear inteira (GLPK.js)** para minimizar a distância entre departamentos e prédios, respeitando restrições de capacidade, horário e disponibilidade.

### Stack Tecnológica

| Camada     | Tecnologia                          |
|------------|-------------------------------------|
| Frontend   | React (CRA) + Material UI (MUI)    |
| Backend    | Express.js + Mongoose (MongoDB)     |
| Solver     | GLPK.js (programação linear inteira)|
| Dados      | MongoDB, localStorage (solicitações)|

### Estrutura de Diretórios

```
webpas/                         ← Frontend React
  src/
    services/
      solicitacoes.js           ← Serviço de solicitações (localStorage)
      turmas.js                 ← API client para turmas
      distancias.js             ← API client para distâncias
      salas.js                  ← API client para salas
    components/
      pages/
        turmas/turmas-list.component.js   ← Lista de turmas (context menu)
        distancias/distancias-matriz.component.js ← Matriz de distâncias
        solver/solver.component.js        ← Interface do solver
        help/
          ajuda-solicitacoes.component.js  ← Ajuda sobre solicitações
          ajuda-distancias.component.js    ← Ajuda sobre distâncias

backend/                        ← Backend Express
  models/
    turma.model.js              ← Schema de turma (SEM campo solicitacao/departamentoOriginal!)
    distancia.model.js          ← Schema de distância (predio, departamento, valorDist)
    sala.model.js               ← Schema de sala (predio, capacidade, disponibilidade, terreo, acessivel)
  routes/
    turmas.js                   ← CRUD turmas + CSV upload + limpar-departamentos-fake
    distancias.js               ← CRUD distâncias + upload XLSX + /iscomplete
  solver-logic/
    dbtomodel.js                ← Converte dados do DB para modelo do solver
    gerasalahorarioglpk.js      ← Monta e resolve o modelo GLPK
```

---

## 2. Como o Solver Funciona

### Fluxo Geral

```
CSV (turmas) → MongoDB → dbtomodel.js → gerasalahorarioglpk.js → Resultado
                             ↑
                      Distâncias (MongoDB)
                      Salas (MongoDB)
                      Config (horários, delta)
```

### Modelo Matemático

- **Variáveis binárias**: `t{i}s{j}h{k}` — turma `i` alocada na sala `j` no horário `k`)
- **Função objetivo**: **Minimizar** soma das distâncias `dist(departamento_turma, predio_sala) × variável`
- **Restrições**:
  - Cada turma alocada em exatamente 1 sala
  - Cada sala ocupa no máximo 1 turma por horário
  - Turmas F12 (horário cheio) ficam na mesma sala nos 2 slots
  - Capacidade: `totalTurma ≤ capacidadeSala + delta`

### Tipos de Turma

| Tipo | Significado     | Horários                    |
|------|-----------------|------------------------------|
| F1   | Primeiro slot   | Ex: 08:00–10:00             |
| F2   | Segundo slot    | Ex: 10:00–12:00             |
| F12  | Horário cheio   | Ex: 08:00–12:00 (unificada) |

### Papel da Distância

A distância no modelo é o **coeficiente de custo** da variável binária. Quanto **menor** a distância, mais o solver **prioriza** aquela alocação.

- **Distância 0** → Preferência máxima (solver vai priorizar)
- **Distância 50–300** → Normal (distância real entre prédio e departamento)
- **Distância 999+** → Penalidade forte (solver evita)
- **Distância 99999** (placeholder) → Quando não há distância cadastrada (solver praticamente nunca aloca)

---

## 3. O Problema de Acessibilidade

### Situação

Quando um aluno cadeirante se matricula em uma turma, essa turma precisa ser alocada em uma sala no **térreo** de um prédio acessível. O solver original não tinha esse conceito — ele alocava puramente por distância departamento↔prédio.

### Outros Cenários Similares

- Turma que precisa de **prancheta de desenho**
- Turma que precisa de **quadro verde** ou **quadro branco**
- Turma que precisa de **laboratório**
- Turma que precisa ficar na **região norte/sul** do campus

> **Nota Histórica**: Versões anteriores do sistema resolviam isso criando "departamentos virtuais" (TERREO-DC, PRANCHETA-DC), mas essa abordagem foi **substituída** pelo sistema de penalidades por sufixo descrito abaixo.

---

## 4. Solução Implementada: Penalidades por Sufixo de Prédio

### Conceito

A solução atual usa **verificação de sufixos nos nomes dos prédios** diretamente no solver. Quando uma turma tem uma solicitação especial (térreo, prancheta, etc.), o solver adiciona uma **penalidade de +99999** ao custo de distância para salas em prédios que **não têm o sufixo correspondente**.

### Passo a Passo do Mecanismo

1. **Prédios Particionados**: O usuário cadastra salas com sufixos que identificam características especiais:
   - `AT02` — Prédio normal (andares superiores)
   - `AT02(T)` — Salas no térreo do prédio AT02
   - `AT02.Pr` — Salas com prancheta de desenho
   - `AT02.Qv` ou `AT02(QV)` — Salas com quadro verde
   - `AT02.Qb` ou `AT02(QB)` — Salas com quadro branco
   - `AT02(LAB)` — Laboratórios

2. **Solicitação**: O usuário clica com botão direito em uma turma na lista e seleciona o tipo de solicitação (salva no `localStorage`)

3. **Aplicação**: Ao clicar "Aplicar", o campo `solicitacao` da turma é modificado no banco via `PUT /turmas/update/:id`
   - Exemplo: Turma do DC com solicitação Térreo → `solicitacao = "terreo"`
   - **Importante**: O departamentoTurma NÃO é alterado (continua sendo o departamento original)

4. **Distâncias**: Apenas as distâncias normais são necessárias:
   - `DC ↔ AT02` = 50 (distância real)
   - `DC ↔ AT02(T)` = 50 (mesma distância — é o mesmo prédio!)
   - `DC ↔ AT03` = 300 (distância real)

5. **Solver**: Para cada par turma-sala, o solver:
   - Calcula a distância base: `dist = indiceDistancias[predio][departamento]`
   - **Verifica sufixos**: Se `turma.solicitacao === "terreo"` e `!sala.predio.includes("(T)")` → `dist += 99999`
   - Resultado: Turma só vai para salas com sufixo adequado (custo 50) e evita salas inadequadas (custo 50+99999)

### Tipos de Solicitação Disponíveis

| ID          | Label        | Campo      | Sufixo Prédio Necessário |
|-------------|-------------|------------|--------------------------|
| terreo      | Térreo      | solicitacao: "terreo" | (T) |
| prancheta   | Prancheta   | solicitacao: "prancheta" | .Pr |
| qv          | Quadro Verde| solicitacao: "qv" | .Qv ou (QV) |
| qb          | Quadro Branco| solicitacao: "qb" | .Qb ou (QB) |
| lab         | Laboratório | solicitacao: "lab" | (LAB) |
| esp-norte   | Esp-Norte   | solicitacao: "esp-norte" | (N) |
| esp-sul     | Esp-Sul     | solicitacao: "esp-sul" | (S) |

### Armazenamento

- **Solicitações (localStorage)**: `localStorage` do navegador (chave `webpas_solicitacoes`), gerenciado por `src/services/solicitacoes.js`
  - Contém: `turmaId`, `tipo`, `departamentoOriginal` (para reverter)
  - Usado apenas para interface (mostrar badge, reverter)

- **Solicitação Aplicada (MongoDB)**: Campo `solicitacao` da turma é setado via `PUT /turmas/update/:id`
  - Exemplo: `{ solicitacao: "terreo" }`
  - **Atenção**: O schema precisa ter o campo `solicitacao` definido, caso contrário Mongoose ignora em strict mode

- **Reversão**: Ao "Reverter", o campo `solicitacao` é removido (`null` ou `undefined`) e a entrada no localStorage é deletada

- **Limpeza**: Não há necessidade de rota de limpeza (não cria departamentos fake no banco)

### Schemas Relevantes do MongoDB

**Turma** (com campo `solicitacao` para acessibilidade):
```javascript
{
  idTurma, campus, departamentoTurma, codDisciplina, turma,
  nomeDisciplina, totalTurma, departamentoOferta, diaDaSemana,
  horarioInicio, horarioFim, alocadoChefia, creditosAula, docentes,
  ano, semestre, user, tipoQuadro, horario_id,
  juncao,          // Para junção de turmas (código de agrupamento)
  solicitacao,     // Para acessibilidade: "terreo", "prancheta", "qv", "qb", "lab", "esp-norte", "esp-sul"
  departamentoOriginal  // (NÃO usado, apenas no localStorage para reverter)
}
```

> **Nota sobre solicitacao**: O campo `solicitacao` foi adicionado ao schema (`turma.model.js`) para suportar o sistema de acessibilidade. Valores possíveis: `"terreo"`, `"prancheta"`, `"qv"`, `"qb"`, `"lab"`, `"esp-norte"`, `"esp-sul"`, ou `null`.

**Distância**:
```javascript
{ predio, departamento, valorDist, user }
// Índice único: { predio, departamento, user }
```

**Sala**:
```javascript
{ predio, numeroSala, capacidade, tipoQuadro, disponibilidade[], terreo, acessivel, user }
// Índice único: { predio, numeroSala, user }
```

---

## 5. Normalização de Dados (Bugs Corrigidos)

### Problema dos CSVs

Os CSVs importados usam separador `;` e valores com **aspas simples embutidas** nos dados (ex: `'DGero'`, `'Segunda'`). Os headers são limpos no import, mas os **valores** mantêm as aspas.

### Normalizações Aplicadas

| Local | O que normaliza |
|-------|-----------------|
| `dbtomodel.js` → `normalizarString()` | Remove TODAS as aspas (`/['"]/g`) e espaços |
| `dbtomodel.js` → índice de distâncias | Converte tudo para **lowercase** |
| `gerasalahorarioglpk.js` → lookup | Remove aspas + lowercase do `departamentoTurma` e `predio` |

### Bug de Case Mismatch (Corrigido)

- Frontend normalizava departamentos para lowercase ao salvar
- Banco tinha departamentos em diferentes cases (DC vs dc vs Dc)
- Solver buscava no índice de distâncias que era case-sensitive
- **Fix**: Tudo normalizado para lowercase no solver (`dbtomodel` e `gerasalahorarioglpk`)

### Bug de Aspas (Corrigido)

- CSV tinha `'DGero'` (com aspas embedded)
- Banco salvava com aspas: `departamentoTurma: "'DGero'"`
- Distância indexada como `dgero` (sem aspas, lowercase)
- Lookup falhava porque `'dgero'` ≠ `dgero`
- **Fix**: `normalizarString` remove TODAS as aspas globalmente (`/['"]/g`)

---

## 6. Código-Chave Atual

### `gerasalahorarioglpk.js` — Cálculo de Distâncias + Penalidades no Solver

```javascript
const distanciasCalculadas = turmas.map((turma) => {
  return salas.map((sala) => {
    // Usa departamentoTurma para TODAS as turmas (F1, F12, F2)
    let departamentoUsado = turma.departamentoTurma || turma.departamentoOferta;
    
    // Normaliza: remove aspas, trim, lowercase
    const deptLower = (departamentoUsado || "").replace(/['"]/g, "").trim().toLowerCase();
    const predioLower = (sala.predio || "").replace(/['"]/g, "").trim().toLowerCase();

    // Busca distância base no índice
    let distValue = indiceDistancias[predioLower]?.[deptLower] ?? 99999;
    
    // === PENALIDADES POR SOLICITAÇÃO ===
    // Verifica sufixo do prédio e adiciona penalidade se inadequado
    if (turma.solicitacao === 'terreo' && !sala.predio.includes('(T)')) {
      distValue += 99999;
    }
    if (turma.solicitacao === 'prancheta' && !sala.predio.includes('.Pr')) {
      distValue += 99999;
    }
    if (turma.solicitacao === 'qv' && !sala.predio.includes('.Qv') && !sala.predio.includes('(QV)')) {
      distValue += 99999;
    }
    if (turma.solicitacao === 'qb' && !sala.predio.includes('.Qb') && !sala.predio.includes('(QB)')) {
      distValue += 99999;
    }
    if (turma.solicitacao === 'lab' && !sala.predio.includes('(LAB)')) {
      distValue += 99999;
    }
    if (turma.solicitacao === 'esp-norte' && !sala.predio.includes('(N)')) {
      distValue += 99999;
    }
    if (turma.solicitacao === 'esp-sul' && !sala.predio.includes('(S)')) {
      distValue += 99999;
    }
    
    return distValue;
  });
});
```

**Lógica**: 
- Distância base vem do índice normal (ex: DC ↔ AT02 = 50)
- Se turma tem solicitação mas sala está em prédio sem sufixo → +99999 de penalidade
- Resultado: Solver evita salas inadequadas (custo muito alto)

### `dbtomodel.js` — Construção do Índice de Distâncias

```javascript
// Normaliza para lowercase, sem aspas
modelo.distancias = distanciasDb.reduce((acc, cur) => {
  const predioNorm = normalizarString(cur.predio).toLowerCase();
  const deptNorm = normalizarString(cur.departamento).toLowerCase();
  acc[predioNorm] = acc[predioNorm] || {};
  acc[predioNorm][deptNorm] = cur.valorDist;
  return acc;
}, {});
```

**Observação**: Apenas distâncias normais são necessárias (DC ↔ AT02, DC ↔ AT02(T), etc.). Não há departamentos virtuais.

---

## 7. Estado Atual e Resultados

### O que funciona

- ✅ Solicitações via menu de contexto (botão direito na lista de turmas)
- ✅ 7 tipos de solicitação disponíveis
- ✅ Aplicar/Reverter individual e em lote (localStorage + MongoDB)
- ✅ Sistema de penalidades por sufixo de prédio no solver
- ✅ Normalização case-insensitive e sem aspas no solver
- ✅ Páginas de ajuda com exemplos práticos
- ✅ O solver **prioriza corretamente** turmas com solicitação para salas adequadas
- ✅ Não cria departamentos fake no banco (problema resolvido!)

### O que NÃO funciona / Limitações

- ⚠️ O campo `solicitacao` precisa estar **definido no schema** (`turma.model.js`) para ser salvo corretamente
- ⚠️ Valores do CSV mantêm aspas embutidas nos dados (headers são limpos, valores não)
- ⚠️ Se o prédio não tiver o sufixo correto cadastrado, a turma nunca será alocada naquela sala (penalidade +99999)

---

## 8. Questão Arquitetural — RESOLVIDA ✅

### O Problema Original (LEGACY)

Nas versões anteriores, o sistema criava **departamentos virtuais** (ex: `TERREO-DC`, `PRANCHETA-DGero`) para cada solicitação. Isso causava:

1. **Proliferação de departamentos fake**: N departamentos × 7 tipos de solicitação
2. **Distâncias manuais**: Usuário tinha que cadastrar distâncias para cada combinação
3. **Complexidade crescente**: Com muitos departamentos, ficava inviável
4. **Limpeza necessária**: Precisava limpar o banco após solver

### Solução Implementada ✅

**Abordagem 2: Penalidade na Função Objetivo**

Em vez de manipular departamentos, o solver agora:
- Usa o `departamentoTurma` original da turma (não modifica)
- Lê o campo `turma.solicitacao` (ex: `"terreo"`, `"prancheta"`)
- Para cada par turma-sala, verifica o **sufixo do nome do prédio**
- Se o prédio não tem o sufixo adequado → adiciona penalidade +99999

**Vantagens**:
- ✅ Sem departamentos fake no banco
- ✅ Sem distâncias extras para cadastrar (apenas distâncias normais)
- ✅ Escalável (adicionar novo tipo de solicitação = adicionar 1 if no solver)
- ✅ Sem necessidade de limpeza posterior

**Implementação**:
- Código em `gerasalahorarioglpk.js` (seção de penalidades)
- Campo `solicitacao` no schema de Turma
- localStorage mantém histórico para interface (reverter)

---

## 9. Debug Logging Atual

O código tem **logging extensivo** para debug nos seguintes pontos:

- `gerasalahorarioglpk.js`: 
  - Logs de turmas com solicitação (`🔍 SOLICITAÇÃO DETECTADA`)
  - Listagem de todas as chaves do índice de distâncias (`DIST INDEX`)
  - Resultado de penalidades aplicadas
- `dbtomodel.js`: 
  - Log de turmas por tipo (F1/F12/F2), quantidade total
  - Log de junção de turmas (`🔗 Junção`)
- `trataresultado.js`:
  - Log de propagação de junção (`🔗 Junção: X alocação(ões) propagada(s)`)
- `routes/turmas.js`: 
  - Log dos valores brutos de departamento na rota `/d/`
  - Log antes/depois na rota `/update/:id`

Os logs podem ser removidos ou reduzidos após estabilização.

---

## 10. Fluxo Completo do Usuário (com Solicitações)

```
1. Importar CSV de turmas → MongoDB (departamentoTurma = valor real do CSV)
2. Cadastrar prédios/salas (com sufixos: AT02, AT02(T), AT02.Pr, AT02(LAB), etc.)
3. Cadastrar distâncias normais (DC ↔ AT02 = 50, DC ↔ AT02(T) = 50, DC ↔ AT03 = 300, etc.)
   - Nota: AT02 e AT02(T) podem ter a mesma distância (é o mesmo prédio)
4. Na lista de turmas, botão direito → Selecionar tipo de solicitação (salva no localStorage)
5. "Aplicar Todas" → campo 'solicitacao' da turma é setado no MongoDB (ex: "terreo")
   - O departamentoTurma NÃO é alterado (permanece o original)
6. Rodar o solver → turmas com solicitação recebem penalidade +99999 para salas inadequadas
7. Resultado: Turmas com solicitação são alocadas nas salas com sufixo correto
8. (Opcional) "Reverter" → campo 'solicitacao' é removido, solicitação deletada do localStorage
```

**Diferença do sistema antigo**: Não há mais departamentos virtuais, não há necessidade de cadastrar distâncias extras, não há limpeza posterior.

---

## 11. Formato dos Dados CSV

```csv
'cod_discip';'nome';'departamento';'turma';'numero_vagas';'dia';'hora_inicio';'hora_fim';'cred_aula';'ministrantes';'alocado_chefia';'juncao_id'
'SMA0300';'Geometria Analítica';'DM';'A';'60';'Segunda';'800';'1000';'2';'Prof. Silva';'';''
'SMA0300';'Geometria Analítica';'DM';'B';'30';'Segunda';'800';'1000';'2';'Prof. Silva';'';'1'
'SMA0300';'Geometria Analítica';'DM';'C';'35';'Segunda';'800';'1000';'2';'Prof. Silva';'';'1'
```

- **Separador**: `;` (ponto-e-vírgula)
- **Aspas**: Valores com aspas simples embutidas (`'DGero'`) — headers são limpos no import, valores NÃO
- **Horários**: Formato numérico sem `:` (800, 1000, 1400) — o import faz `String(Number(valor))`
- **Campus**: "São Carlos" (default) ou "Sorocaba" (selecionável)
- **juncao_id**: Código numérico para agrupar turmas que devem ser alocadas na mesma sala (opcional, default 0)

---

## 12. Estado Atual do Sistema (Fevereiro 2026)

### 12.1. Sistema de Acessibilidade (IMPLEMENTADO ✅)

**Problema Resolvido**: Turmas com necessidades especiais (cadeirantes, equipamentos específicos, localização) precisavam ser alocadas em salas adequadas.

**Solução Adotada**: Sistema de solicitações com particionamento de prédios por sufixos

#### Como Funciona

1. **Particionamento de Prédios**: Salas são cadastradas com sufixos que identificam características:
   - `AT02(T)` — Sala no térreo do prédio AT02
   - `AT02.Pr` — Sala com prancheta de desenho
   - `AT02.Qv` ou `AT02(QV)` — Sala com quadro verde
   - `AT02.Qb` ou `AT02(QB)` — Sala com quadro branco
   - `AT02(LAB)` — Laboratório

2. **Verificação no Solver**: O solver (`gerasalahorarioglpk.js`) verifica o nome do prédio da sala e aplica penalidades:
   - Se a turma tem `solicitacao = "terreo"` e a sala está em prédio **sem sufixo `(T)`** → penalidade +99999
   - Se a turma tem `solicitacao = "prancheta"` e a sala está em prédio **sem sufixo `.Pr`** → penalidade +99999
   - Se a turma tem `solicitacao = "qv"` e a sala está em prédio **sem sufixo `.Qv` ou `(QV)`** → penalidade +99999
   - E assim por diante para todos os tipos de solicitação

3. **Efeito**: O solver evita alocar turmas com solicitações em salas inadequadas (custo altíssimo torna essas alocações não-ótimas)

#### Código-Chave (gerasalahorarioglpk.js)

```javascript
// Para cada par turma-sala, calcula distância + penalidades
const distanciasCalculadas = turmas.map((turma) => {
  return salas.map((sala) => {
    let distValue = indiceDistancias[predioLower]?.[deptLower] ?? 99999;
    
    // PENALIDADES POR SOLICITAÇÃO
    if (turma.solicitacao === 'terreo' && !sala.predio.includes('(T)')) {
      distValue += 99999;
    }
    if (turma.solicitacao === 'prancheta' && !sala.predio.includes('.Pr')) {
      distValue += 99999;
    }
    if (turma.solicitacao === 'qv' && !sala.predio.includes('.Qv') && !sala.predio.includes('(QV)')) {
      distValue += 99999;
    }
    if (turma.solicitacao === 'qb' && !sala.predio.includes('.Qb') && !sala.predio.includes('(QB)')) {
      distValue += 99999;
    }
    if (turma.solicitacao === 'lab' && !sala.predio.includes('(LAB)')) {
      distValue += 99999;
    }
    // ... esp-norte, esp-sul
    
    return distValue;
  });
});
```

**Status**: ✅ Funcionando. Térreo confirmado em testes, prancheta teve problema de disponibilidade/distâncias configuradas (resolvido com script de correção).

---

### 12.2. Sistema de Junção de Turmas (IMPLEMENTADO ⚠️ NÃO TESTADO)

**Problema a Resolver**: Em cursos de saúde, é comum ter múltiplas turmas pequenas que devem ser dadas juntas (mesmo professor, mesmo horário, mesma sala). Exemplo: Anatomia turma A (25 alunos) + Anatomia turma B (22 alunos) devem ficar juntas → precisam sala com 47 lugares.

**Solução Implementada**: Sistema de agrupamento por `juncao_id`

#### Como Funciona

**1. No CSV**: Adicionar coluna `juncao_id` com código numérico:
```csv
'cod_discip';'turma';'numero_vagas';'dia';'hora_inicio';'juncao_id'
'BIO2301';'A';'25';'Segunda';'800';'1'
'BIO2301';'B';'22';'Segunda';'800';'1'
'BIO2301';'C';'20';'Terça';'1000';'2'
'BIO2301';'D';'18';'Terça';'1000';'2'
```

**2. Critério de Agrupamento**: Turmas são agrupadas quando:
- Têm o mesmo `codDisciplina` (ex: `BIO2301`)
- Têm o mesmo `horarioInicio` (ex: `800`)
- Têm `juncao > 0` (qualquer valor numérico > 0)

**3. Processamento no Solver (dbtomodel.js)**:
- **Antes do solver**: Turmas do grupo são mescladas
  - A **primeira turma** (representante) recebe a soma de `totalTurma` de todas as turmas do grupo
  - As **outras turmas** são removidas do solver mas armazenadas em `modelo.juncaoTurmas[]`
  - Exemplo: Turma A (25) + Turma B (22) → Turma A fica com `totalTurma = 47`, Turma B guardada à parte

**4. Após o Solver (trataresultado.js)**:
- A sala alocada para o **representante** é propagada para todas as turmas do grupo
- As turmas "escondidas" reaparecem no resultado final com a mesma sala

**5. Resultado**:
- Turma A: Sala AT02-101, 8h-10h
- Turma B: Sala AT02-101, 8h-10h (mesma sala!)

#### Arquivos Modificados

| Arquivo | Modificação |
|---------|------------|
| `turma.model.js` | Adicionado campo `juncao: { type: Number, default: 0 }` |
| `turmas.js` (routes) | CSV upload lê `juncao_id` e salva como `juncao` |
| `dbtomodel.js` | Função `processarJuncao()` agrupa e mescla turmas por `codDisciplina + horarioInicio + juncao > 0` |
| `trataresultado.js` | Propaga sala do representante para turmas guardadas em `modelo.juncaoTurmas` |
| `excel-exporter.js` | Adiciona coluna "Junção" no export (mostra código juncao ou "Junto") |

#### Código-Chave (dbtomodel.js)

```javascript
function processarJuncao(turmaArray) {
  const juncaoGroups = {};
  const turmasFinais = [];

  // Agrupa turmas com juncao > 0 por codDisciplina + horarioInicio
  turmaArray.forEach((turma) => {
    if (turma.juncao && turma.juncao > 0) {
      const key = `${turma.codDisciplina}_${turma.horarioInicio}`;
      if (!juncaoGroups[key]) juncaoGroups[key] = [];
      juncaoGroups[key].push(turma);
    } else {
      turmasFinais.push(turma);
    }
  });

  // Para cada grupo: primeira turma vira representante
  Object.values(juncaoGroups).forEach((group) => {
    if (group.length <= 1) {
      turmasFinais.push(group[0]);
      return;
    }

    const representante = group[0];
    let totalSomado = representante.totalTurma;

    for (let i = 1; i < group.length; i++) {
      totalSomado += group[i].totalTurma;
      modelo.juncaoTurmas.push({
        turmaJoined: group[i],
        representanteId: representante._id.toString(),
      });
    }

    representante.totalTurma = totalSomado;
    turmasFinais.push(representante);
  });

  return turmasFinais;
}
```

**Status**: ⚠️ **Implementado mas NÃO TESTADO**. Código está no lugar, mas não foi validado com dados reais.

---

## 13. Como Testar a Junção de Turmas

### Pré-requisitos

1. Backend rodando (`cd backend && npm start`)
2. Frontend rodando (`cd webpas && npm start`)
3. Usuário logado no sistema
4. Data de teste: Ano 2026, Semestre 1

### Passo 1: Preparar CSV de Teste

Crie arquivo `teste-juncao.csv` com este conteúdo:

```csv
cod_discip;turma;nome;departamento;numero_vagas;dia;hora_inicio;hora_fim;cred_aula;ministrantes;alocado_chefia;juncao_id
BIO101;A;Anatomia Basica;CBMEG;25;Segunda;800;1000;2;Prof Silva;;1
BIO101;B;Anatomia Basica;CBMEG;22;Segunda;800;1000;2;Prof Silva;;1
BIO101;C;Anatomia Basica;CBMEG;30;Terca;1400;1600;2;Prof Santos;;2
BIO101;D;Anatomia Basica;CBMEG;18;Terca;1400;1600;2;Prof Santos;;2
FIS201;A;Fisica Geral;DFCM;40;Segunda;800;1000;2;Prof Costa;;
FIS201;B;Fisica Geral;DFCM;35;Terca;1400;1600;2;Prof Lima;;
```

**Explicação do arquivo**:
- `BIO101 A + B` (Segunda 8h): juncao_id=1 → devem ficar na mesma sala (25+22=47 alunos)
- `BIO101 C + D` (Terça 14h): juncao_id=2 → devem ficar na mesma sala (30+18=48 alunos)
- `FIS201 A e B`: sem juncao_id → alocadas normalmente (separadas)

### Passo 2: Importar Turmas

1. No WebPAS, ir em **Turmas > Importar CSV**
2. Selecionar arquivo `teste-juncao.csv`
3. Escolher campus: **São Carlos**
4. Ano: **2026**, Semestre: **1**
5. Clicar em **Enviar**
6. Verificar mensagem de sucesso (6 turmas importadas)

### Passo 3: Verificar Importação

1. Ir para a lista de turmas (filtrar por 2026/1)
2. Verificar se aparecem:
   - ✅ BIO101-A (25 alunos, Segunda 8h)
   - ✅ BIO101-B (22 alunos, Segunda 8h)
   - ✅ BIO101-C (30 alunos, Terça 14h)
   - ✅ BIO101-D (18 alunos, Terça 14h)
   - ✅ FIS201-A (40 alunos, Segunda 8h)
   - ✅ FIS201-B (35 alunos, Terça 14h)

**Verificação crucial via console do navegador**:
```javascript
// Abrir DevTools (F12) → Console
// Buscar uma turma do grupo para ver o campo juncao
fetch('/api/turmas/2026/1')
  .then(r => r.json())
  .then(turmas => {
    const bio101a = turmas.find(t => t.codDisciplina === 'BIO101' && t.turma === 'A');
    console.log('BIO101-A juncao:', bio101a.juncao); // Deve mostrar: 1
  });
```

### Passo 4: Garantir Configurações Básicas

**4.1. Verificar Salas**:
- Precisa ter salas com capacidade >= 50 (para comportar as turmas unidas)
- Exemplo: Sala AT02-101, capacidade 60, disponível Segunda e Terça de Manhã/Tarde

**4.2. Verificar Distâncias**:
- Cadastrar distâncias entre departamento CBMEG e os prédios
- Cadastrar distâncias entre departamento DFCM e os prédios
- Exemplo: `CBMEG ↔ AT02 = 50`, `DFCM ↔ AT03 = 80`

**4.3. Verificar Config**:
- Horários configurados:
  - Manhã: 8h-10h (slot 1), 10h-12h (slot 2)
  - Tarde: 14h-16h (slot 1), 16h-18h (slot 2)
- mipGap: 0.1
- tmLim: 300
- minAlunos: 5

### Passo 5: Executar o Solver

1. Ir para **Solver > Rodar Otimização**
2. Selecionar:
   - Ano: 2026
   - Semestre: 1
   - Períodos: Manhã, Tarde
   - Dias: Segunda, Terça
   - ☑️ Ativar salas auxiliares: Não
   - Min alunos: 5
3. Clicar em **Executar**
4. Aguardar processamento (pode demorar 10-30 segundos)

### Passo 6: Verificar Logs do Backend

**Abrir terminal do backend** e procurar por logs de junção:

```
[dbtomodel] 🔗 Junção: BIO101 A (Anatomia Basica) - 2 turmas → totalTurma=47
[dbtomodel] 🔗 Junção: BIO101 C (Anatomia Basica) - 2 turmas → totalTurma=48
[dbtomodel] Total final: 4 (F1: 4, F12: 0, F2: 0) [2 turma(s) em junção]
...
[trataresultado] 🔗 Junção: 2 alocação(ões) propagada(s)
```

**O que deve aparecer**:
- ✅ Mensagem de junção para BIO101 (grupos de 2 turmas cada)
- ✅ Total de turmas no solver = **4** (não 6, porque 2 foram escondidas)
- ✅ 2 turmas em junção
- ✅ Propagação de 2 alocações

**Se NÃO aparecer**: A junção não foi aplicada. Verificar:
- Campo `juncao` foi salvo no banco? (rodar query no MongoDB)
- Função `processarJuncao` está sendo chamada? (adicionar console.log)

### Passo 7: Verificar Resultados no Frontend

1. Ir para **Agenda > Visualizar Resultados**
2. Filtrar: 2026/1, Segunda, Manhã
3. **Verificar se BIO101-A e BIO101-B têm a MESMA SALA**:
   - ✅ BIO101-A: Sala AT02-101, Segunda 8h-10h
   - ✅ BIO101-B: Sala AT02-101, Segunda 8h-10h
4. Filtrar: 2026/1, Terça, Tarde
5. **Verificar se BIO101-C e BIO101-D têm a MESMA SALA**:
   - ✅ BIO101-C: Sala AT02-101, Terça 14h-16h
   - ✅ BIO101-D: Sala AT02-101, Terça 14h-16h
6. **Verificar que FIS201 A e B estão SEPARADAS** (não têm juncao_id)

### Passo 8: Exportar para Excel e Verificar

1. Na página de Agenda, clicar em **Exportar Excel**
2. Selecionar todos os campos
3. Abrir o arquivo Excel
4. **Verificar coluna "Junção"**:
   - BIO101-A: deve mostrar **1** (código de junção)
   - BIO101-B: deve mostrar **"Junto"** (turma secundária do grupo)
   - BIO101-C: deve mostrar **2**
   - BIO101-D: deve mostrar **"Junto"**
   - FIS201-A: **vazio** (sem junção)
   - FIS201-B: **vazio** (sem junção)

### Passo 9: Teste de Capacidade

**Objetivo**: Verificar se o solver considera a soma dos alunos ao alocar

1. Editar uma sala no banco para ter capacidade **40** (menos que 47)
2. Rodar solver novamente
3. **Resultado esperado**: 
   - BIO101 A+B NÃO devem ser alocadas nessa sala (capacidade insuficiente)
   - Devem ir para uma sala maior ou ficar sem alocação

### Passo 10: Teste de Debug (Se algo falhar)

**10.1. Verificar no MongoDB**:
```javascript
// No MongoDB Compass ou mongo shell
db.turmas.find({ 
  ano: 2026, 
  semestre: 1, 
  codDisciplina: 'BIO101' 
}).pretty()

// Verificar se campo 'juncao' aparece e tem valor correto
```

**10.2. Script de debug rápido**:

Criar arquivo `backend/debug-juncao.js`:
```javascript
const mongoose = require('mongoose');
const Turma = require('./models/turma.model');

mongoose.connect('mongodb://localhost:27017/webpas', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function debug() {
  const turmas = await Turma.find({ 
    ano: 2026, 
    semestre: 1, 
    codDisciplina: 'BIO101' 
  });
  
  console.log('Turmas encontradas:', turmas.length);
  turmas.forEach(t => {
    console.log(`${t.codDisciplina}-${t.turma}: juncao=${t.juncao}, total=${t.totalTurma}, horario=${t.horarioInicio}`);
  });
  
  process.exit(0);
}

debug();
```

Executar: `node debug-juncao.js`

### Resultado Esperado Final

- ✅ Turmas com mesmo `juncao_id` + mesmo `codDisciplina` + mesmo `horarioInicio` ficam na mesma sala
- ✅ O solver considera a soma dos alunos (47 = 25+22)
- ✅ Coluna "Junção" aparece no Excel export
- ✅ Logs indicam quantas turmas foram unidas
- ✅ Turmas sem juncao_id continuam funcionando normalmente

### Troubleshooting

| Problema | Possível Causa | Solução |
|----------|---------------|---------|
| Junção não aparece nos logs | Campo `juncao` não foi salvo no DB | Verificar schema, reimportar CSV |
| Turmas ficam em salas diferentes | Critério de agrupamento não bateu | Verificar se `codDisciplina` e `horarioInicio` são EXATAMENTE iguais |
| Solver dá erro de capacidade | Soma dos alunos excede maior sala | Aumentar capacidade de uma sala ou usar salas auxiliares |
| Coluna Junção não aparece no Excel | Frontend não atualizado | Dar refresh no navegador (Ctrl+F5) |
