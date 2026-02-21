import React, { useEffect, useState } from "react";
import PageHeader from "../../re-usable/page-header.component";
import AccessibleIcon from "@mui/icons-material/Accessible";
import {
  TableBody,
  TableCell,
  TableRow,
  Grid,
  Toolbar,
  TextField,
  DialogContent,
  DialogTitle,
  DialogActions,
  Container,
  Box,
  Dialog,
  Button,
  IconButton,
  TableContainer,
  Paper,
  Checkbox,
  Typography,
  Chip,
  Tooltip,
  MenuItem,
  Select as MuiSelect,
  FormControl,
  InputLabel,
} from "@mui/material";
import HelpIcon from "@mui/icons-material/Help";
import SaveIcon from "@mui/icons-material/Save";
import UndoIcon from "@mui/icons-material/Undo";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import useTable from "../../re-usable/useTable";
import SelectComponent from "../../forms/select.component";
import SearchIcon from "@mui/icons-material/Search";
import InputAdornment from "@mui/material/InputAdornment";
import Mensagem from "../../re-usable/mensagem.component";
import ConfirmDialog from "../../re-usable/confirmDialog.component";
import SolicitacoesService, {
  TIPOS_SOLICITACAO,
} from "../../../services/solicitacoes";
import AjudaSolicitacoes from "../help/ajuda-solicitacoes.component";

const tableRowCss = { "& .MuiTableCell-root": { padding: 1 } };
const tableStyle = {
  "& thead th span": { fontWeight: "600", fontSize: "0.7rem" },
  "& tbody td": { fontSize: "0.7rem" },
};

const headCells = [
  { id: "actions", label: "Ações", disableSorting: true },
  { id: "idTurma", label: "ID Turma" },
  { id: "nomeDisciplina", label: "Disciplina" },
  { id: "turma", label: "Turma" },
  { id: "diaDaSemana", label: "Dia" },
  { id: "horarioInicio", label: "Início" },
  { id: "horarioFim", label: "Fim" },
  { id: "campus", label: "Campus" },
  { id: "departamentoOriginal", label: "Depto Original" },
  { id: "tipoSolicitacaoLabel", label: "Solicitação" },
  { id: "departamentoFake", label: "Depto Acessibilidade" },
];

const thisYear = new Date().getFullYear();

const chipColors = {
  terreo: "#4caf50",
  prancheta: "#ff9800",
  qv: "#2e7d32",
  qb: "#1565c0",
  lab: "#7b1fa2",
  "esp-norte": "#c62828",
  "esp-sul": "#00838f",
};

