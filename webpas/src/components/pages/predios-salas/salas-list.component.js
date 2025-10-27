import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SalasDataService from '../../../services/salas';
import PageHeader from "../../re-usable/page-header.component";
import Mensagem from "../../re-usable/mensagem.component";
import ConfirmDialog from "../../re-usable/confirmDialog.component";
import { TableContainer, Paper, TableBody, TableCell, TableRow, Toolbar, Grid, Button, TextField, Modal, Dialog, DialogContent, InputAdornment, Checkbox } from "@mui/material";
import useTable from "../../re-usable/useTable";
import { IconButton } from "@mui/material";
import HelpIcon from '@mui/icons-material/Help';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import handleServerResponses from "../../../services/response-handler";
import SalaForm from '../../forms/salaForm.component';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link as RouterLink } from 'react-router-dom';
import FileFormSalas from "../../forms/fileFormSala.component";

const headCells = [
    {id:'select', label:'Selecionar', disableSorting:true},
    {id:'actions', label:"Editar", disableSorting:true},
    {id:'numeroSala', label:'Sala'},
    {id:'capacidade', label:'Capacidade'},
    {id:'disponibilidade', label:'Disponibilidade'},
];

const tableRowCss = {
    '& .MuiTableCell-root': {
        padding: 1,
    }
};

