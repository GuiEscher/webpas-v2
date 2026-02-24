# WebPAS — Contexto Completo do Projeto

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

---

## 4. Solução Implementada: Departamentos Virtuais ("Fake")

### Conceito

A solução atual **manipula o departamento da turma** para criar um "departamento virtual" que, combinado com distâncias específicas na matriz, força o solver a priorizar salas adequadas.

### Passo a Passo do Mecanismo

1. **Prédios Particionados**: O usuário cria "sub-prédios" com sufixos no cadastro de salas.  
   Exemplo: `AT02` → `AT02`, `AT02(T)` (térreo), `AT02.Pr` (prancheta)

2. **Solicitação**: O usuário clica com botão direito em uma turma na lista e seleciona o tipo de solicitação.

3. **Departamento Virtual**: O sistema muda o `departamentoTurma` da turma:
   - Fórmula: `{PREFIXO}-{DEPARTAMENTO_ORIGINAL}`
   - Exemplo: Turma do DC com solicitação Térreo → `departamentoTurma = "TERREO-DC"`

4. **Distâncias Configuradas**: O usuário cadastra distâncias para o departamento virtual:
   - `TERREO-DC ↔ AT02(T)` = **0** (térreo do prédio)
   - `TERREO-DC ↔ AT02` = **999** (andares superiores)
   - `TERREO-DC ↔ AT03` = **999** (outro prédio)

5. **Solver**: Ao minimizar, a turma com `departamentoTurma = "TERREO-DC"` terá custo 0 para salas no térreo e custo 999 para as demais → será alocada no térreo.

### Tipos de Solicitação Disponíveis

| ID          | Label        | Prefixo    | Exemplo Dept Virtual | Sufixo Prédio |
|-------------|-------------|------------|----------------------|---------------|
| terreo      | Térreo      | TERREO     | TERREO-DC            | (T)           |
| prancheta   | Prancheta   | PRANCHETA  | PRANCHETA-DC         | .Pr           |
| qv          | Quadro Verde| QV         | QV-DFCM              | (QV)          |
| qb          | Quadro Branco| QB        | QB-DFCM              | (QB)          |
| lab         | Laboratório | LAB        | LAB-DQ               | (LAB)         |
| esp-norte   | Esp-Norte   | NORTE      | NORTE-DC             | (N)           |
| esp-sul     | Esp-Sul     | SUL        | SUL-DC               | (S)           |

### Armazenamento

- **Solicitações**: `localStorage` do navegador (chave `webpas_solicitacoes`), gerenciado por `src/services/solicitacoes.js`
- **Aplicação**: Ao "Aplicar", o `departamentoTurma` da turma é alterado no MongoDB via `PUT /turmas/update/:id`
- **Reversão**: Ao "Reverter", o departamento original é restaurado e a solicitação removida do localStorage
- **Limpeza**: Rota `POST /turmas/limpar-departamentos-fake` limpa departamentos fake residuais do banco

### Schemas Relevantes do MongoDB

**Turma** (NÃO tem campo `solicitacao` nem `departamentoOriginal` no schema!):
```javascript
{
  idTurma, campus, departamentoTurma, codDisciplina, turma,
  nomeDisciplina, totalTurma, departamentoOferta, diaDaSemana,
  horarioInicio, horarioFim, alocadoChefia, creditosAula, docentes,
  ano, semestre, user, tipoQuadro, horario_id
}
```

> **ATENÇÃO**: O Mongoose está em `strict: true` por padrão, então campos como `solicitacao` e `departamentoOriginal` enviados no `req.body` são **silenciosamente descartados** na hora do `save()`. Esse é um bug/limitação conhecida. A informação de solicitação só persiste no localStorage do navegador.

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
| `solicitacoes.js` → `addSolicitacao()` | Limpa aspas do departamento original antes de gerar nome fake |

### Bug de Case Mismatch (Corrigido)

- Frontend normalizava departamentos para lowercase ao salvar
- Solicitação salvava departamento em UPPERCASE (ex: `TERREO-DC`)
- Solver buscava no índice de distâncias que era case-sensitive
- **Fix**: Tudo normalizado para lowercase no solver (`dbtomodel` e `gerasalahorarioglpk`)

### Bug de Aspas (Corrigido)