const SolicitacoesList = (props) => {
  const { config, user, logout } = props;

  const [solicitacoes, setSolicitacoes] = useState([]);
  const [openHelp, setOpenHelp] = useState(false);
  const [filterFn, setFilterFn] = useState({ fn: (items) => items });
  const [anos, setAnos] = useState([]);
  const [anoTable, setAnoTable] = useState(thisYear);
  const [semestreTable, setSemestreTable] = useState(1);
  const [notify, setNotify] = useState({
    isOpen: false,
    message: "",
    type: "info",
  });
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    subtitle: "",
  });
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    retornaAnos();
  }, []);

  useEffect(() => {
    retornaSolicitacoes();
  }, [anoTable, semestreTable]);

  const retornaSolicitacoes = () => {
    const data = SolicitacoesService.getByAnoSemestre(anoTable, semestreTable);
    setSolicitacoes(data);
  };

  const retornaAnos = () => {
    const anoAtual = new Date().getFullYear();
    const firstYear = anoAtual - 4;
    let anosList = [];
    for (let i = 0; i < 6; i++) anosList.push(firstYear + i);
    setAnos(anosList);
  };

  const handleAnoTableSelect = (e) => setAnoTable(e.target.value);
  const handleSemestreTableSelect = (e) => setSemestreTable(e.target.value);

  const handleSearch = (e) => {
    let target = e.target;
    setFilterFn({
      fn: (items) => {
        if (target.value === "") return items;
        const searchTerm = target.value.toLowerCase();
        return items.filter(
          (s) =>
            s.nomeDisciplina.toLowerCase().includes(searchTerm) ||
            s.idTurma?.toString().toLowerCase().includes(searchTerm) ||
            s.tipoSolicitacaoLabel.toLowerCase().includes(searchTerm),
        );
      },
    });
  };

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelecteds = recordsAfterPagingAndSorting().map((s) => s.turmaId);
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;

  const handleClick = (event, id) => {
    if (
      event.target.closest(".MuiIconButton-root") ||
      event.target.closest("button")
    )
      return;
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];
    if (selectedIndex === -1) newSelected = newSelected.concat(selected, id);
    else if (selectedIndex === 0)
      newSelected = newSelected.concat(selected.slice(1));
    else if (selectedIndex === selected.length - 1)
      newSelected = newSelected.concat(selected.slice(0, -1));
    else if (selectedIndex > 0)
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    setSelected(newSelected);
  };

  const handleRemoveSolicitacao = (turmaId) => {
    setConfirmDialog({
      isOpen: true,
      title: "Remover Solicitação",
      subtitle:
        "Deseja remover esta solicitação? O departamento da turma não será revertido automaticamente.",
      onConfirm: () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        SolicitacoesService.removeSolicitacao(turmaId);
        retornaSolicitacoes();
        setNotify({
          isOpen: true,
          message: "Solicitação removida.",
          type: "success",
        });
      },
    });
  };

  const handleRemoveSelected = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Remover Solicitações",
      subtitle: `Deseja remover as ${selected.length} solicitações selecionadas?`,
      onConfirm: () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        selected.forEach((turmaId) =>
          SolicitacoesService.removeSolicitacao(turmaId),
        );
        setSelected([]);
        retornaSolicitacoes();
        setNotify({
          isOpen: true,
          message: "Solicitações removidas.",
          type: "success",
        });
      },
    });
  };

  const handleAplicarTodas = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Aplicar Todas as Solicitações",
      subtitle: `Isso irá alterar o departamento de ${solicitacoes.length} turma(s) para os departamentos de acessibilidade correspondentes. Confirma?`,
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        try {
          await SolicitacoesService.aplicarTodas(anoTable, semestreTable);
          setNotify({
            isOpen: true,
            message: `${solicitacoes.length} solicitação(ões) aplicada(s) com sucesso!`,
            type: "success",
          });
        } catch (err) {
          setNotify({
            isOpen: true,
            message: "Erro ao aplicar solicitações.",
            type: "error",
          });
        }
      },
    });
  };

  const handleReverterTodas = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Reverter Todas as Solicitações",
      subtitle: `Isso irá restaurar o departamento original de ${solicitacoes.length} turma(s) e remover as solicitações. Confirma?`,
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        try {
          await SolicitacoesService.reverterTodas(anoTable, semestreTable);
          retornaSolicitacoes();
          setNotify({
            isOpen: true,
            message: "Solicitações revertidas com sucesso!",
            type: "success",
          });
        } catch (err) {
          setNotify({
            isOpen: true,
            message: "Erro ao reverter solicitações.",
            type: "error",
          });
        }
      },
    });
  };

  const handleAplicarUma = async (turmaId) => {
    try {
      await SolicitacoesService.aplicarSolicitacao(turmaId);
      setNotify({
        isOpen: true,
        message: "Solicitação aplicada com sucesso!",
        type: "success",
      });
    } catch (err) {
      setNotify({
        isOpen: true,
        message: "Erro ao aplicar solicitação.",
        type: "error",
      });
    }
  };

  const handleReverterUma = async (turmaId) => {
    try {
      await SolicitacoesService.reverterSolicitacao(turmaId);
      retornaSolicitacoes();
      setNotify({
        isOpen: true,
        message: "Solicitação revertida com sucesso!",
        type: "success",
      });
    } catch (err) {
      setNotify({
        isOpen: true,
        message: "Erro ao reverter solicitação.",
        type: "error",
      });
    }
  };

  const { TblContainer, TblHead, TblPagination, recordsAfterPagingAndSorting } =
    useTable(solicitacoes, headCells, filterFn);

  return (
    <>
      <PageHeader
        title="Solicitações de Acessibilidade"
        subtitle="Gerenciamento de solicitações especiais para turmas (térreo, prancheta, QV, QB, lab, etc.)"
        icon={<AccessibleIcon />}
      />
      <Mensagem notify={notify} setNotify={setNotify} />
      <ConfirmDialog
        confirmDialog={confirmDialog}
        setConfirmDialog={setConfirmDialog}
      />

      <Paper>
        <Toolbar>
          <Grid
            container
            spacing={2}
            sx={{ paddingTop: "12px" }}
            alignItems="center"
            justifyContent="space-between"
            columns={24}
          >
            <Grid item xs={24} sm={12} md={8}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Tooltip title="Aplicar todas as solicitações no solver (altera departamento das turmas)">
                  <Button
                    startIcon={<PlayArrowIcon />}
                    variant="contained"
                    color="success"
                    onClick={handleAplicarTodas}
                    sx={{ fontSize: "11px", py: 1 }}
                    disabled={solicitacoes.length === 0}
                  >
                    Aplicar Todas
                  </Button>
                </Tooltip>
                <Tooltip title="Reverter todas as solicitações (restaura departamento original)">
                  <Button
                    startIcon={<UndoIcon />}
                    variant="outlined"
                    color="warning"
                    onClick={handleReverterTodas}
                    sx={{ fontSize: "11px", py: 1 }}
                    disabled={solicitacoes.length === 0}
                  >
                    Reverter Todas
                  </Button>
                </Tooltip>
              </Box>
            </Grid>

            <Grid item xs={24} sm={12} md={8}>
              <TextField
                sx={{ width: "100%" }}
                variant="outlined"
                size="small"
                placeholder="Buscar disciplina ou tipo..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                onChange={handleSearch}
              />
            </Grid>

            <Grid
              item
              xs={24}
              sm={12}
              md={8}
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              <Box sx={{ width: 100 }}>
                {anos.length > 0 && (
                  <SelectComponent
                    label="Ano"
                    value={anoTable}
                    onChange={handleAnoTableSelect}
                    options={anos}
                  />
                )}
              </Box>
              <Box sx={{ width: 80 }}>
                <SelectComponent
                  label="Sem"
                  value={semestreTable}
                  onChange={handleSemestreTableSelect}
                  options={[1, 2]}
                />
              </Box>
              <IconButton color="inherit" onClick={() => setOpenHelp(true)}>
                <HelpIcon />
              </IconButton>
            </Grid>
          </Grid>
        </Toolbar>
        <br />

        {/* Resumo por tipo */}
        {solicitacoes.length > 0 && (
          <Box sx={{ px: 2, pb: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
            <Typography
              variant="caption"
              sx={{ mr: 1, alignSelf: "center", fontWeight: 600 }}
            >
              Resumo:
            </Typography>
            {TIPOS_SOLICITACAO.map((tipo) => {
              const count = solicitacoes.filter(
                (s) => s.tipoSolicitacao === tipo.id,
              ).length;
              if (count === 0) return null;
              return (
                <Chip
                  key={tipo.id}
                  label={`${tipo.label}: ${count}`}
                  size="small"
                  sx={{
                    backgroundColor: chipColors[tipo.id],
                    color: "#fff",
                    fontWeight: 600,
                  }}
                />
              );
            })}
            <Chip
              label={`Total: ${solicitacoes.length}`}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Box>
        )}
      </Paper>
      <br />

      <Dialog maxWidth="md" open={openHelp} onClose={() => setOpenHelp(false)}>
        <DialogContent>
          <AjudaSolicitacoes />
        </DialogContent>
      </Dialog>

      <TableContainer component={Paper}>
        <TblContainer
          sx={tableStyle}
          tableTitle={`Solicitações - ${anoTable}/${semestreTable}°`}
          numSelected={selected.length}
          deleteSelected={handleRemoveSelected}
        >
          <TblHead
            onSelectAllClick={handleSelectAllClick}
            numSelected={selected.length}
            rowCount={recordsAfterPagingAndSorting().length}
          />
          <TableBody>
            {recordsAfterPagingAndSorting().map((sol, index) => {
              const isItemSelected = isSelected(sol.turmaId);
              const labelId = `solicitacoes-table-checkbox-${index}`;

              return (
                <TableRow
                  key={sol.turmaId}
                  sx={tableRowCss}
                  selected={isItemSelected}
                  aria-checked={isItemSelected}
                  role="checkbox"
                  onClick={(event) => handleClick(event, sol.turmaId)}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      color="primary"
                      checked={isItemSelected}
                      inputProps={{ "aria-labelledby": labelId }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      <Tooltip title="Aplicar (altera departamento)">
                        <IconButton
                          sx={{ padding: "4px" }}
                          color="success"
                          size="small"
                          onClick={() => handleAplicarUma(sol.turmaId)}
                        >
                          <PlayArrowIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reverter (restaura departamento original)">
                        <IconButton
                          sx={{ padding: "4px" }}
                          color="warning"
                          size="small"
                          onClick={() => handleReverterUma(sol.turmaId)}
                        >
                          <UndoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remover solicitação">
                        <IconButton
                          sx={{ padding: "4px" }}
                          color="error"
                          size="small"
                          onClick={() => handleRemoveSolicitacao(sol.turmaId)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>{sol.idTurma}</TableCell>
                  <TableCell>{sol.nomeDisciplina}</TableCell>
                  <TableCell>{sol.turma}</TableCell>
                  <TableCell>{sol.diaDaSemana}</TableCell>
                  <TableCell>{sol.horarioInicio}</TableCell>
                  <TableCell>{sol.horarioFim}</TableCell>
                  <TableCell>{sol.campus}</TableCell>
                  <TableCell>{sol.departamentoOriginal}</TableCell>
                  <TableCell>
                    <Chip
                      label={sol.tipoSolicitacaoLabel}
                      size="small"
                      sx={{
                        backgroundColor:
                          chipColors[sol.tipoSolicitacao] || "#666",
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: "0.65rem",
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 600, color: "primary.main" }}
                    >
                      {sol.departamentoFake}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </TblContainer>
        <TblPagination />
      </TableContainer>

      {solicitacoes.length === 0 && (
        <Paper sx={{ p: 4, textAlign: "center", mt: 2 }}>
          <AccessibleIcon sx={{ fontSize: 60, color: "#ccc", mb: 2 }} />
          <Typography variant="h6" color="textSecondary">
            Nenhuma solicitação de acessibilidade para {anoTable}/
            {semestreTable}°
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Para adicionar solicitações, vá à página de <b>Turmas</b>, clique
            com o <b>botão direito</b> em uma turma e selecione{" "}
            <b>"Adicionar Solicitação"</b>.
          </Typography>
        </Paper>
      )}
    </>
  );
};

export default SolicitacoesList;
