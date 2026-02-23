import React from "react";
import {
  Typography,
  Box,
  Divider,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from "@mui/material";
import AccessibleIcon from "@mui/icons-material/Accessible";

const ExemploMatriz = ({ titulo, linhas }) => (
  <Box sx={{ my: 2 }}>
    <Typography
      variant="caption"
      sx={{ fontWeight: 700, mb: 1, display: "block" }}
    >
      {titulo}
    </Typography>
    <TableContainer component={Paper} variant="outlined" sx={{ maxWidth: 500 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
            <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
              Departamento
            </TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
              Prédio
            </TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
              Distância
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {linhas.map((l, i) => (
            <TableRow
              key={i}
              sx={l.destaque ? { backgroundColor: "#e8f5e9" } : {}}
            >
              <TableCell sx={{ fontSize: "0.75rem" }}>{l.dept}</TableCell>
              <TableCell sx={{ fontSize: "0.75rem" }}>{l.predio}</TableCell>
              <TableCell
                sx={{ fontSize: "0.75rem", fontWeight: l.destaque ? 700 : 400 }}
              >
                {l.dist}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
);

const AjudaDistancias = () => {
  return (
    <Box sx={{ p: 2, maxWidth: 750 }}>
      <Typography variant="h5" gutterBottom>
        Distâncias — Ajuda e Tutorial
      </Typography>
      <Divider sx={{ mb: 2 }} />

      {/* ============ SEÇÃO 1: CONCEITO GERAL ============ */}
      <Typography variant="h6" gutterBottom>
        O que são as distâncias?
      </Typography>
      <Typography variant="body2" paragraph>
        A matriz de distâncias define a{" "}
        <b>distância entre cada departamento e cada prédio</b> do campus. O
        solver usa esses valores para decidir em qual prédio alocar cada turma —
        quanto <b>menor</b> a distância, maior a prioridade.
      </Typography>
      <Typography variant="body2" paragraph>
        <b>Regra prática:</b> distância <b>0</b> = prioridade máxima. Distância{" "}
        <b>999</b> = penalidade (o solver evita esse prédio).
      </Typography>

      <Alert severity="info" sx={{ mb: 2, fontSize: "0.8rem" }}>
        <b>Todas as combinações precisam existir!</b> O solver exige que cada
        departamento tenha uma distância cadastrada para cada prédio. Se faltar
        alguma, o sistema mostrará um alerta vermelho no topo desta página — use
        o botão "Exibir" para ver quais estão faltando.
      </Alert>

      <Divider sx={{ my: 2 }} />

      {/* ============ SEÇÃO 2: ACESSIBILIDADE ============ */}
      <Typography
        variant="h6"
        gutterBottom
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        <AccessibleIcon /> Distâncias para Acessibilidade
      </Typography>

      <Typography variant="body2" paragraph>
        Quando uma turma tem uma solicitação de acessibilidade (ex: Térreo), o
        departamento dela é trocado por um <b>departamento virtual</b> (ex: DC →{" "}
        <b>TERREO-DC</b>). Esse departamento virtual precisa ter suas distâncias
        configuradas <b>nesta página</b>.
      </Typography>

      <Alert severity="success" sx={{ mb: 2, fontSize: "0.8rem" }}>
        <b>A lógica é simples:</b> configure distância <b>0</b> para prédios que
        atendem ao requisito e <b>999</b> para os que não atendem. O solver fará
        o resto!
      </Alert>

      {/* ---- Exemplo visual ---- */}
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        Exemplo: Turma do DC com aluno cadeirante (Térreo)
      </Typography>

      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
        Antes (sem acessibilidade):
      </Typography>
      <Typography variant="body2" paragraph>
        A turma pertence ao DC. O solver vê que AT02 e AT02(T) têm a mesma
        distância (50m). Ele pode alocar em qualquer um — inclusive no 2° andar.
      </Typography>
      <ExemploMatriz
        titulo="Distâncias do DC (todas iguais para prédios próximos):"
        linhas={[
          { dept: "DC", predio: "AT02", dist: "50" },
          { dept: "DC", predio: "AT02(T)", dist: "50" },
          { dept: "DC", predio: "AT03", dist: "300" },
        ]}
      />

      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
        Depois (com acessibilidade aplicada):
      </Typography>
      <Typography variant="body2" paragraph>
        A turma agora pertence a <b>TERREO-DC</b>. Você configura distância{" "}
        <b>0</b> para prédios com térreo e <b>999</b> para os demais:
      </Typography>
      <ExemploMatriz
        titulo="O que você configura para TERREO-DC:"
        linhas={[
          { dept: "TERREO-DC", predio: "AT02", dist: "999" },
          { dept: "TERREO-DC", predio: "AT02(T)", dist: "0", destaque: true },
          { dept: "TERREO-DC", predio: "AT03", dist: "999" },
          { dept: "TERREO-DC", predio: "AT03(T)", dist: "0", destaque: true },
        ]}
      />
      <Typography variant="body2" paragraph>
        Resultado: o solver vê que AT02(T) tem distância <b>0</b> → prioridade
        máxima. AT02 e AT03 ficam com 999 → o solver os evita. A turma vai para
        o térreo!
      </Typography>

      <Divider sx={{ my: 2 }} />

      {/* ============ SEÇÃO 3: PASSO A PASSO ============ */}
      <Typography variant="h6" gutterBottom>
        Passo a passo: configurar acessibilidade
      </Typography>

      <Alert
        severity="info"
        variant="outlined"
        sx={{ mb: 2, fontSize: "0.8rem" }}
      >
        Estes passos devem ser seguidos <b>na ordem</b>. O passo 4 (configurar
        distâncias) só funciona depois do passo 3 (aplicar solicitações).
      </Alert>

      <Stepper orientation="vertical" sx={{ mb: 2 }}>
        <Step active>
          <StepLabel>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              1. Criar prédios particionados (Prédios e Salas)
            </Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" paragraph>
              Crie versões separadas dos prédios para as salas especiais.
              Exemplo: <b>AT02(T)</b> só com salas do térreo, <b>AT05.Pr</b>
              só com salas com prancheta. O prédio original fica com as demais
              salas.
            </Typography>
            <Alert
              severity="warning"
              variant="outlined"
              sx={{ fontSize: "0.75rem" }}
            >
              Sem esse passo, o solver não consegue diferenciar salas do térreo
              de salas em andares superiores — elas estariam todas no mesmo
              prédio.
            </Alert>
          </StepContent>
        </Step>

        <Step active>
          <StepLabel>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              2. Marcar turmas com solicitação (Turmas → botão direito)
            </Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" paragraph>
              Na página <b>Turmas</b>, clique com o{" "}
              <b>botão direito do mouse</b> na turma → escolha o tipo de
              solicitação. A turma será marcada com um chip colorido:
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
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
                label="QV"
                size="small"
                sx={{ backgroundColor: "#2e7d32", color: "#fff" }}
              />
              <Chip
                label="QB"
                size="small"
                sx={{ backgroundColor: "#1565c0", color: "#fff" }}
              />
              <Chip
                label="Lab"
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
          </StepContent>
        </Step>

        <Step active>
          <StepLabel>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              3. Aplicar solicitações (página Solicitações)
            </Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" paragraph>
              Na página <b>Solicitações</b>, clique em <b>"Aplicar Todas"</b>. O
              departamento das turmas será trocado para o departamento virtual
              (ex: DC → TERREO-DC).
            </Typography>
            <Alert
              severity="info"
              variant="outlined"
              sx={{ fontSize: "0.75rem" }}
            >
              Só após aplicar é que os departamentos virtuais existem e aparecem
              nesta página de Distâncias.
            </Alert>
          </StepContent>
        </Step>

        <Step active>
          <StepLabel>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              4. Configurar distâncias dos departamentos virtuais (esta página)
            </Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" paragraph>
              Os departamentos virtuais (TERREO-DC, PRANCHETA-DC, etc.) agora
              aparecem na lista. Para cada um:
            </Typography>
            <Box component="ul" sx={{ pl: 2, "& li": { fontSize: "0.8rem" } }}>
              <li>
                <b>0</b> → prédios que atendem ao requisito
              </li>
              <li>
                <b>999</b> → prédios que NÃO atendem
              </li>
            </Box>
          </StepContent>
        </Step>

        <Step active>
          <StepLabel>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              5. Rodar o Solver
            </Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" paragraph>
              Rode o solver normalmente. As turmas com solicitação serão
              alocadas nos prédios com distância 0 (os adequados).
            </Typography>
          </StepContent>
        </Step>

        <Step active>
          <StepLabel>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              6. (Opcional) Reverter solicitações
            </Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" paragraph>
              Na página <b>Solicitações</b>, clique <b>"Reverter Todas"</b>
              para restaurar os departamentos originais.
            </Typography>
          </StepContent>
        </Step>
      </Stepper>

      <Divider sx={{ my: 2 }} />

      {/* ============ SEÇÃO 4: SOLICITAÇÕES E ATRIBUTOS ============ */}
      <Typography variant="h6" gutterBottom>
        Solicitações de acessibilidade
      </Typography>
      <Typography variant="body2" paragraph>
        As solicitações de acessibilidade (térreo, prancheta, laboratório, etc.)
        agora são tratadas <b>automaticamente pelo solver</b> usando o{" "}
        <b>nome do prédio</b> da sala. O solver identifica os prédios
        particionados pelos sufixos no nome (ex: <b>(T)</b>, <b>.Pr</b>,{" "}
        <b>.Qv</b>, etc.) e aplica penalidades automaticamente.
      </Typography>
      <Typography variant="body2" paragraph>
        Basta que os prédios estejam particionados com os sufixos corretos:
      </Typography>

      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                Solicitação
              </TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                Sufixo / atributo usado
              </TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                O que o solver faz
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              {
                tipo: "Térreo",
                atributo: "(T) no nome do prédio",
                acao: "Penaliza prédios sem (T)",
              },
              {
                tipo: "Prancheta",
                atributo: ".Pr no nome do prédio",
                acao: "Penaliza prédios sem .Pr",
              },
              {
                tipo: "Quadro Verde",
                atributo: ".Qv no nome do prédio",
                acao: "Penaliza prédios sem .Qv",
              },
              {
                tipo: "Quadro Branco",
                atributo: ".Qb no nome do prédio",
                acao: "Penaliza prédios sem .Qb",
              },
              {
                tipo: "Laboratório",
                atributo: "(LAB) no nome do prédio",
                acao: "Penaliza prédios sem (LAB)",
              },
              {
                tipo: "Esp-Norte",
                atributo: "Região = Norte (campo da sala)",
                acao: "Penaliza salas fora da região norte",
              },
              {
                tipo: "Esp-Sul",
                atributo: "Região = Sul (campo da sala)",
                acao: "Penaliza salas fora da região sul",
              },
            ].map((row, i) => (
              <TableRow key={i}>
                <TableCell sx={{ fontSize: "0.75rem" }}>{row.tipo}</TableCell>
                <TableCell sx={{ fontSize: "0.75rem", fontWeight: 600 }}>
                  {row.atributo}
                </TableCell>
                <TableCell sx={{ fontSize: "0.75rem" }}>{row.acao}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Alert severity="info" sx={{ mb: 1.5, fontSize: "0.8rem" }}>
        <b>Dados antigos (legado):</b> Se você usou o sistema antigo com
        departamentos virtuais (TERREO-DC, etc.), use o botão "Limpar
        Departamentos Fake" nesta página para restaurar os departamentos
        originais das turmas.
      </Alert>

      <Divider sx={{ my: 2 }} />

      {/* ============ SEÇÃO 5: DICAS ============ */}
      <Typography variant="h6" gutterBottom>
        Dicas importantes
      </Typography>
      <Alert severity="warning" sx={{ mb: 1.5, fontSize: "0.8rem" }}>
        <b>Prédios particionados:</b> Os prédios devem estar particionados com
        os sufixos corretos no nome: <b>(T)</b> para térreo, <b>.Pr</b> para
        prancheta, <b>.Qv</b> para quadro verde, <b>.Qb</b> para quadro branco,{" "}
        <b>(LAB)</b> para laboratório. Cada prédio particionado precisa de
        distâncias configuradas nesta matriz.
      </Alert>
      <Alert severity="info" sx={{ mb: 1.5, fontSize: "0.8rem" }}>
        <b>Distâncias são para prédios × departamentos:</b> A matriz de
        distâncias continua sendo usada para minimizar o deslocamento entre
        departamentos e prédios. As solicitações adicionam penalidades
        automaticamente quando o prédio não tem o sufixo correspondente.
      </Alert>
      <Alert severity="info" sx={{ fontSize: "0.8rem" }}>
        <b>Exemplo:</b> Se AT05 (T) tem distância 3 para o DC, uma turma do DC
        com solicitação de Térreo terá dist. 3 para AT05 (T) e penalidade máxima
        para AT05 (sem sufixo).
      </Alert>
    </Box>
  );
};

export default AjudaDistancias;
