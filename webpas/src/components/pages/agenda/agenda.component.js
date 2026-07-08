import React, { useState, useEffect } from "react";
import PageHeader from "../../re-usable/page-header.component";
import DateRangeIcon from "@mui/icons-material/DateRange";
import {
  Grid,
  Toolbar,
  Button,
  TextField,
  Paper,
  Box,
  TableContainer,
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Tab,
  Tabs,
  Typography,
  Divider,
  Stack,
  InputAdornment,
  IconButton,
  Snackbar,
  Alert,
  Chip,
} from "@mui/material";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import CloseIcon from "@mui/icons-material/Close";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import Select from "../../forms/select.component";
import CachedTwoToneIcon from "@mui/icons-material/CachedTwoTone";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import HelpIcon from "@mui/icons-material/Help";
import FileDownloadTwoToneIcon from "@mui/icons-material/FileDownloadTwoTone";
import PlaylistAddTwoToneIcon from "@mui/icons-material/PlaylistAddTwoTone";
import CalendarViewMonthIcon from "@mui/icons-material/CalendarViewMonth";
import CalendarViewWeekIcon from "@mui/icons-material/CalendarViewWeek";
import Popover from "@mui/material/Popover";
import PropTypes from "prop-types";

import { useCampus } from "../../../contexts/campus-context";
import AgendaColunas from "./agenda-colunas.component";
import AgendaLinhas from "./agenda-linhas.component";
import AgendaCampos from "./agenda-campos.component";
import TrocaSalaForm from "../../forms/trocaSalaForm.component";
import AlterarSalaForm from "../../forms/alterarSalaForm.component";
import ExportarResultadoForm from "../../forms/exportarResultadoForm.component";
import ResultadosDataService from "../../../services/resultados";
import Analise from "../analise/analise.component";
import AssessmentIcon from "@mui/icons-material/Assessment";

// --- STYLES & HELPERS ---
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

const thisYear = new Date().getFullYear();