- CSV tinha `'DGero'` (com aspas embedded)
- Solicitação criava `TERREO-'DGero'` (com aspas)
- Distância indexada como `terreo-dgero` (sem aspas, lowercase)
- Lookup falhava porque `terreo-'dgero'` ≠ `terreo-dgero`
- **Fix**: `normalizarString` remove TODAS as aspas globalmente (`/['"]/g`)

---

## 6. Código-Chave Atual

### `gerasalahorarioglpk.js` — Cálculo de Distâncias no Solver

```javascript
const distanciasCalculadas = turmas.map((turma) => {
  return salas.map((sala) => {
    // Usa departamentoTurma para TODAS as turmas (F1, F12, F2)
    let departamentoUsado = turma.departamentoTurma || turma.departamentoOferta;
    
    // Normaliza: remove aspas, trim, lowercase
    const deptLower = (departamentoUsado || "").replace(/['"]/g, "").trim().toLowerCase();
    const predioLower = (sala.predio || "").replace(/['"]/g, "").trim().toLowerCase();

    // Busca no índice
    const distValue = indiceDistancias[predioLower]?.[deptLower] ?? 99999;
    return distValue;
  });
});
```

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

### `solicitacoes.js` — Criação do Departamento Virtual

```javascript
addSolicitacao(turma, tipoSolicitacaoId) {
  const tipo = TIPOS_SOLICITACAO.find(t => t.id === tipoSolicitacaoId);
  const departamentoOriginal = /* preserva o original mesmo com troca de tipo */;
  
  // Limpa aspas do CSV
  const departamentoOriginalLimpo = departamentoOriginal
    .replace(/['"]/g, "").trim();
  
  const departamentoFake = `${tipo.prefixo}-${departamentoOriginalLimpo}`;
  // Ex: "TERREO" + "-" + "DGero" = "TERREO-DGero"
}
```

---

## 7. Estado Atual e Resultados

### O que funciona

- ✅ Solicitações via menu de contexto (botão direito na lista de turmas)
- ✅ 7 tipos de solicitação com prefixos dinâmicos
- ✅ Aplicar/Reverter individual e em lote
- ✅ Normalização case-insensitive e sem aspas no solver
- ✅ Rota de limpeza de departamentos fake residuais
- ✅ Páginas de ajuda reescritas com exemplos práticos
- ✅ O solver agora **prioriza corretamente** turmas com solicitação (resultado melhorou)

### O que NÃO funciona / Limitações

- ⚠️ `departamentoOriginal` e `solicitacao` **não são salvos no MongoDB** (Mongoose strict mode descarta silenciosamente) — só existem no localStorage
- ⚠️ A rota `/update/:id` usa `Object.assign(turma, req.body)` mas o schema não tem esses campos
- ⚠️ A rota `/iscomplete` (verificação de distâncias) não normaliza para lowercase, então pode reportar falsos positivos/negativos
- ⚠️ Valores do CSV mantêm aspas embutidas nos dados (headers são limpos, valores não)

---

## 8. Questão Arquitetural em Aberto

### O Problema

Para cada solicitação de acessibilidade, o sistema cria um **departamento virtual** (ex: `TERREO-DC`, `TERREO-DGero`, `PRANCHETA-DFCM`). Isso significa que:

1. **Proliferação de departamentos fake**: Se 5 departamentos diferentes tiverem turmas com solicitação de térreo, são criados 5 departamentos virtuais (`TERREO-DC`, `TERREO-DGero`, `TERREO-DFCM`, `TERREO-DQ`, `TERREO-DEE`)
2. **Distâncias manuais para cada um**: O usuário precisa cadastrar distâncias entre CADA departamento virtual e CADA prédio manualmente
3. **Complexidade cresce**: Com 7 tipos de solicitação × N departamentos × M prédios = muitas entradas de distância
4. **Limpeza necessária**: Após rodar o solver, os departamentos fake ficam no banco e precisam ser limpos (rota `limpar-departamentos-fake` ou reverter solicitações)

### Resultado Atual

O sistema **melhorou** — as turmas com solicitação agora são alocadas corretamente nos prédios adequados após os fixes de case/aspas. Porém, a gestão manual de tantos departamentos virtuais e distâncias é trabalhosa.

### Pergunta

