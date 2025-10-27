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
  Container,
  Box, 
  Dialog,
  Button,
  IconButton,
  TableContainer,
  Paper,
  Checkbox,
} from "@mui/material";
import HelpIcon from "@mui/icons-material/Help";
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

const tableRowCss = {
  "& .MuiTableCell-root": {
    padding: 1,
  },
};

const tableStyle = {
  "& thead th span": {
    fontWeight: "600",
    fontSize: "0.7rem",
  },
  "& tbody td": {
    fontSize: "0.7rem",
  },
};

const headCells = [
  { id: "actions", label: "Editar", disableSorting: true },
  { id: "idTurma", label: "idTurma" },
  { id: "nomeDisciplina", label: "Nome da Disciplina" },
  { id: "turma", label: "Turma" },
  { id: "totalTurma", label: "Total de Alunos" },
  { id: "diaDaSemana", label: "Dia" },
  { id: "horarioInicio", label: "Horário de Início" },
  { id: "horarioFim", label: "Horário de Término" },
  { id: "creditosAula", label: "Creditos" },
  { id: "departamentoOferta", label: "Departamento de Oferta" },
  { id: "departamentoTurma", label: "Departamento Recomendado" },
  { id: "campus", label: "Campus" },
  { id: "docentes", label: "Docentes" },
  { id: "codDisciplina", label: "Código da Disciplina" },
];

const thisYear = new Date().getFullYear();

