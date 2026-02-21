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
        prancheta, laboratório, etc.). O sistema troca o departamento da turma
        por um departamento virtual (ex: <b>TERREO-DC</b>) e, na matriz de
        distâncias, você configura distância <b>0</b> para os prédios adequados
        e <b>999</b> para os demais.
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
        O mecanismo é simples: ao aplicar uma solicitação, o departamento da
        turma é trocado temporariamente por um <b>departamento virtual</b> (ex:
        turma do <b>DC</b> com solicitação de Térreo → departamento vira{" "}
        <b>TERREO-DC</b>). Na página de Distâncias, esse departamento virtual é
        configurado com distância <b>0</b> para prédios adequados e <b>999</b>{" "}
        para os demais, fazendo o solver priorizar as salas corretas.
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
        <b>Térreo:</b> Alunos cadeirantes ou com mobilidade reduzida. Direciona
        para prédios com salas no térreo (ex: AT02(T)).
      </Typography>
      <Typography variant="body2" paragraph>
        <b>Prancheta:</b> Turmas que precisam de salas com pranchetas de desenho
        (ex: AT05.Pr).
      </Typography>
      <Typography variant="body2" paragraph>
        <b>Quadro Verde / Quadro Branco:</b> Turmas que necessitam de um tipo
        específico de quadro.
      </Typography>
      <Typography variant="body2" paragraph>
        <b>Laboratório:</b> Turmas que precisam de laboratórios.
      </Typography>
      <Typography variant="body2" paragraph>
        <b>Esp-Norte / Esp-Sul:</b> Direcionamento para espaços específicos no
        campus.
      </Typography>

      <Divider sx={{ my: 2 }} />

      {/* ====== COMO O NOME É GERADO ====== */}
      <Typography variant="h6" gutterBottom>
        Como o departamento virtual é gerado?
      </Typography>
      <Typography variant="body2" paragraph>
        O nome é formado pelo <b>prefixo do tipo</b> +{" "}
        <b>departamento original</b> da turma. Isso garante nomes intuitivos —
        você sabe imediatamente o que é e de qual departamento veio:
      </Typography>
      <Box
        component="ul"
        sx={{ mb: 2, pl: 2, "& li": { fontSize: "0.85rem", mb: 0.5 } }}
      >
        <li>
          Turma do <b>DC</b> + Térreo → <b>TERREO-DC</b>
        </li>
        <li>
          Turma do <b>DC</b> + Prancheta → <b>PRANCHETA-DC</b>
        </li>
        <li>
          Turma do <b>DFCM</b> + Quadro Verde → <b>QV-DFCM</b>
        </li>
        <li>
          Turma do <b>DFCM</b> + Quadro Branco → <b>QB-DFCM</b>
        </li>
        <li>
          Turma do <b>DC</b> + Laboratório → <b>LAB-DC</b>
        </li>
        <li>
          Turma do <b>DC</b> + Esp-Norte → <b>NORTE-DC</b>
        </li>
        <li>
          Turma do <b>DC</b> + Esp-Sul → <b>SUL-DC</b>
        </li>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* ====== PASSO A PASSO ====== */}
      <Typography variant="h6" gutterBottom>
        Passo a passo completo
      </Typography>

      <Alert
        severity="info"
        variant="outlined"
        sx={{ mb: 2, fontSize: "0.8rem" }}
      >
        Os passos abaixo seguem a ordem correta. Siga na sequência para evitar
        problemas com o solver.
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
              Antes de tudo, é preciso que existam prédios separados para as
              salas especiais. Exemplo: se o AT02 tem salas no térreo, crie o
              prédio <b>AT02(T)</b> e cadastre nele <b>apenas</b> as salas do
              térreo. O AT02 original fica com as salas dos andares superiores.
            </Typography>
            <Typography variant="body2" paragraph>
              Para pranchetas, use o sufixo <b>.Pr</b> (ex: <b>AT05.Pr</b>).
              Para laboratórios, use <b>(LAB)</b>. A ideia é: o solver só
              consegue diferenciar se as salas estiverem em prédios separados.
            </Typography>
            <Alert
              severity="warning"
              variant="outlined"
              sx={{ fontSize: "0.75rem" }}
            >
              Se esse passo não for feito, o solver não terá como distinguir
              salas no térreo de salas em andares superiores.
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
              3. Aplicar solicitações (esta página)
            </Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" paragraph>
              Nesta página, clique em <b>"Aplicar Todas"</b>. O sistema vai
              trocar o departamento de cada turma marcada para o departamento
              virtual correspondente (ex: DC → TERREO-DC).
            </Typography>
            <Alert
              severity="info"
              variant="outlined"
              sx={{ fontSize: "0.75rem" }}
            >
              Esse passo precisa ser feito <b>antes</b> de configurar as
              distâncias, pois é aqui que os departamentos virtuais são criados.
            </Alert>
          </StepContent>
        </Step>

        <Step active>
          <StepLabel>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              4. Configurar distâncias dos departamentos virtuais (Distâncias)
            </Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" paragraph>
              Agora vá à página <b>Distâncias</b>. Os departamentos virtuais
              (TERREO-DC, PRANCHETA-DC, etc.) já aparecerão na lista de
              departamentos. Para cada um, configure:
            </Typography>
            <Box component="ul" sx={{ pl: 2, "& li": { fontSize: "0.8rem" } }}>
              <li>
                Distância <b>0</b> → prédios que atendem ao requisito (ex:
                AT02(T) para térreo)
              </li>
              <li>
                Distância <b>999</b> → prédios que NÃO atendem (penalidade)
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
            <Typography variant="body2">
              Rode o solver normalmente. Como as turmas com solicitação agora
              têm distância 0 para prédios adequados e 999 para os demais, o
              solver vai priorizar as salas corretas automaticamente.
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
            <Typography variant="body2">
              Após verificar o resultado, clique em <b>"Reverter Todas"</b>
              para restaurar os departamentos originais das turmas. Útil se
              quiser rodar o solver novamente sem acessibilidade.
            </Typography>
          </StepContent>
        </Step>
      </Stepper>

      <Divider sx={{ my: 2 }} />

      {/* ====== EXEMPLO PRÁTICO ====== */}
      <Typography variant="h6" gutterBottom>
        Exemplo prático completo
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
          <b>Prédios:</b> Já temos AT02(T) com as salas do térreo e AT02 com os
          andares superiores.
        </li>
        <li>
          <b>Turmas:</b> Clico com o botão direito na turma → seleciono
          "Térreo".
        </li>
        <li>
          <b>Solicitações:</b> Clico "Aplicar Todas" → o departamento da turma
          muda de <b>DC</b> para <b>TERREO-DC</b>.
        </li>
        <li>
          <b>Distâncias:</b> Configuro TERREO-DC com dist. <b>0</b> para
          AT02(T), AT03(T) e dist. <b>999</b> para AT02, AT03.
        </li>
        <li>
          <b>Solver:</b> Rodo o solver → a turma é alocada no AT02(T)!
        </li>
        <li>
          <b>Resultado:</b> Confiro que funcionou e posso reverter se quiser.
        </li>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* ====== DICAS E AVISOS ====== */}
      <Typography variant="h6" gutterBottom>
        Dicas e avisos
      </Typography>

      <Alert severity="warning" sx={{ mb: 1.5, fontSize: "0.8rem" }}>
        <b>Ordem importa!</b> Primeiro aplique as solicitações (passo 3), depois
        configure as distâncias (passo 4), e só então rode o solver. Se rodar o
        solver sem configurar as distâncias, ele apontará distâncias faltantes.
      </Alert>

      <Alert severity="info" sx={{ mb: 1.5, fontSize: "0.8rem" }}>
        <b>Departamento original preservado:</b> O sistema sempre guarda o
        departamento original da turma. Você pode reverter a qualquer momento
        para restaurá-lo.
      </Alert>

      <Alert severity="info" sx={{ mb: 1.5, fontSize: "0.8rem" }}>
        <b>Múltiplas turmas do mesmo departamento?</b> Se duas turmas do DC têm
        solicitação de Térreo, ambas usarão o mesmo departamento virtual
        (TERREO-DC). Basta configurar as distâncias de TERREO-DC uma vez.
      </Alert>

      <Alert severity="info" sx={{ fontSize: "0.8rem" }}>
        <b>Turmas de departamentos diferentes?</b> Cada departamento gera seu
        próprio departamento virtual (TERREO-DC, TERREO-DFCM, etc.). Configure
        as distâncias de cada um separadamente na página de Distâncias.
      </Alert>
    </Box>
  );
};

export default AjudaSolicitacoes;
