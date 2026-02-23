import React from "react";
import {
  Typography,
  Box,
  Divider,
  Chip,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from "@mui/material";

const AjudaSolicitacoes = () => {
  return (
    <Box sx={{ p: 2, maxWidth: 720 }}>
      <Typography variant="h5" gutterBottom>
        Solicitações de Acessibilidade
      </Typography>
      <Divider sx={{ mb: 2 }} />

      {/* ====== RESUMO RÁPIDO ====== */}
      <Alert severity="success" sx={{ mb: 2, fontSize: "0.85rem" }}>
        <b>Resumo rápido:</b> Solicitações servem para forçar o solver a alocar
        determinadas turmas em salas com características específicas (térreo,
        prancheta, laboratório, etc.). Basta marcar a turma com o tipo de
        solicitação desejado — o solver usará o <b>nome do prédio</b> (sufixos
        como <b>(T)</b>, <b>.Pr</b>, <b>.Qv</b>, <b>.Qb</b>, <b>(LAB)</b>) para
        aplicar penalidades automaticamente, sem necessidade de criar
        departamentos virtuais ou configurar distâncias extras.
      </Alert>

      {/* ====== O QUE SÃO ====== */}
      <Typography variant="h6" gutterBottom>
        O que são?
      </Typography>
      <Typography variant="body2" paragraph>
        Quando um aluno cadeirante se matricula em uma turma, ou quando uma
        turma precisa de prancheta de desenho, é necessário garantir que o
        solver aloque essa turma em uma sala adequada. As solicitações fazem
        exatamente isso.
      </Typography>
      <Typography variant="body2" paragraph>
        O mecanismo é automático: ao aplicar uma solicitação, o campo{" "}
        <b>solicitação</b> da turma é marcado (ex: "terreo"). O solver então
        verifica o <b>nome do prédio</b> de cada sala e aplica uma penalidade
        alta para salas cujo prédio não possui o sufixo correspondente (ex:{" "}
        <b>(T)</b> para térreo), forçando a alocação em salas adequadas.
      </Typography>

      <Divider sx={{ my: 2 }} />

      {/* ====== TIPOS DISPONÍVEIS ====== */}
      <Typography variant="h6" gutterBottom>
        Tipos disponíveis
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
        <Chip
          label="Térreo"
          size="small"
          sx={{ backgroundColor: "#4caf50", color: "#fff" }}
        />
        <Chip
          label="Prancheta"
          size="small"
          sx={{ backgroundColor: "#ff9800", color: "#fff" }}
        />
        <Chip
          label="Quadro Verde (QV)"
          size="small"
          sx={{ backgroundColor: "#2e7d32", color: "#fff" }}
        />
        <Chip
          label="Quadro Branco (QB)"
          size="small"
          sx={{ backgroundColor: "#1565c0", color: "#fff" }}
        />
        <Chip
          label="Laboratório"
          size="small"
          sx={{ backgroundColor: "#7b1fa2", color: "#fff" }}
        />
        <Chip
          label="Esp-Norte"
          size="small"
          sx={{ backgroundColor: "#c62828", color: "#fff" }}
        />
        <Chip
          label="Esp-Sul"
          size="small"
          sx={{ backgroundColor: "#00838f", color: "#fff" }}
        />
      </Box>

      <Typography variant="body2" paragraph>
        <b>Térreo:</b> Alunos cadeirantes ou com mobilidade reduzida. Busca
        prédios com sufixo <b>(T)</b> no nome (ex: AT02 (T), AT05 (T)).
      </Typography>
      <Typography variant="body2" paragraph>
        <b>Prancheta:</b> Turmas que precisam de salas com pranchetas de
        desenho. Busca prédios com sufixo <b>.Pr</b> (ex: AT05.Pr, AT07.Pr).
      </Typography>
      <Typography variant="body2" paragraph>
        <b>Quadro Verde:</b> Busca prédios com sufixo <b>.Qv</b> (ex: AT05.Qv).
      </Typography>
      <Typography variant="body2" paragraph>
        <b>Quadro Branco:</b> Busca prédios com sufixo <b>.Qb</b> (ex: AT05.Qb).
      </Typography>
      <Typography variant="body2" paragraph>
        <b>Laboratório:</b> Turmas que precisam de laboratórios. Busca prédios
        com sufixo <b>(LAB)</b> no nome.
      </Typography>
      <Typography variant="body2" paragraph>
        <b>Esp-Norte / Esp-Sul:</b> Direcionamento para espaços específicos no
        campus. Usa o campo "região" da sala (norte/sul).
      </Typography>

      <Divider sx={{ my: 2 }} />

      {/* ====== COMO FUNCIONA ====== */}
      <Typography variant="h6" gutterBottom>
        Como funciona?
      </Typography>
      <Typography variant="body2" paragraph>
        O solver verifica o <b>nome do prédio</b> de cada sala. Para cada turma
        com solicitação, se o prédio da sala não possui o sufixo correspondente,
        o solver aplica uma penalidade muito alta na distância, efetivamente
        impedindo essa atribuição. Nenhuma configuração manual de distâncias é
        necessária.
      </Typography>
      <Typography variant="body2" paragraph>
        <b>Pré-requisito:</b> Os prédios devem estar particionados com os
        sufixos corretos no nome: <b>(T)</b> para térreo, <b>.Pr</b> para
        prancheta, <b>.Qv</b> para quadro verde, <b>.Qb</b> para quadro branco,{" "}
        <b>(LAB)</b> para laboratório.
      </Typography>

      <Divider sx={{ my: 2 }} />

      {/* ====== PASSO A PASSO ====== */}
      <Typography variant="h6" gutterBottom>
        Passo a passo
      </Typography>

      <Alert
        severity="info"
        variant="outlined"
        sx={{ mb: 2, fontSize: "0.8rem" }}
      >
        O processo é simples — apenas 3 passos!
      </Alert>

      <Stepper orientation="vertical" sx={{ mb: 2 }}>
        <Step active>
          <StepLabel>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              1. Verificar partição dos prédios (Prédios &amp; Salas)
            </Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" paragraph>
              Na página de <b>Prédios &amp; Salas</b>, verifique se os prédios
              estão particionados com os sufixos corretos. Exemplo: AT05 deve
              ter os prédios <b>AT05</b> (andares superiores), <b>AT05 (T)</b>{" "}
              (térreo), <b>AT05.Pr</b> (prancheta), etc.
            </Typography>
            <Alert
              severity="warning"
              variant="outlined"
              sx={{ fontSize: "0.75rem" }}
            >
              Se os prédios não estiverem particionados com os sufixos corretos,
              o solver não conseguirá diferenciar as salas adequadas.
            </Alert>
          </StepContent>
        </Step>

        <Step active>
          <StepLabel>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              2. Marcar turmas com solicitação (Turmas — botão direito)
            </Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" paragraph>
              Na página de <b>Turmas</b>, clique com o <b>botão direito</b>
              sobre a turma que precisa de acessibilidade. Um menu aparecerá com
              os tipos disponíveis. Escolha o tipo adequado.
            </Typography>
            <Typography variant="body2" paragraph>
              A turma ficará marcada com um <b>chip colorido</b> na coluna
              "Solicitação". Você pode marcar quantas turmas precisar.
            </Typography>
          </StepContent>
        </Step>

        <Step active>
          <StepLabel>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              3. Aplicar solicitações e rodar o Solver
            </Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" paragraph>
              Na página de <b>Solicitações</b>, clique em <b>"Aplicar Todas"</b>
              . O sistema vai salvar a solicitação em cada turma marcada.
              Depois, rode o solver normalmente — ele vai penalizar
              automaticamente salas que não atendem aos requisitos.
            </Typography>
          </StepContent>
        </Step>

        <Step active>
          <StepLabel>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              4. (Opcional) Reverter solicitações
            </Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2">
              Após verificar o resultado, clique em <b>"Reverter Todas"</b>
              para remover as solicitações. Útil se quiser rodar o solver
              novamente sem acessibilidade.
            </Typography>
          </StepContent>
        </Step>
      </Stepper>

      <Divider sx={{ my: 2 }} />

      {/* ====== EXEMPLO PRÁTICO ====== */}
      <Typography variant="h6" gutterBottom>
        Exemplo prático
      </Typography>
      <Typography variant="body2" paragraph>
        <b>Cenário:</b> A turma "Introdução à Computação" do departamento DC tem
        um aluno cadeirante. Queremos que o solver aloque essa turma no térreo.
      </Typography>

      <Box
        component="ol"
        sx={{ pl: 2.5, "& li": { fontSize: "0.85rem", mb: 1 } }}
      >
        <li>
          <b>Prédios:</b> Verifico que existe o prédio <b>AT02 (T)</b> com as
          salas do térreo (separado do AT02 que tem os andares superiores).
        </li>
        <li>
          <b>Turmas:</b> Clico com o botão direito na turma → seleciono
          "Térreo".
        </li>
        <li>
          <b>Solicitações:</b> Clico "Aplicar Todas" → a solicitação é salva.
        </li>
        <li>
          <b>Solver:</b> Rodo o solver → a turma é alocada em uma sala do AT02
          (T) (térreo)!
        </li>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* ====== DICAS E AVISOS ====== */}
      <Typography variant="h6" gutterBottom>
        Dicas e avisos
      </Typography>

      <Alert severity="warning" sx={{ mb: 1.5, fontSize: "0.8rem" }}>
        <b>Prédios particionados são essenciais!</b> Certifique-se de que os
        prédios estejam particionados com os sufixos corretos: <b>(T)</b>,{" "}
        <b>.Pr</b>, <b>.Qv</b>, <b>.Qb</b>, <b>(LAB)</b>. Sem isso, o solver não
        conseguirá diferenciar as salas.
      </Alert>

      <Alert severity="info" sx={{ mb: 1.5, fontSize: "0.8rem" }}>
        <b>Sem departamentos virtuais!</b> Diferente da abordagem anterior, não
        é mais necessário criar departamentos virtuais (TERREO-DC, etc.) nem
        configurar distâncias para cada combinação.
      </Alert>

      <Alert severity="info" sx={{ mb: 1.5, fontSize: "0.8rem" }}>
        <b>Departamento preservado:</b> O departamento da turma não é alterado
        ao aplicar uma solicitação. Apenas o campo "solicitação" é marcado.
      </Alert>

      <Alert severity="info" sx={{ mb: 1.5, fontSize: "0.8rem" }}>
        <b>Distâncias dos prédios particionados:</b> Os prédios particionados
        (ex: AT05 (T), AT05.Pr) precisam ter distâncias configuradas na matriz
        de distâncias, assim como qualquer outro prédio.
      </Alert>

      <Alert severity="info" sx={{ fontSize: "0.8rem" }}>
        <b>Limpeza de dados antigos:</b> Se você usou o sistema antigo com
        departamentos virtuais, use o botão "Limpar Departamentos Fake" na
        página de Distâncias para restaurar os departamentos originais.
      </Alert>
    </Box>
  );
};

export default AjudaSolicitacoes;