const TurmasList = (props) => {
  const { config, user, logout } = props;

  const [turmas, setTurmas] = useState([]);
  const [openModalForm, setOpenModalForm] = React.useState(false);
  const [openModalFile, setOpenModalFile] = React.useState(false);
  const [openHelp, setOpenHelp] = useState(false);
  const [horariosInicio, setHorariosInicio] = useState([]);
  const [horariosFim, setHorariosFim] = useState([]);
  const [turmaEdit, setTurmaEdit] = useState(null);
  const [updatingT, setUpdatingT] = useState(false);
  const [filterFn, setFilterFn] = useState({
    fn: (items) => {
      return items;
    },
  });
  const [anos, setAnos] = useState([]);
  const [anoTable, setAnoTable] = useState(thisYear);
  const [semestreTable, setSemestreTable] = useState(1);
  const [notify, setNotify] = useState({
    isOpen: false,
    message: "",
    type: "info", // <-- Tipo padrão corrigido
  });
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    subtitle: "",
  });
  const [selected, setSelected] = React.useState([]);
  const [listaErros, setListaErros] = useState([]);
  const [openErros, setOpenErros] = useState(false);

  useEffect(() => {
    retornaAnos();
  }, []);

  useEffect(() => {
    retornaHorarios();
  }, [config]);

  useEffect(() => {
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

  const retornaTurmas = (ano, semestre) => {
    TurmasDataService.getByAnoSemestre(ano, semestre)
      .then((response) => {
        setTurmas(response.data);
      })
      .catch((err) => {
        let notAuthorized = err.response.data?.notAuth
          ? err.response.data.notAuth
          : false;
        if (notAuthorized) {
          logout();
        }
        handleServerResponses("turmas", err, setNotify);
      });
  };

  const handleAnoTableSelect = (e) => {
    setAnoTable(e.target.value);
  };

  const handleSemestreTableSelect = (e) => {
    setSemestreTable(e.target.value);
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
    let anos = [];
    for (let i = 0; i < 6; i++) {
      let anoA = firstYear + i;
      anos.push(anoA);
    }
    setAnos(anos);
  };

  const handleSearch = (e) => {
    let target = e.target;
    setFilterFn({
      fn: (items) => {
        if (target.value == "") {
          return items;
        } else {
          return items.filter((turma) => {
            return turma.nomeDisciplina
              .toLowerCase()
              .includes(target.value.toLowerCase());
          });
        }
      },
    });
  };

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelecteds = recordsAfterPagingAndSorting().map(
        (turma) => turma._id
      );
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  };

  const isSelected = (name) => selected.indexOf(name) !== -1;

  const handleClick = (event, name) => {
    const selectedIndex = selected.indexOf(name);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, name);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }
    setSelected(newSelected);
  };

  const fileHandleResponse = (res) => {
    setOpenModalFile(false);
    handleServerResponses("turmas", res, setNotify);
    retornaTurmas(anoTable, semestreTable);
  };

  const addOrEdit = (updating, turma, resetForm) => {
    let data = { ...turma };
    if (updating) {
      TurmasDataService.updateTurma(turma._id, data)
        .then((res) => handleServerResponses("turmas", res, setNotify))
        .catch((err) => handleServerResponses("turmas", err, setNotify));
      setSelected([]);
    } else {
      TurmasDataService.addTurma(data)
        .then((res) => handleServerResponses("turmas", res, setNotify))
        .catch((err) => handleServerResponses("turmas", err, setNotify));
    }
    resetForm();
    setOpenModalForm(false);
    retornaTurmas(anoTable, semestreTable);
  };

  const onDelete = (turmas) => {
    setConfirmDialog({
      ...confirmDialog,
      isOpen: false,
    });
    let data = { turmasID: turmas };
    TurmasDataService.deleteTurmas(data)
      .then((res) => handleServerResponses("turmas", res, setNotify))
      .catch((err) => handleServerResponses("turmas", err, setNotify));
    retornaTurmas(anoTable, semestreTable);
    setSelected([]);
  };

  const deletarTurmasAnoSemestre = () => {
    setConfirmDialog({
      ...confirmDialog,
      isOpen: false,
    });
    TurmasDataService.deleteAnoSemestre(anoTable, semestreTable)
      .then((res) => handleServerResponses("turmas", res, setNotify))
      .catch((err) => handleServerResponses("turmas", err, setNotify));
  };

  const { TblContainer, TblHead, TblPagination, recordsAfterPagingAndSorting } =
    useTable(turmas, headCells, filterFn);

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
      <Paper>
        <Toolbar>
          <Grid
            container
            spacing={2}
            sx={{ paddingTop: "12px" }}
            alignItems="center"
            justifyContent="space-between"
            columns={22}
          >
            <Grid
              item
              xs={5}
              sx={{ fontSize: "14px", fontWeight: "500", color: "#666" }}
            >
              Adicionar
            </Grid>
            <Grid
              item
              xs={9}
              sx={{ fontSize: "14px", fontWeight: "500", color: "#666" }}
            >
              Buscar
            </Grid>
            <Grid
              item
              xs={7}
              sx={{ fontSize: "14px", fontWeight: "500", color: "#666" }}
            >
              Mostrar
            </Grid>
            <Grid
              item
              xs={1}
              sx={{ fontSize: "14px", fontWeight: "500", color: "#666" }}
            >
              Ajuda
            </Grid>
            <Grid
              item
              xs={6}
              sx={{ fontSize: "14px", fontWeight: "500", color: "#666" }}
              sm={2}
            >
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={handleOpenModalFile}
                sx={{
                  fontSize: "12px",
                  paddingTop: "15px",
                  paddingBottom: "15px",
                }}
              >
                Arquivo
              </Button>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={openInModalNew}
                sx={{
                  fontSize: "12px",
                  paddingTop: "15px",
                  paddingBottom: "15px",
                }}
              >
                Formulário
              </Button>
            </Grid>
            <Grid item xs={6} sm={9}>
              <TextField
                sx={{ width: "100%" }}
                variant="outlined"
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
            <Grid item xs={6} sm={2}>
              {anos.length > 0 && (
                <Select
                  label="Ano"
                  value={anoTable}
                  onChange={handleAnoTableSelect}
                  options={anos}
                />
              )}
            </Grid>
            <Grid item xs={6} sm={2}>
              <Select
                label="Semestre"
                value={semestreTable}
                onChange={handleSemestreTableSelect}
                options={[1, 2]}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              {listaErros.length > 0 ? (
                <Button
                  startIcon={<ErrorIcon color="error" />}
                  onClick={handleOpenErros}
                  variant="outlined"
                  sx={{
                    fontSize: "12px",
                    paddingTop: "15px",
                    paddingBottom: "15px",
                  }}
                >
                  Erros
                </Button>
              ) : (
                <Button
                  onClick={handleOpenErros}
                  variant="outlined"
                  sx={{
                    fontSize: "12px",
                    paddingTop: "15px",
                    paddingBottom: "15px",
                  }}
                >
                  Erros
                </Button>
              )}
            </Grid>
            <Grid item xs={6} sm={1}>
              <IconButton color="inherit" edge="start" onClick={handleOpenHelp}>
                <HelpIcon />
              </IconButton>
            </Grid>
          </Grid>
        </Toolbar>
        <br />
      </Paper>
      <br />
      <TableContainer component={Paper}>
        <Modal
          id="modalFile"
          open={openModalFile}
          onClose={handleCloseModalFile}
          aria-labelledby="modal-modal-title"
          aria-describedby="modal-modal-description"
        >
          {/* Corrigido para ter apenas um filho direto */}
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
          aria-labelledby="modal-modal-title"
          aria-describedby="modal-modal-description"
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
              <h5>Número de turmas com erros : {listaErros.length}</h5>
              {listaErros.map((erro) => {
                return (
                  <div key={erro.turma.idTurma}>
                    <p>Turma: {JSON.stringify(erro.turma)}</p>
                    <p>Erro: {erro.tipo}</p>
                    <br />
                  </div>
                );
              })}
            </Container>
          </DialogContent>
        </Dialog>

        <TblContainer
          sx={tableStyle}
          tableTitle="Lista de Turmas"
          numSelected={selected.length}
          deleteSelected={() => {
            setConfirmDialog({
              isOpen: true,
              title: "Deletar Turmas",
              subtitle:
                "Tem certeza que deseja deletar as turmas selecionadas? Você não pode desfazer esta operação.",
              onConfirm: () => {
                onDelete(selected);
              },
            });
          }}
          deleteAll={() => {
            setConfirmDialog({
              isOpen: true,
              title: "Deletar Turmas",
              subtitle:
                "Tem certeza que deseja deletar TODAS as turmas deste ano e semestre? Você não pode desfazer esta operação.",
              onConfirm: () => {
                deletarTurmasAnoSemestre();
              },
            });
          }}
        >
          <TblHead
            onSelectAllClick={handleSelectAllClick}
            numSelected={selected.length}
            rowCount={recordsAfterPagingAndSorting().length}
          />
          <TableBody>
            {recordsAfterPagingAndSorting().map((turma, index) => {
              const isItemSelected = isSelected(turma._id);
              const labelId = `turmas-table-checkbox-${index}`;
              return (
                <TableRow
                  key={turma._id}
                  sx={tableRowCss}
                  selected={isItemSelected}
                  aria-checked={isItemSelected}
                  role="checkbox"
                  onClick={(event) => handleClick(event, turma._id)}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      color="primary"
                      checked={isItemSelected}
                      inputProps={{
                        "aria-labelledby": labelId,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      sx={{ padding: "4px" }}
                      color="primary"
                      onClick={() => {
                        openInModalEdit(turma);
                      }}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                  <TableCell>{turma.idTurma}</TableCell>
                  <TableCell>{turma.nomeDisciplina}</TableCell>
                  <TableCell>{turma.turma}</TableCell>
                  <TableCell>{turma.totalTurma}</TableCell>
                  <TableCell>{turma.diaDaSemana}</TableCell>
                  <TableCell>{turma.horarioInicio}</TableCell>
                  <TableCell>{turma.horarioFim}</TableCell>
                  <TableCell>{turma.creditosAula}</TableCell>
                  <TableCell>{turma.departamentoOferta}</TableCell>
                  <TableCell>{turma.departamentoTurma}</TableCell>
                  <TableCell>{turma.campus}</TableCell>
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