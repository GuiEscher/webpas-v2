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
'cod_discip';'nome';'departamento';'turma';'numero_vagas';'dia';'hora_inicio';'hora_fim';'cred_aula';'ministrantes';'alocado_chefia'
'SMA0300';'Geometria Analítica';'DM';'A';'60';'Segunda';'800';'1000';'2';'Prof. Silva';''
```

- **Separador**: `;` (ponto-e-vírgula)
- **Aspas**: Valores com aspas simples embutidas (`'DGero'`) — headers são limpos no import, valores NÃO
- **Horários**: Formato numérico sem `:` (800, 1000, 1400) — o import faz `String(Number(valor))`
- **Campus**: "São Carlos" (default) ou "Sorocaba" (selecionável)
