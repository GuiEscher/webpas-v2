import React, { useEffect, useState } from "react";
import TurmaForm from "../../forms/turmaForm.component";
import FileFormTurma from "../../forms/fileFormTurma.component";
import PageHeader from "../../re-usable/page-header.component";
import SchoolIcon from "@mui/icons-material/School";
import {
  Modal,
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
  ToggleButton,
  ToggleButtonGroup,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import HelpIcon from "@mui/icons-material/Help";
import SaveIcon from "@mui/icons-material/Save";
import UndoIcon from "@mui/icons-material/Undo";
import useTable from "../../re-usable/useTable";
import TurmasDataService from "../../../services/turmas";
import Select from "../../forms/select.component";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import InputAdornment from "@mui/material/InputAdornment";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Mensagem from "../../re-usable/mensagem.component";
import ConfirmDialog from "../../re-usable/confirmDialog.component";
import handleServerResponses from "../../../services/response-handler";
import AjudaTurma from "../help/ajuda-turma.component";
import ErrorIcon from "@mui/icons-material/Error";

const tableRowCss = { "& .MuiTableCell-root": { padding: 1 } };
const tableStyle = {
  "& thead th span": { fontWeight: "600", fontSize: "0.7rem" },
  "& tbody td": { fontSize: "0.7rem" },
};

// --- AJUSTE 1: Adicionar "ID Horário" no cabeçalho ---
const headCells = [
  { id: "actions", label: "Editar", disableSorting: true },
  { id: "idTurma", label: "idTurma" },
  { id: "horario_id", label: "ID Horário" }, // Novo campo
  { id: "nomeDisciplina", label: "Nome da Disciplina" },
  { id: "turma", label: "Turma" },
  { id: "totalTurma", label: "Total" },
  { id: "diaDaSemana", label: "Dia" },
  { id: "horarioInicio", label: "Início" },
  { id: "horarioFim", label: "Fim" },
  { id: "campus", label: "Campus" },
  { id: "tipoQuadro", label: "Quadro", disableSorting: true },
  { id: "creditosAula", label: "Cred." },
  { id: "departamentoOferta", label: "Depto Oferta" },
  { id: "departamentoTurma", label: "Depto Rec." },
  { id: "docentes", label: "Docentes" },
  { id: "codDisciplina", label: "Cód. Disc." },
];

const thisYear = new Date().getFullYear();

const TurmasList = (props) => {
  const { config, user, logout } = props;

  const [turmas, setTurmas] = useState([]);
  const [openModalForm, setOpenModalForm] = useState(false);
  const [openModalFile, setOpenModalFile] = useState(false);

  // --- ESTADOS DO MODAL DE EXCLUSÃO ---
  const [openModalDelete, setOpenModalDelete] = useState(false);
  const [semestresDisponiveis, setSemestresDisponiveis] = useState([]);
  const [semestresParaDeletar, setSemestresParaDeletar] = useState([]);
  // ------------------------------------

  const [openHelp, setOpenHelp] = useState(false);
  const [horariosInicio, setHorariosInicio] = useState([]);
  const [horariosFim, setHorariosFim] = useState([]);
  const [turmaEdit, setTurmaEdit] = useState(null);
  const [updatingT, setUpdatingT] = useState(false);
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
  const [selected, setSelected] = React.useState([]);
  const [listaErros, setListaErros] = useState([]);
  const [openErros, setOpenErros] = useState(false);

  const [viewCampus, setViewCampus] = useState("São Carlos");
  const [pendingChanges, setPendingChanges] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    retornaAnos();
  }, []);
  useEffect(() => {
    retornaHorarios();
  }, [config]);
  useEffect(() => {
    setPendingChanges({});
    retornaTurmas(anoTable, semestreTable);
  }, [anoTable, semestreTable, notify]);

  const handleCloseModalForm = () => {
    setOpenModalForm(false);
    setSelected([]);
  };
  const handleOpenModalFile = () => setOpenModalFile(true);
  const handleCloseModalFile = () => setOpenModalFile(false);
  const handleCloseHelp = () => setOpenHelp(false);
  const handleOpenHelp = () => setOpenHelp(true);
  const handleCloseErros = () => setOpenErros(false);
  const handleOpenErros = () => setOpenErros(true);

  // --- LÓGICA DO DELETE MANAGER ---
  const handleOpenDeleteManager = () => {
    TurmasDataService.getSemestresDisponiveis()
      .then((res) => {
        setSemestresDisponiveis(res.data);
        setSemestresParaDeletar([]);
        setOpenModalDelete(true);
      })
      .catch((err) => {
        setNotify({
          isOpen: true,
          message: "Erro ao buscar semestres.",
          type: "error",
        });
      });
  };

  const handleCloseDeleteManager = () => setOpenModalDelete(false);

  // Lógica para marcar/desmarcar um semestre da lista
  const handleToggleDeleteSemestre = (value) => {
    // value é um objeto {ano: 2023, semestre: 1}
    // Usamos findIndex para achar se já está na lista de deletar
    const currentIndex = semestresParaDeletar.findIndex(
      (item) => item.ano === value.ano && item.semestre === value.semestre,
    );
    const newChecked = [...semestresParaDeletar];

    if (currentIndex === -1) {
      newChecked.push(value);
    } else {
      newChecked.splice(currentIndex, 1);
    }
    setSemestresParaDeletar(newChecked);
  };

  const handleSelectAllDelete = () => {
    if (semestresParaDeletar.length === semestresDisponiveis.length) {
      setSemestresParaDeletar([]);
    } else {
      setSemestresParaDeletar(semestresDisponiveis);
    }
  };

  const confirmBatchDelete = () => {
    if (semestresParaDeletar.length === 0) return;

    setConfirmDialog({
      isOpen: true,
      title: "Excluir Períodos Selecionados",
      subtitle: `Você está prestes a apagar TODAS as turmas de ${semestresParaDeletar.length} semestre(s) selecionado(s). Esta ação é irreversível. Deseja continuar?`,
      onConfirm: () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });

        const data = { periodos: semestresParaDeletar };

        TurmasDataService.deletePeriodos(data)
          .then((res) => {
            setOpenModalDelete(false);
            handleServerResponses("turmas", res, setNotify);
            // Se o ano/semestre atual foi deletado, a tabela vai esvaziar sozinha no próximo refresh
            retornaTurmas(anoTable, semestreTable);
          })
          .catch((err) => handleServerResponses("turmas", err, setNotify));
      },
    });
  };
  // --------------------------------

  const retornaTurmas = (ano, semestre) => {
    TurmasDataService.getByAnoSemestre(ano, semestre)
      .then((response) => {
        setTurmas(response.data);
      })
      .catch((err) => {
        let notAuthorized = err.response.data?.notAuth
          ? err.response.data.notAuth
          : false;
        if (notAuthorized) logout();
        handleServerResponses("turmas", err, setNotify);
      });
  };

  const handleAnoTableSelect = (e) => setAnoTable(e.target.value);
  const handleSemestreTableSelect = (e) => setSemestreTable(e.target.value);

  const handleLocalChangeQuadro = (id, novoValor) => {
    const valorFinal = novoValor || "Indiferente";
    setPendingChanges((prev) => ({ ...prev, [id]: valorFinal }));
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    const updates = Object.keys(pendingChanges).map((id) => {
      return TurmasDataService.updateTurma(id, {
        tipoQuadro: pendingChanges[id],
      });
    });
    try {
      await Promise.all(updates);
      setNotify({
        isOpen: true,
        message: "Alterações salvas!",
        type: "success",
      });
      setPendingChanges({});
      retornaTurmas(anoTable, semestreTable);
    } catch (error) {
      setNotify({ isOpen: true, message: "Erro ao salvar.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChanges = () => setPendingChanges({});

  const handleViewCampusChange = (event, newView) => {
    if (newView !== null) {
      setViewCampus(newView);
      setSelected([]);
    }
  };

  const retornaHorarios = () => {
    let periodos = config.periodos ? config.periodos : [];
    if (config.horarios) {
      let horariosI = [];
      let horariosF = [];
      periodos.map((periodo) => {
        horariosI.push(config.horarios[periodo]["Início"].slot1);
        horariosI.push(config.horarios[periodo]["Início"].slot2);
        horariosF.push(config.horarios[periodo]["Fim"].slot1);
        horariosF.push(config.horarios[periodo]["Fim"].slot2);
      });
      setHorariosInicio(horariosI);
      setHorariosFim(horariosF);
    }
  };

  const retornaAnos = () => {
    const anoAtual = new Date().getFullYear();
    const firstYear = anoAtual - 4;
    let anosList = [];
    for (let i = 0; i < 6; i++) anosList.push(firstYear + i);
    setAnos(anosList);
  };

  const handleSearch = (e) => {
    let target = e.target;
    setFilterFn({
      fn: (items) => {
        if (target.value == "") return items;
        const searchTerm = target.value.toLowerCase();
        return items.filter(
          (turma) =>
            turma.nomeDisciplina.toLowerCase().includes(searchTerm) ||
            // Permite buscar também pelo ID do Horário
            (turma.horario_id &&
              String(turma.horario_id).toLowerCase().includes(searchTerm)),
        );
      },
    });
  };

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const visibleTurmas = recordsAfterPagingAndSorting().filter(
        (t) => t.campus === viewCampus,
      );
      const newSelecteds = visibleTurmas.map((turma) => turma._id);
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  };

  const isSelected = (name) => selected.indexOf(name) !== -1;

  const handleClick = (event, name) => {
    if (
      event.target.closest(".MuiToggleButtonGroup-root") ||
      event.target.closest(".MuiIconButton-root") ||
      event.target.closest("button")
    )
      return;
    const selectedIndex = selected.indexOf(name);
    let newSelected = [];
    if (selectedIndex === -1) newSelected = newSelected.concat(selected, name);
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

  const fileHandleResponse = (res) => {
    setOpenModalFile(false);
    handleServerResponses("turmas", res, setNotify);
    retornaTurmas(anoTable, semestreTable);
  };

  const addOrEdit = (updating, turma, resetForm) => {
    let data = { ...turma };
    const request = updating
      ? TurmasDataService.updateTurma(turma._id, data)
      : TurmasDataService.addTurma(data);
    request
      .then((res) => handleServerResponses("turmas", res, setNotify))
      .catch((err) => handleServerResponses("turmas", err, setNotify));
    resetForm();
    setOpenModalForm(false);
    retornaTurmas(anoTable, semestreTable);
  };

  const onDelete = (turmasIds) => {
    setConfirmDialog({ ...confirmDialog, isOpen: false });
    let data = { turmasID: turmasIds };
    TurmasDataService.deleteTurmas(data)
      .then((res) => {
        handleServerResponses("turmas", res, setNotify);
        retornaTurmas(anoTable, semestreTable);
        setSelected([]);
      })
      .catch((err) => handleServerResponses("turmas", err, setNotify));
  };

  const turmasFiltradasPorCampus = turmas.filter(
    (t) => t.campus === viewCampus,
  );
  const { TblContainer, TblHead, TblPagination, recordsAfterPagingAndSorting } =
    useTable(turmasFiltradasPorCampus, headCells, filterFn);

  const openInModalEdit = (turma) => {
    setUpdatingT(true);
    setTurmaEdit(turma);
    setOpenModalForm(true);
  };
  const openInModalNew = () => {
    setUpdatingT(false);
    setTurmaEdit(null);
    setOpenModalForm(true);
  };
  const changesCount = Object.keys(pendingChanges).length;

  return (
    <>
      <PageHeader
        title="Turmas"
        subtitle="Cadastro, edição e visualização de turmas"
        icon={<SchoolIcon />}
      />
      <Mensagem notify={notify} setNotify={setNotify} />
      <ConfirmDialog
        confirmDialog={confirmDialog}
        setConfirmDialog={setConfirmDialog}
      />

      {changesCount > 0 && (
        <Paper
          elevation={4}
          sx={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            p: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
            backgroundColor: "#fff9c4",
            border: "1px solid #fbc02d",
          }}
        >
          <Typography variant="body2" color="warning.dark">
            <b>{changesCount}</b> alterações pendentes.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSaveChanges}
            disabled={saving}
            size="small"
          >
            {saving ? "Salvando..." : "Salvar Agora"}
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<UndoIcon />}
            onClick={handleDiscardChanges}
            disabled={saving}
            size="small"
          >
            Descartar
          </Button>
        </Paper>
      )}

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
            <Grid item xs={24} sm={12} md={6}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  startIcon={<AddIcon />}
                  variant="contained"
                  onClick={handleOpenModalFile}
                  sx={{ fontSize: "12px", py: 1 }}
                >
                  Arquivo
                </Button>
                <Button
                  startIcon={<AddIcon />}
                  variant="contained"
                  onClick={openInModalNew}
                  sx={{ fontSize: "12px", py: 1 }}
                >
                  Formulário
                </Button>
              </Box>
            </Grid>

            <Grid
              item
              xs={24}
              sm={12}
              md={6}
              sx={{
                display: "flex",
                justifyContent: { xs: "flex-start", md: "center" },
              }}
            >
              <ToggleButtonGroup
                color="primary"
                value={viewCampus}
                exclusive
                onChange={handleViewCampusChange}
                size="small"
              >
                <ToggleButton value="São Carlos">São Carlos</ToggleButton>
                <ToggleButton value="Sorocaba">Sorocaba</ToggleButton>
              </ToggleButtonGroup>
            </Grid>

            <Grid item xs={24} sm={12} md={6}>
              <TextField
                sx={{ width: "100%" }}
                variant="outlined"
                size="small"
                placeholder="Buscar disciplina..."
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
              md={6}
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              <Box sx={{ width: 100 }}>
                {anos.length > 0 && (
                  <Select
                    label="Ano"
                    value={anoTable}
                    onChange={handleAnoTableSelect}
                    options={anos}
                  />
                )}
              </Box>
              <Box sx={{ width: 80 }}>
                <Select
                  label="Sem"
                  value={semestreTable}
                  onChange={handleSemestreTableSelect}
                  options={[1, 2]}
                />
              </Box>
              <IconButton color="inherit" onClick={handleOpenHelp}>
                <HelpIcon />
              </IconButton>
            </Grid>

            {listaErros.length > 0 && (
              <Grid item xs={24}>
                <Button
                  startIcon={<ErrorIcon color="error" />}
                  onClick={handleOpenErros}
                  variant="outlined"
                  color="error"
                  fullWidth
                  size="small"
                >
                  Ver Erros ({listaErros.length})
                </Button>
              </Grid>
            )}
          </Grid>
        </Toolbar>
        <br />
      </Paper>
      <br />

      {/* MODAL DE DELEÇÃO (GERENCIADOR DE PERÍODOS) */}
      <Dialog
        open={openModalDelete}
        onClose={handleCloseDeleteManager}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Excluir Períodos (Anos/Semestres)</DialogTitle>
        <DialogContent dividers>
          {semestresDisponiveis.length === 0 ? (
            <Typography variant="body1" align="center" sx={{ py: 3 }}>
              Nenhum período com turmas encontrado no banco de dados.
            </Typography>
          ) : (
            <List>
              <ListItem disablePadding>
                <ListItemButton
                  role={undefined}
                  onClick={handleSelectAllDelete}
                  dense
                >
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={
                        semestresParaDeletar.length ===
                          semestresDisponiveis.length &&
                        semestresDisponiveis.length > 0
                      }
                      indeterminate={
                        semestresParaDeletar.length > 0 &&
                        semestresParaDeletar.length <
                          semestresDisponiveis.length
                      }
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItemIcon>
                  <ListItemText primary={<strong>Selecionar Todos</strong>} />
                </ListItemButton>
              </ListItem>
              <Divider />
              {semestresDisponiveis.map((value, index) => {
                const labelId = `checkbox-list-label-${index}`;
                const isChecked = semestresParaDeletar.some(
                  (item) =>
                    item.ano === value.ano && item.semestre === value.semestre,
                );
                return (
                  <ListItem
                    key={`${value.ano}-${value.semestre}`}
                    disablePadding
                  >
                    <ListItemButton
                      role={undefined}
                      onClick={() => handleToggleDeleteSemestre(value)}
                      dense
                    >
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={isChecked}
                          tabIndex={-1}
                          disableRipple
                          inputProps={{ "aria-labelledby": labelId }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        id={labelId}
                        primary={`${value.ano} - ${value.semestre}º Semestre`}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteManager}>Cancelar</Button>
          <Button
            onClick={confirmBatchDelete}
            color="error"
            variant="contained"
            disabled={semestresParaDeletar.length === 0}
          >
            Excluir Selecionados
          </Button>
        </DialogActions>
      </Dialog>

      <TableContainer component={Paper}>
        {/* Modais existentes... */}
        <Modal
          id="modalFile"
          open={openModalFile}
          onClose={handleCloseModalFile}
        >
          <Box>
            <FileFormTurma
              title="Adicionar Arquivo"
              closeButton={handleCloseModalFile}
              anos={anos}
              config={config}
              horariosInicio={horariosInicio}
              horariosFim={horariosFim}
              user={user}
              handleResponse={fileHandleResponse}
              setListaErros={setListaErros}
            />
          </Box>
        </Modal>
        <Dialog
          maxWidth="md"
          id="modalForm"
          scroll="body"
          open={openModalForm}
          onClose={handleCloseModalForm}
        >
          <DialogContent>
            <TurmaForm
              addOrEdit={addOrEdit}
              turmaEdit={turmaEdit}
              updating={updatingT}
              dias={config.dias}
              horariosInicio={horariosInicio}
              horariosFim={horariosFim}
              anos={anos}
              closeModalForm={handleCloseModalForm}
            />
          </DialogContent>
        </Dialog>
        <Dialog maxWidth="md" open={openHelp} onClose={handleCloseHelp}>
          <DialogContent>
            <AjudaTurma />
          </DialogContent>
        </Dialog>
        <Dialog open={openErros} onClose={handleCloseErros}>
          <DialogContent>
            <Container>
              <h5>Erros: {listaErros.length}</h5>
              {listaErros.map((erro, index) => (
                <div key={index}>
                  <p>Turma: {erro.turma?.idTurma}</p>
                  <p>Erro: {erro.tipo}</p>
                  <br />
                </div>
              ))}
            </Container>
          </DialogContent>
        </Dialog>

        <TblContainer
          sx={tableStyle}
          tableTitle={`Turmas - ${viewCampus}`}
          numSelected={selected.length}
          deleteSelected={() =>
            setConfirmDialog({
              isOpen: true,
              title: "Deletar Turmas",
              subtitle: "Confirma deleção dos itens selecionados?",
              onConfirm: () => onDelete(selected),
            })
          }
          deleteAll={handleOpenDeleteManager}
        >
          <TblHead
            onSelectAllClick={handleSelectAllClick}
            numSelected={selected.length}
            rowCount={recordsAfterPagingAndSorting().length}
          />
          <TableBody>
            {recordsAfterPagingAndSorting().map((turma, index) => {
              if (turma.campus !== viewCampus) return null;
              const isItemSelected = isSelected(turma._id);
              const labelId = `turmas-table-checkbox-${index}`;
              const valorQuadroAtual =
                pendingChanges[turma._id] !== undefined
                  ? pendingChanges[turma._id]
                  : turma.tipoQuadro || "Indiferente";

              return (
                <TableRow
                  key={turma._id}
                  sx={{
                    ...tableRowCss,
                    backgroundColor: pendingChanges[turma._id]
                      ? "#fffde7"
                      : "inherit",
                  }}
                  selected={isItemSelected}
                  aria-checked={isItemSelected}
                  role="checkbox"
                  onClick={(event) => handleClick(event, turma._id)}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      color="primary"
                      checked={isItemSelected}
                      inputProps={{ "aria-labelledby": labelId }}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      sx={{ padding: "4px" }}
                      color="primary"
                      onClick={() => openInModalEdit(turma)}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                  <TableCell>{turma.idTurma}</TableCell>

                  {/* --- AJUSTE 2: Exibir valor de ID Horário ou traço --- */}
                  <TableCell>{turma.horario_id || "-"}</TableCell>
                  {/* ---------------------------------------------------- */}

                  <TableCell>{turma.nomeDisciplina}</TableCell>
                  <TableCell>{turma.turma}</TableCell>
                  <TableCell>{turma.totalTurma}</TableCell>
                  <TableCell>{turma.diaDaSemana}</TableCell>
                  <TableCell>{turma.horarioInicio}</TableCell>
                  <TableCell>{turma.horarioFim}</TableCell>
                  <TableCell>{turma.campus}</TableCell>
                  <TableCell sx={{ minWidth: 110 }}>
                    {turma.campus === "Sorocaba" ? (
                      <ToggleButtonGroup
                        value={valorQuadroAtual}
                        exclusive
                        onChange={(e, val) =>
                          handleLocalChangeQuadro(turma._id, val)
                        }
                        size="small"
                        sx={{ height: 28 }}
                      >
                        <ToggleButton
                          value="Verde"
                          sx={{ fontSize: "0.65rem", px: 1, py: 0 }}
                        >
                          {" "}
                          Verde{" "}
                        </ToggleButton>
                        <ToggleButton
                          value="Branco"
                          sx={{ fontSize: "0.65rem", px: 1, py: 0 }}
                        >
                          {" "}
                          Branco{" "}
                        </ToggleButton>
                      </ToggleButtonGroup>
                    ) : (
                      <Typography variant="caption" color="textSecondary">
                        N/A
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{turma.creditosAula}</TableCell>
                  <TableCell>{turma.departamentoOferta}</TableCell>
                  <TableCell>{turma.departamentoTurma}</TableCell>
                  <TableCell>{turma.docentes}</TableCell>
                  <TableCell>{turma.codDisciplina}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </TblContainer>
        <TblPagination />
      </TableContainer>
    </>
  );
};

export default TurmasList;