const Agenda = (props) => {
  const { user, logout, config } = props;

  // --- STATES ---
  const [ano, setAno] = useState(thisYear);
  const [anos, setAnos] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [alocacoes, setAlocacoes] = useState([]);
  const [horariosInicio, setHorariosInicio] = useState([]);
  const [horariosFim, setHorariosFim] = useState([]);
  const [periodo, setPeriodo] = useState("");
  const [semestre, setSemestre] = useState(1);
  const [dia, setDia] = useState("Segunda");
  const [horario, setHorario] = useState(0);
  const [openTrocaSalaForm, setOpenTrocaSalaForm] = useState(false);
  const [openExportarForm, setOpenExportarForm] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [formatoAgenda, setFormatoAgenda] = useState("colunas");
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [filterFn, setFilterFn] = useState({
    fn: (items) => {
      return items;
    },
    fnAgenda: (items) => {
      return items;
    },
  });
  const { campus: viewCampus } = useCampus();

  // --- TROCA RÁPIDA: seleção de até 2 alocações ---
  const [selectedAlocacoes, setSelectedAlocacoes] = useState([]);
  const [openQuickSwap, setOpenQuickSwap] = useState(false);
  const [swapMsg, setSwapMsg] = useState(null);
  const [openAlterarSala, setOpenAlterarSala] = useState(false);

  const alocacaoKey = (a) =>
    `${a?.turma?._id}_${a?.sala?._id}_${a?.horarioSlot}_${a?.resultadoId}`;

  const isAlocacaoSelected = (a) => {
    const k = alocacaoKey(a);
    return selectedAlocacoes.some((x) => alocacaoKey(x) === k);
  };

  const toggleAlocacaoSelect = (a) => {
    const k = alocacaoKey(a);
    setSelectedAlocacoes((prev) => {
      const exists = prev.find((x) => alocacaoKey(x) === k);
      if (exists) return prev.filter((x) => alocacaoKey(x) !== k);
      if (prev.length >= 2) {
        // Limite: substitui a primeira pela nova (mantém a última e a nova)
        return [prev[prev.length - 1], a];
      }
      return [...prev, a];
    });
  };

  const clearSelection = () => setSelectedAlocacoes([]);

  const sameResultado =
    selectedAlocacoes.length === 2 &&
    selectedAlocacoes[0].resultadoId === selectedAlocacoes[1].resultadoId;

  const sameSala =
    selectedAlocacoes.length === 2 &&
    selectedAlocacoes[0]?.sala?._id === selectedAlocacoes[1]?.sala?._id;

  const describeAlocacao = (a) => {
    if (!a) return "";
    const turmaLabel =
      a?.turma?.nomeDisciplina || a?.turma?.idTurma || "Turma";
    const sala = `${a?.sala?.predio || "?"} ${a?.sala?.numeroSala || "?"}`;
    return `${turmaLabel} → ${sala}`;
  };

  const handleConfirmSwap = () => {
    if (selectedAlocacoes.length !== 2 || !sameResultado || sameSala) return;

    const [a, b] = selectedAlocacoes;
    // Convenção da rota /update/:id: alocacaoOrigem recebe salaDestino e
    // alocacaoDestino recebe salaOrigem. Logo salaOrigem = sala de A e
    // salaDestino = sala de B, para que A vá para a sala de B e vice-versa.
    const data = {
      salaOrigem: a.sala,
      salaDestino: b.sala,
      alocacaoOrigem: { sala: a.sala, turma: a.turma },
      alocacaoDestino: { sala: b.sala, turma: b.turma },
      alocacaoAux: {},
    };

    ResultadosDataService.trocaSala(data, a.resultadoId)
      .then(() => {
        setOpenQuickSwap(false);
        setSwapMsg({
          severity: "success",
          text: "Troca realizada com sucesso.",
        });
        clearSelection();
        retornaResultados(ano, semestre);
      })
      .catch((err) => {
        console.error("Erro na troca rápida:", err);
        setOpenQuickSwap(false);
        setSwapMsg({
          severity: "error",
          text: "Falha ao realizar a troca. Tente novamente.",
        });
      });
  };

  const [state, setState] = React.useState({
    capacidade: false,
    idTurma: false,
    horario_id: false,
    nomeDisciplina: true,
    codDisciplina: false,
    turma: true,
    departamentoOferta: false,
    departamentoTurma: false,
    totalTurma: false,
    docentes: false,
    creditosAula: false,
    horarioFim: false,
    tipoQuadro: true,
  });

  const camposOpen = Boolean(anchorEl);
  const idCampos = camposOpen ? "simple-popover" : undefined;

  // --- EFFECTS ---
  useEffect(() => {
    retornaAnos();
    if (user === false) {
      logout();
    }
  }, []);

  useEffect(() => {
    retornaResultados(ano, semestre);
  }, [ano, semestre]);

  useEffect(() => {
    retornaAlocacoes();
  }, [resultados, formatoAgenda, dia, viewCampus]);

  useEffect(() => {
    retornaHorariosInicio();
  }, [config]);

  useEffect(() => {
    if (horariosInicio.length > 0) {
      setHorario(horariosInicio[0]);
    }
  }, [horariosInicio]);

  useEffect(() => {
    getPeriodoByHorario(horario);
  }, [horario]);

  // --- HANDLERS ---
  const retornaResultados = (ano, semestre) => {
    console.log(`Buscando resultados para ${ano}/${semestre}...`);
    ResultadosDataService.getByAnoSemestre(ano, semestre)
      .then((res) => {
        setResultados(res.data || []);
      })
      .catch((err) => {
        console.error("Erro ao buscar resultados:", err);
        if (err.response?.status === 401) logout();
        setResultados([]);
      });
  };

  const handleDeleteResults = () => {
    if (
      window.confirm(
        `Tem certeza que deseja apagar os resultados de ${viewCampus} para ${ano}/${semestre}? O outro campus não é afetado. Isso é irreversível!`,
      )
    ) {
      ResultadosDataService.deleteByAnoSemestre(ano, semestre, viewCampus)
        .then((res) => {
          alert(`Resultados de ${viewCampus} apagados com sucesso!`);
          retornaResultados(ano, semestre);
          clearSelection();
        })
        .catch((err) => {
          console.error("Erro ao apagar resultados:", err);
          alert("Erro ao apagar.");
        });
    }
  };

  const retornaAlocacoes = () => {
    if (resultados && resultados.length > 0) {
      let alocacoesTemp = [];
      const resultadosDoDia = resultados.filter(
        (search) => search.diaDaSemana === dia,
      );

      resultadosDoDia.forEach((resultado) => {
        if (resultado.alocacoes) {
          resultado.alocacoes.forEach((alocacao) => {
            const campusTurma = alocacao.turma?.campus || "São Carlos";

            if (campusTurma === viewCampus) {
              let salaDisplay = alocacao?.sala;
              if (salaDisplay && salaDisplay.predio === "predioAux") {
                salaDisplay = { ...salaDisplay, predio: "N/A" };
              }

              let alocacaoTemp = {
                horario:
                  alocacao?.horarioSlot === 1
                    ? getHorarioByPeriodo(resultado.periodo, 1)
                    : getHorarioByPeriodo(resultado.periodo, 2),
                turma: alocacao?.turma,
                sala: salaDisplay,
                // Contexto para troca rápida
                resultadoId: resultado._id,
                periodo: resultado.periodo,
                horarioSlot: alocacao?.horarioSlot,
              };
              alocacoesTemp.push(alocacaoTemp);
            }
          });
        }
      });
      setAlocacoes(alocacoesTemp);
    } else {
      setAlocacoes([]);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    // Aba de Análise (última) não altera o dia da semana
    if (newValue < config.dias.length) {
      setDia(config.dias[newValue]);
    }
    // Limpar seleção ao trocar de contexto
    clearSelection();
  };

  const handleFormato = (event, novoFormato) => {
    if (novoFormato !== null) {
      setFormatoAgenda(novoFormato);
    }
  };

  const handleCloseTrocaSala = () => {
    setOpenTrocaSalaForm(false);
  };
  const handleOpenTrocaSala = () => {
    setOpenTrocaSalaForm(true);
  };
  const handleCloseExportar = () => {
    setOpenExportarForm(false);
  };
  const handleOpenExportar = () => {
    setOpenExportarForm(true);
  };

  const getPeriodoByHorario = (horario) => {
    let periodo = "";
    if (config.horarios) {
      for (const p of Object.keys(config.horarios)) {
        if (
          horario === config.horarios[p]["Início"].slot1 ||
          horario === config.horarios[p]["Início"].slot2
        ) {
          periodo = p;
          break;
        }
      }
      setPeriodo(periodo);
    }
  };

  const retornaAnos = () => {
    const anoAtual = new Date().getFullYear();
    const firstYear = anoAtual - 4;
    let anos = [];
    for (let i = 0; i < 6; i++) {
      let anoA = firstYear + i;
      anos.push(anoA);
    }
    setAnos(anos);
  };

  const getHorarioByPeriodo = (periodo, slot) => {
    if (!horariosInicio || horariosInicio.length === 0) return "";
    let periodoNum = 0;
    if (periodo === "Manhã") periodoNum = 0;
    else if (periodo === "Tarde") periodoNum = 1;
    else if (periodo === "Noite") periodoNum = 2;

    const index = periodoNum * 2 + slot - 1;
    return horariosInicio[index] || "";
  };

  const retornaHorariosInicio = () => {
    let periodos = config.periodos ? config.periodos : [];
    if (config.horarios) {
      let horariosI = [];
      let horariosF = [];
      periodos.forEach((periodo) => {
        horariosI.push(config.horarios[periodo]["Início"].slot1);
        horariosI.push(config.horarios[periodo]["Início"].slot2);
        horariosF.push(config.horarios[periodo]["Fim"].slot1);
        horariosF.push(config.horarios[periodo]["Fim"].slot2);
      });
      setHorariosInicio(horariosI);
      setHorariosFim(horariosF);
    }
  };

  const handleSearch = (e) => {
    let target = e.target;
    setFilterFn({
      fn: (items) => {
        if (target.value === "") return items;
        const lowercasedValue = target.value.toLowerCase();
        return items.filter((alocacao) => {
          const docentes = alocacao?.turma?.docentes || "";
          return (
            alocacao.horario?.toLowerCase().includes(lowercasedValue) ||
            alocacao.turma?.idTurma?.toLowerCase().includes(lowercasedValue) ||
            alocacao.turma?.nomeDisciplina
              ?.toLowerCase()
              .includes(lowercasedValue) ||
            alocacao.turma?.departamentoOferta
              ?.toLowerCase()
              .includes(lowercasedValue) ||
            alocacao.sala?.predio?.toLowerCase().includes(lowercasedValue) ||
            docentes.toLowerCase().includes(lowercasedValue)
          );
        });
      },
      fnAgenda: (items) => {
        if (target.value === "") return items;
        const lowercasedValue = target.value.toLowerCase();
        return items.filter((alocacao) => {
          for (const key in alocacao) {
            const value = alocacao[key];
            if (typeof value === "object" && value !== null) {
              if (value.nomeDisciplina?.toLowerCase().includes(lowercasedValue))
                return true;
              if (value.docentes?.toLowerCase().includes(lowercasedValue))
                return true;
              if (
                value.departamentoOferta
                  ?.toLowerCase()
                  .includes(lowercasedValue)
              )
                return true;
            } else if (
              key === "predio" &&
              String(value).toLowerCase().includes(lowercasedValue)
            ) {
              return true;
            }
          }
          return false;
        });
      },
    });
  };

  const handleAnoSelect = (e) => {
    setAno(e.target.value);
  };
  const handleSemestreSelect = (e) => {
    setSemestre(e.target.value);
  };
  const handleClickCampos = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleCloseCampos = () => {
    setAnchorEl(null);
  };

  // --- RENDER ---
  return (
    <>
      <PageHeader
        title="Resultados"
        subtitle="Visualização e Gerenciamento da Alocação"
        icon={<DateRangeIcon />}
      />

      {/* --- PAINEL DE CONTROLE UNIFICADO --- */}
      <Paper
        elevation={0}
        variant="outlined"
        sx={{ p: 2, mb: 3, bgcolor: "#fdfdfd" }}
      >
        <Grid container spacing={2} alignItems="center">
          {/* LINHA 1: FILTROS PRINCIPAIS */}
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar (Disciplina, Docente, Sala...)"
              onChange={handleSearch}
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={6} md={2}>
            <Select
              label="Ano"
              value={ano}
              onChange={handleAnoSelect}
              options={anos}
            />
          </Grid>

          <Grid item xs={6} md={4}>
            <Select
              label="Semestre"
              value={semestre}
              onChange={handleSemestreSelect}
              options={[1, 2]}
            />
          </Grid>

          <Grid item xs={12} md={2} display="flex" justifyContent="flex-end">
            <IconButton
              onClick={() =>
                window.open("https://github.com/seu-repo/ajuda", "_blank")
              }
              color="primary"
              title="Ajuda"
            >
              <HelpIcon />
            </IconButton>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* LINHA 2: AÇÕES E VISUALIZAÇÃO */}
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<CachedTwoToneIcon />}
                onClick={handleOpenTrocaSala}
                size="small"
              >
                Trocar Sala
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<FileDownloadTwoToneIcon />}
                onClick={handleOpenExportar}
                size="small"
              >
                Exportar
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteResults}
                size="small"
              >
                Limpar
              </Button>
            </Stack>
          </Grid>

          <Grid
            item
            xs={12}
            md={6}
            display="flex"
            justifyContent={{ xs: "flex-start", md: "flex-end" }}
            alignItems="center"
            gap={2}
          >
            <Typography variant="body2" color="textSecondary">
              Visualização:
            </Typography>

            <Button
              onClick={handleClickCampos}
              startIcon={<PlaylistAddTwoToneIcon />}
              variant="text"
              size="small"
            >
              Campos
            </Button>
            <Popover
              id={idCampos}
              open={camposOpen}
              anchorEl={anchorEl}
              onClose={handleCloseCampos}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            >
              <AgendaCampos state={state} setState={setState} />
            </Popover>

            <ToggleButtonGroup
              value={formatoAgenda}
              exclusive
              onChange={handleFormato}
              aria-label="formato-agenda"
              size="small"
            >
              <ToggleButton value="colunas" aria-label="formato-colunas">
                <CalendarViewWeekIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="linhas" aria-label="formato-linhas">
                <CalendarViewMonthIcon fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </Paper>

      {/* --- BARRA DE AÇÕES SOBRE SELEÇÃO --- */}
      {selectedAlocacoes.length > 0 && tabValue < config.dias.length && (
        <Paper
          elevation={0}
          variant="outlined"
          sx={{
            p: 1.5,
            mb: 2,
            bgcolor: "#fff7ec",
            borderColor: "#ff7d11",
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {selectedAlocacoes.length === 1
                  ? "1 turma selecionada:"
                  : `${selectedAlocacoes.length}/2 selecionadas:`}
              </Typography>
              {selectedAlocacoes.map((a, i) => (
                <Chip
                  key={i}
                  size="small"
                  label={describeAlocacao(a)}
                  onDelete={() => toggleAlocacaoSelect(a)}
                  sx={{ bgcolor: "#fff", borderColor: "#ff7d11" }}
                  variant="outlined"
                />
              ))}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              {selectedAlocacoes.length === 2 && !sameResultado && (
                <Typography variant="caption" color="error" sx={{ alignSelf: "center" }}>
                  As turmas devem estar no mesmo dia e período.
                </Typography>
              )}
              {selectedAlocacoes.length === 2 && sameResultado && sameSala && (
                <Typography variant="caption" color="error" sx={{ alignSelf: "center" }}>
                  As turmas já estão na mesma sala.
                </Typography>
              )}
              {selectedAlocacoes.length === 1 && (
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<MeetingRoomIcon />}
                  onClick={() => setOpenAlterarSala(true)}
                >
                  Alterar Sala
                </Button>
              )}
              {selectedAlocacoes.length === 2 && (
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<SwapHorizIcon />}
                  disabled={!sameResultado || sameSala}
                  onClick={() => setOpenQuickSwap(true)}
                >
                  Trocar Salas
                </Button>
              )}
              <Button
                variant="text"
                size="small"
                startIcon={<CloseIcon />}
                onClick={clearSelection}
              >
                Limpar
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* --- ÁREA DE ABAS (SEMANA) --- */}
      <Paper elevation={1} sx={{ mb: 0 }}>
        <Box
          sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "#fafafa" }}
        >
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            textColor="primary"
            indicatorColor="primary"
          >
            {config.dias.map((dia, indexD) => (
              <Tab
                key={dia}
                label={dia}
                {...a11yProps(indexD)}
                sx={{
                  textTransform: "none",
                  fontWeight: 500,
                  fontSize: "1rem",
                }}
              />
            ))}
            <Tab
              key="__analise__"
              icon={<AssessmentIcon fontSize="small" />}
              iconPosition="start"
              label="Análise"
              sx={{
                textTransform: "none",
                fontWeight: 600,
                fontSize: "1rem",
                ml: "auto",
              }}
            />
          </Tabs>
        </Box>

        <TableContainer sx={{ minHeight: 400 }}>
          <Box sx={{ p: 0 }}>
            {tabValue === config.dias.length ? (
              // Tab de Análise
              <Box sx={{ p: 2 }}>
                <Analise
                  embedded
                  ano={ano}
                  semestre={semestre}
                  minAlunos={5}
                  onResultadosChanged={() => retornaResultados(ano, semestre)}
                />
              </Box>
            ) : formatoAgenda === "colunas" ? (
              <AgendaColunas
                state={state}
                horariosInicio={horariosInicio}
                filterFn={filterFn}
                alocacoes={alocacoes}
                isSelected={isAlocacaoSelected}
                onToggleSelect={toggleAlocacaoSelect}
              />
            ) : (
              <AgendaLinhas
                state={state}
                horariosInicio={horariosInicio}
                filterFn={filterFn}
                alocacoes={alocacoes}
              />
            )}
          </Box>
        </TableContainer>
      </Paper>

      {/* --- MODAIS --- */}
      <Dialog
        maxWidth="md"
        id="modalForm-troca"
        scroll="body"
        open={openTrocaSalaForm}
        onClose={handleCloseTrocaSala}
      >
        <DialogContent>
          <TrocaSalaForm
            ano={ano}
            semestre={semestre}
            resultados={resultados}
            dia={dia}
            horariosInicio={horariosInicio}
            horariosFim={horariosFim}
            config={config}
            closeModalForm={handleCloseTrocaSala}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        maxWidth="sm"
        id="modalForm-exportar"
        scroll="body"
        open={openExportarForm}
        onClose={handleCloseExportar}
      >
        <DialogContent>
          <ExportarResultadoForm
            ano={ano}
            semestre={semestre}
            closeModalForm={handleCloseExportar}
            resultados={resultados}
            horariosInicio={horariosInicio}
            state={state}
            filterFn={filterFn}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        maxWidth="sm"
        fullWidth
        open={openQuickSwap}
        onClose={() => setOpenQuickSwap(false)}
      >
        <DialogTitle>Confirmar troca de salas</DialogTitle>
        <DialogContent dividers>
          {selectedAlocacoes.length === 2 && (
            <Stack spacing={2}>
              <Typography variant="body2">
                As salas das duas turmas serão trocadas entre si:
              </Typography>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {selectedAlocacoes[0]?.turma?.nomeDisciplina ||
                    selectedAlocacoes[0]?.turma?.idTurma}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {selectedAlocacoes[0]?.sala?.predio}{" "}
                  {selectedAlocacoes[0]?.sala?.numeroSala}
                  {"  →  "}
                  <b>
                    {selectedAlocacoes[1]?.sala?.predio}{" "}
                    {selectedAlocacoes[1]?.sala?.numeroSala}
                  </b>
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {selectedAlocacoes[1]?.turma?.nomeDisciplina ||
                    selectedAlocacoes[1]?.turma?.idTurma}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {selectedAlocacoes[1]?.sala?.predio}{" "}
                  {selectedAlocacoes[1]?.sala?.numeroSala}
                  {"  →  "}
                  <b>
                    {selectedAlocacoes[0]?.sala?.predio}{" "}
                    {selectedAlocacoes[0]?.sala?.numeroSala}
                  </b>
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenQuickSwap(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SwapHorizIcon />}
            onClick={handleConfirmSwap}
          >
            Confirmar troca
          </Button>
        </DialogActions>
      </Dialog>

      <AlterarSalaForm
        open={openAlterarSala}
        onClose={() => setOpenAlterarSala(false)}
        alocacao={selectedAlocacoes[0]}
        onSuccess={() => {
          setOpenAlterarSala(false);
          setSwapMsg({
            severity: "success",
            text: "Sala alterada com sucesso.",
          });
          clearSelection();
          retornaResultados(ano, semestre);
        }}
        onError={(msg) => {
          setOpenAlterarSala(false);
          setSwapMsg({ severity: "error", text: msg });
        }}
      />

      <Snackbar
        open={!!swapMsg}
        autoHideDuration={4000}
        onClose={() => setSwapMsg(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {swapMsg ? (
          <Alert
            onClose={() => setSwapMsg(null)}
            severity={swapMsg.severity}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {swapMsg.text}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  );
};

export default Agenda;
