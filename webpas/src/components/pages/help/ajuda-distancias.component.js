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

      {/* ============ SEÇÃO 4: TABELA DE REFERÊNCIA ============ */}
      <Typography variant="h6" gutterBottom>
        Referência rápida: tipos de solicitação
      </Typography>
      <Typography variant="body2" paragraph>
        O departamento virtual é gerado como <b>PREFIXO-DEPARTAMENTO</b> (ex:
        TERREO-DC, LAB-DFCM):
      </Typography>

      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                Tipo
              </TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                Sufixo no prédio
              </TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                Depto virtual (ex: DC)
              </TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                Como configurar
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              {
                tipo: "Térreo",
                sufixo: "(T)",
                dept: "TERREO-DC",
                dica: "0 para prédios com (T), 999 demais",
              },
              {
                tipo: "Prancheta",
                sufixo: ".Pr",
                dept: "PRANCHETA-DC",
                dica: "0 para prédios com .Pr, 999 demais",
              },
              {
                tipo: "Quadro Verde",
                sufixo: "(QV)",
                dept: "QV-DC",
                dica: "0 para prédios com (QV), 999 demais",
              },
              {
                tipo: "Quadro Branco",
                sufixo: "(QB)",
                dept: "QB-DC",
                dica: "0 para prédios com (QB), 999 demais",
              },
              {
                tipo: "Laboratório",
                sufixo: "(LAB)",
                dept: "LAB-DC",
                dica: "0 para prédios com (LAB), 999 demais",
              },
              {
                tipo: "Esp-Norte",
                sufixo: "(N)",
                dept: "NORTE-DC",
                dica: "0 para prédios com (N), 999 demais",
              },
              {
                tipo: "Esp-Sul",
                sufixo: "(S)",
                dept: "SUL-DC",
                dica: "0 para prédios com (S), 999 demais",
              },
            ].map((row, i) => (
              <TableRow key={i}>
                <TableCell sx={{ fontSize: "0.75rem" }}>{row.tipo}</TableCell>
                <TableCell sx={{ fontSize: "0.75rem" }}>
                  <code>{row.sufixo}</code>
                </TableCell>
                <TableCell sx={{ fontSize: "0.75rem", fontWeight: 600 }}>
                  {row.dept}
                </TableCell>
                <TableCell sx={{ fontSize: "0.75rem" }}>{row.dica}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ my: 2 }} />

      {/* ============ SEÇÃO 5: DICAS ============ */}
      <Typography variant="h6" gutterBottom>
        Dicas importantes
      </Typography>
      <Alert severity="warning" sx={{ mb: 1.5, fontSize: "0.8rem" }}>
        <b>Ordem dos passos:</b> Primeiro aplique as solicitações na página
        Solicitações, depois configure distâncias aqui. Se configurar antes de
        aplicar, os departamentos virtuais ainda não existirão.
      </Alert>
      <Alert severity="info" sx={{ mb: 1.5, fontSize: "0.8rem" }}>
        <b>Prédios particionados:</b> AT02 (andares superiores) e AT02(T)
        (térreo) devem ser prédios <b>distintos</b> com salas distintas. Se
        ficarem juntos, o solver não consegue diferenciar.
      </Alert>
      <Alert severity="info" sx={{ mb: 1.5, fontSize: "0.8rem" }}>
        <b>Convenção de nomes nos prédios:</b> Use <code>(T)</code> para térreo,{" "}
        <code>.Pr</code> para prancheta (ex: AT05.Pr), <code>(LAB)</code> para
        laboratório, etc. Isso facilita identificar quais prédios recebem dist.
        0 vs 999.
      </Alert>
      <Alert severity="info" sx={{ fontSize: "0.8rem" }}>
        <b>Múltiplos departamentos:</b> Se turmas do DC e do DFCM têm
        solicitação de Térreo, serão criados TERREO-DC e TERREO-DFCM. Configure
        as distâncias de cada um separadamente (ambos com 0 para prédios com
        térreo e 999 para os demais).
      </Alert>
    </Box>
  );
};

export default AjudaDistancias;
