import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import RoomIcon from "@mui/icons-material/Room";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ResultadosDataService from "../../services/resultados";

const badgeStyle = { fontSize: "0.65rem", height: 20 };

// Modal para alocar manualmente uma turma que NÃO foi alocada pelo solver
// (ex.: Pós-Graduação). Lista as salas livres no dia/horário da turma e insere
// a alocação no resultado correspondente.
const AlocarTurmaForm = (props) => {
  const { open, onClose, turma, onSuccess, onError } = props;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [salas, setSalas] = useState([]);
  const [contexto, setContexto] = useState(null); // { periodo, slots, dia }
  const [loadError, setLoadError] = useState(null);
  const [predioFilter, setPredioFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedSala, setSelectedSala] = useState(null);
  const [confirmStep, setConfirmStep] = useState(false);

  useEffect(() => {
    if (!open || !turma) return;
    setLoading(true);
    setSalas([]);
    setContexto(null);
    setLoadError(null);
    setSelectedSala(null);
    setSearch("");
    setPredioFilter("");
    setConfirmStep(false);

    ResultadosDataService.getSalasLivresTurma(turma._id)
      .then((res) => {
        setSalas(res.data?.livres || []);
        setContexto({
          periodo: res.data?.periodo,
          slots: res.data?.slots || [],
          dia: res.data?.dia,
        });
      })
      .catch((err) => {
        setLoadError(
          err?.response?.data?.error ||
            "Não foi possível carregar as salas livres.",
        );
      })
      .finally(() => setLoading(false));
  }, [open, turma]);

  const predios = useMemo(() => {
    const set = new Set(salas.map((s) => s.predio).filter(Boolean));
    return Array.from(set).sort();
  }, [salas]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return salas.filter((s) => {
      if (predioFilter && s.predio !== predioFilter) return false;
      if (!q) return true;
      return (
        (s.predio || "").toLowerCase().includes(q) ||
        (s.numeroSala || "").toLowerCase().includes(q) ||
        String(s.capacidade || "").includes(q)
      );
    });
  }, [salas, predioFilter, search]);

  const totalAlunos = Number(turma?.totalTurma) || 0;

  const handleConfirm = () => {
    if (!selectedSala || !turma) return;
    setSubmitting(true);
    ResultadosDataService.alocarManual({
      turmaId: turma._id,
      salaId: selectedSala._id,
    })
      .then((res) => {
        setSubmitting(false);
        onSuccess && onSuccess(res?.data);
      })
      .catch((err) => {
        setSubmitting(false);
        const msg =
          err?.response?.data?.error || "Falha ao alocar a turma.";
        onError && onError(msg);
      });
  };

  if (!turma) return null;

  const slotsLabel =
    contexto?.slots?.length === 2
      ? "bloco de 4h (2 horários)"
      : contexto?.slots?.length === 1
        ? `horário ${contexto.slots[0]}`
        : "";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6">Alocar turma em sala livre</Typography>
            <Typography variant="caption" color="textSecondary">
              {turma?.nomeDisciplina || turma?.idTurma} — turma {turma?.turma} —{" "}
              {turma?.diaDaSemana} {turma?.horarioInicio}-{turma?.horarioFim}
              {contexto?.periodo ? ` (${contexto.periodo}, ${slotsLabel})` : ""}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ minHeight: 400 }}>
        {loadError ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <WarningAmberIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="body2" color="textSecondary">
              {loadError}
            </Typography>
          </Box>
        ) : confirmStep ? (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2">
              Confirma a alocação desta turma na sala abaixo?
            </Typography>
            <Box
              sx={{
                p: 2,
                bgcolor: "#fafafa",
                borderRadius: 1,
                border: "1px solid #e0e0e0",
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {turma?.nomeDisciplina || turma?.idTurma} (turma {turma?.turma})
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                {turma?.diaDaSemana} {turma?.horarioInicio}-{turma?.horarioFim}
                {"  →  "}
                <b style={{ color: "#2e7d32" }}>
                  {selectedSala?.predio} {selectedSala?.numeroSala}
                </b>
              </Typography>
            </Box>
            {totalAlunos > 0 &&
              selectedSala?.capacidade &&
              selectedSala.capacidade < totalAlunos && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "#d32f2f" }}>
                  <WarningAmberIcon fontSize="small" />
                  <Typography variant="caption">
                    Capacidade da sala ({selectedSala.capacidade}) é menor que o
                    número de alunos ({totalAlunos}).
                  </Typography>
                </Stack>
              )}
          </Stack>
        ) : (
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                size="small"
                fullWidth
                placeholder="Buscar (prédio, sala, capacidade)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                size="small"
                select
                label="Prédio"
                value={predioFilter}
                onChange={(e) => setPredioFilter(e.target.value)}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="">Todos</MenuItem>
                {predios.map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : filtered.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography variant="body2" color="textSecondary">
                  Nenhuma sala livre encontrada para este dia/horário.
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  maxHeight: 360,
                  overflowY: "auto",
                  border: "1px solid #eee",
                  borderRadius: 1,
                }}
              >
                {filtered.map((s) => {
                  const isSel = selectedSala?._id === s._id;
                  const undersized = totalAlunos > 0 && s.capacidade < totalAlunos;
                  return (
                    <Box
                      key={s._id}
                      onClick={() => setSelectedSala(s)}
                      sx={{
                        cursor: "pointer",
                        p: 1.25,
                        borderBottom: "1px solid #f0f0f0",
                        bgcolor: isSel ? "#e8f5e9" : "transparent",
                        borderLeft: isSel
                          ? "4px solid #2e7d32"
                          : "4px solid transparent",
                        "&:hover": { bgcolor: isSel ? "#e8f5e9" : "#fafafa" },
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <RoomIcon fontSize="small" sx={{ color: "#888" }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {s.predio} {s.numeroSala}
                        </Typography>
                        <Chip
                          size="small"
                          label={`${s.capacidade} lugares`}
                          variant="outlined"
                          sx={{
                            ...badgeStyle,
                            color: undersized ? "#d32f2f" : "inherit",
                            borderColor: undersized ? "#d32f2f" : undefined,
                          }}
                        />
                        {s.tipoQuadro && s.tipoQuadro !== "Indiferente" && (
                          <Chip size="small" label={`Quadro ${s.tipoQuadro}`} variant="outlined" sx={badgeStyle} />
                        )}
                        {s.terreo && <Chip size="small" label="Térreo" variant="outlined" sx={badgeStyle} />}
                        {s.acessivel && <Chip size="small" label="Acessível" variant="outlined" sx={badgeStyle} />}
                        {s.prancheta && <Chip size="small" label="Prancheta" variant="outlined" sx={badgeStyle} />}
                        {s.laboratorio && <Chip size="small" label="Laboratório" variant="outlined" sx={badgeStyle} />}
                      </Stack>
                    </Box>
                  );
                })}
              </Box>
            )}
            {!loading && (
              <Typography variant="caption" color="textSecondary">
                {salas.length} sala(s) livre(s) neste dia/horário
                {filtered.length !== salas.length ? ` — ${filtered.length} após filtros` : ""}.
              </Typography>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        {confirmStep ? (
          <>
            <Button onClick={() => setConfirmStep(false)} disabled={submitting}>
              Voltar
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleConfirm}
              disabled={submitting}
            >
              {submitting ? "Alocando..." : "Confirmar alocação"}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>Cancelar</Button>
            <Button
              variant="contained"
              color="success"
              onClick={() => setConfirmStep(true)}
              disabled={!selectedSala || loading || !!loadError}
            >
              Avançar
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AlocarTurmaForm;