const Salas = props => {
    let params = useParams();
    const { user, config, logout } = props;
    const [salas, setSalas] = useState([]);
    const [salaEdit, setSalaEdit] = useState(null);
    const [openModalForm, setOpenModalForm] = useState(false);
    const [openModalFile, setOpenModalFile] = useState(false);
    const [updatingS, setUpdatingS] = useState(false);
    const [filterFn, setFilterFn] = useState({ fn: items => { return items; } });
    const [notify, setNotify] = useState({ isOpen: false, message: '', type: '' });
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', subtitle: '' });
    const [selected, setSelected] = useState([]);

    useEffect(() => {
        getSalas(params.predio);
    }, [params.predio, notify]);

    const handleCloseModalForm = () => {
        setOpenModalForm(false);
        setSalaEdit(null);
    };

    const handleOpenModalFile = () => setOpenModalFile(true);
    const handleCloseModalFile = () => setOpenModalFile(false);

    const getSalas = predio => {
        SalasDataService.getSalas(predio)
            .then(response => {
                setSalas(response.data);
            }).catch(err => {
                console.error("Erro ao buscar salas:", err);
                if (err.response?.status === 401 || err.response?.data?.notAuth) {
                    logout();
                }
            });
    };

    const openInModalEdit = sala => {
        setUpdatingS(true);
        setSalaEdit(sala);
        setOpenModalForm(true);
    };

    const openInModalNew = () => {
        setUpdatingS(false);
        setSalaEdit(null);
        setOpenModalForm(true);
    };

    const handleSearch = e => {
        let target = e.target;
        setFilterFn({
            fn: items => {
                if (target.value === "") {
                    return items;
                } else {
                    return items.filter(sala => 
                        sala.numeroSala.toLowerCase().includes(target.value.toLowerCase())
                    );
                }
            }
        });
    };

    const handleSelectAllClick = (event) => {
        if (event.target.checked) {
            const newSelecteds = recordsAfterPagingAndSorting().map((sala) => sala._id);
            setSelected(newSelecteds);
            return;
        }
        setSelected([]);
    };
    
    const isSelected = (id) => selected.indexOf(id) !== -1;

    // LÓGICA DE SELEÇÃO COMPLETA
    const handleClick = (event, id) => {
        const selectedIndex = selected.indexOf(id);
        let newSelected = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, id);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1),
            );
        }
        setSelected(newSelected);
    };

    const addOrEdit = (updating, sala, predio, disponibilidade, resetForm) => {
        const data = { ...sala, disponibilidade: disponibilidade };
        const promise = updating 
            ? SalasDataService.updateSala(predio, sala._id, data)
            : SalasDataService.addSala(predio, data);
        
        promise
            .then(res => handleServerResponses('salas', res, setNotify))
            .catch(err => handleServerResponses('salas', err.response || err, setNotify));

        resetForm();
        setOpenModalForm(false);
        setSelected([]);
    };

    const onDelete = (salasIds) => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        SalasDataService.deleteSalas({ salasID: salasIds })
            .then(res => handleServerResponses('salas', res, setNotify))
            .catch(err => handleServerResponses('salas', err.response || err, setNotify));
        setSelected([]);
    };

    const fileHandleResponse = res => {
        handleCloseModalFile();
        handleServerResponses('salas', res, setNotify);
        getSalas(params.predio);
    };

    const {
        TblContainer,
        TblHead,
        TblPagination,
        recordsAfterPagingAndSorting
    } = useTable(salas, headCells, filterFn);

    return (
        <>
            <PageHeader 
                title={"Salas - " + params.predio}
                subtitle="Cadastro, edição e visualização de salas"
            />
            <Mensagem 
                notify={notify}
                setNotify={setNotify}
            />
            <ConfirmDialog
                confirmDialog={confirmDialog}
                setConfirmDialog={setConfirmDialog}
            />

            <Modal id='modalFile' open={openModalFile} onClose={handleCloseModalFile}>
                <FileFormSalas
                    title="Importar Salas da Planilha"
                    closeButton={handleCloseModalFile}
                    handleResponse={fileHandleResponse}
                />
            </Modal>

            <Dialog maxWidth="sm" open={openModalForm} onClose={handleCloseModalForm}>
                <DialogContent>
                    <SalaForm
                        config={config}
                        predio={params.predio}
                        addOrEdit={addOrEdit}
                        salaEdit={salaEdit}
                        updating={updatingS}
                        closeModalForm={handleCloseModalForm}
                    />
                </DialogContent>
            </Dialog>
            
            <TableContainer component={Paper}>
                <Toolbar>
                    <Grid container spacing={2} sx={{ paddingTop: '12px' }} alignItems="center" justifyContent="space-between">
                         <Grid item>
                            <Button 
                                startIcon={<ArrowBackIcon/>}
                                component={RouterLink}
                                to={"/predios"}
                                variant="contained"
                            >
                                Prédios
                            </Button>
                        </Grid>
                        <Grid item>
                            <Button 
                                startIcon={<AddIcon/>} 
                                variant="contained"  
                                onClick={handleOpenModalFile}
                            >
                                Importar Planilha
                            </Button>
                        </Grid>
                        <Grid item>
                            <Button 
                                startIcon={<AddIcon/>} 
                                variant="contained" 
                                onClick={openInModalNew}
                            >
                                Adicionar Manual
                            </Button>
                        </Grid>
                        <Grid item sm>
                            <TextField
                                fullWidth
                                variant="outlined"
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><SearchIcon/></InputAdornment>,
                                }}
                                onChange={handleSearch}
                            />
                        </Grid>
                        <Grid item>
                            <IconButton color="inherit">
                                <HelpIcon />
                            </IconButton>
                        </Grid>
                    </Grid>
                </Toolbar>
                <TblContainer
                    numSelected={selected.length}
                    deleteSelected={() => {
                        setConfirmDialog({
                            isOpen: true,
                            title: 'Deletar Salas',
                            subtitle: 'Tem certeza que deseja deletar as salas selecionadas? Esta operação não pode ser desfeita.',
                            onConfirm: () => { onDelete(selected) }
                        });
                    }}
                >
                    <TblHead 
                        onSelectAllClick={handleSelectAllClick}
                        numSelected={selected.length}
                        rowCount={recordsAfterPagingAndSorting().length}
                    />
                    <TableBody>
                        {recordsAfterPagingAndSorting().map((sala, index) => {
                            const isItemSelected = isSelected(sala._id);
                            
                            // LÓGICA DE CÁLCULO DE DISPONIBILIDADE COMPLETA
                            const totalDisp = (config.dias?.length || 0) * (config.periodos?.length || 0);
                            let dispCount = 0;
                            let disponibilidade = 'N/A';
                            
                            if (totalDisp > 0 && sala.disponibilidade) {
                                sala.disponibilidade.forEach(obj => {
                                    if (obj.disponivel) dispCount++;
                                });
                                const ratio = dispCount / totalDisp;
                                if (ratio < 0.33) {
                                    disponibilidade = 'Baixa';
                                } else if (ratio < 0.66) {
                                    disponibilidade = 'Média';
                                } else {
                                    disponibilidade = 'Alta';
                                }
                            }

                            return (
                                <TableRow key={sala._id} sx={tableRowCss} selected={isItemSelected} hover>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            color="primary"
                                            checked={isItemSelected}
                                            onClick={(event) => handleClick(event, sala._id)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <IconButton 
                                            size="small"
                                            color="primary"
                                            onClick={() => { openInModalEdit(sala) }}
                                        >
                                            <EditOutlinedIcon fontSize="small"/> 
                                        </IconButton>
                                    </TableCell>
                                    <TableCell>{sala.numeroSala}</TableCell>
                                    <TableCell>{sala.capacidade}</TableCell>
                                    <TableCell>{disponibilidade}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </TblContainer>
                <TblPagination/>
            </TableContainer>
        </>
    );
}

export default Salas;