> **Vale a pena ficar criando diversos departamentos fake, ou existe uma forma mais simples de resolver o problema de acessibilidade/restrições especiais no solver?**

### Possíveis Abordagens Alternativas a Explorar

1. **Constraint direta no solver**: Em vez de manipular distâncias, adicionar uma **restrição hard** no GLPK que force `turma_com_solicitacao → apenas salas com flag correspondente` (ex: `sala.terreo === true`)
   - Prós: Sem departamentos fake, sem distâncias extras
   - Contras: Requer refatorar a geração de constraints no solver

2. **Penalidade na função objetivo**: Multiplicar um fator de penalidade grande quando a sala não tem a propriedade requerida, sem mudar departamentos
   - Prós: Sem departamentos fake
   - Contras: Precisa que cada sala tenha as propriedades (terreo, prancheta, etc.) e o solver precisa saber verificá-las

3. **Pre-filtragem de salas**: Antes de montar o modelo, filtrar as salas disponíveis para turmas com solicitação (só salas adequadas participam do modelo)
   - Prós: Modelo menor, mais rápido
   - Contras: Pode tornar o modelo inviável se salas forem insuficientes

4. **Manter e automatizar**: Manter a abordagem de departamentos virtuais, mas **automatizar completamente** a criação de distâncias (quando solicitação é aplicada, distâncias do departamento virtual são criadas automaticamente com base nas propriedades das salas/prédios)
   - Prós: Usa a arquitetura existente
   - Contras: Dependência de metadados corretos nas salas

### Dados Relevantes para a Decisão

- O schema de **Sala** já tem campos `terreo: Boolean` e `acessivel: Boolean` — poderiam ser usados para constraint direta
- O campo `tipoQuadro` nas salas e turmas (Verde/Branco/Indiferente) já existe — poderia ser usado sem departamentos fake
- O solver GLPK.js suporta constraints adicionais facilmente (basta adicionar ao array `subjectTo`)
- As distâncias reais já existem no banco — o artifício de departamento virtual é uma camada a mais por cima

---

## 9. Debug Logging Atual

O código tem **logging extensivo** para debug nos seguintes pontos:

- `gerasalahorarioglpk.js`: Logs de turmas com departamento fake (`🔍 TURMA SOLICIT`), listagem de todas as chaves do índice de distâncias (`DIST INDEX`)
- `dbtomodel.js`: Log de turmas por tipo (F1/F12/F2), quantidade total
- `routes/turmas.js`: Log dos valores brutos de departamento na rota `/d/`, log antes/depois na rota `/update/:id`
- Os logs podem ser removidos ou reduzidos após estabilização

---

## 10. Fluxo Completo do Usuário (com Solicitações)

```
1. Importar CSV de turmas → MongoDB (departamentoTurma = valor real do CSV)
2. Cadastrar prédios/salas (com sub-prédios particionados: AT02, AT02(T), etc.)
3. Cadastrar distâncias normais (DC ↔ AT02 = 50, DC ↔ AT03 = 300, etc.)
4. Na lista de turmas, botão direito → Selecionar tipo de solicitação (salva no localStorage)
5. "Aplicar Todas" → departamentoTurma no MongoDB muda para virtual (TERREO-DC)
6. Na página de distâncias, aparecem os novos departamentos virtuais
7. Configurar distâncias para os departamentos virtuais (0 para adequados, 999 para outros)
8. Rodar o solver → turmas com solicitação são alocadas nas salas adequadas
9. (Opcional) "Reverter Todas" → restaura departamentos originais
10. (Opcional) "Limpar Depts Obsoletos" → remove residuais do banco
```

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
   - `AT02.Qv` — Sala com quadro verde
   - `AT02.Qb` — Sala com quadro branco
   - `AT02(LAB)` — Laboratório

2. **Verificação no Solver**: O solver (`gerasalahorarioglpk.js`) verifica o nome do prédio da sala e aplica penalidades:
   - Se a turma tem `solicitacao = "terreo"` e a sala está em prédio **sem sufixo `(T)`** → penalidade +99999
   - Se a turma tem `solicitacao = "prancheta"` e a sala está em prédio **sem sufixo `.Pr`** → penalidade +99999
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
    // ... outros tipos de solicitação
    
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
