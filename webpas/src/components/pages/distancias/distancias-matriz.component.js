import React from "react";
import DistanciaForm from '../../forms/distanciaForm.component'
import PageHeader from '../../re-usable/page-header.component';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import { Modal, TableBody, TableCell, TableRow, Grid, Toolbar, TextField, DialogContent, Dialog, Button, IconButton } from "@mui/material";
import HelpIcon from '@mui/icons-material/Help';
import useTable from "../../re-usable/useTable";
import DistanciasDataService from '../../../services/distancias'
import TurmasDataService from '../../../services/turmas';
import SalasDataService from '../../../services/salas';
import { useEffect, useState } from 'react';
import { TableContainer, Paper } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import Mensagem from "../../re-usable/mensagem.component";
import ConfirmDialog from "../../re-usable/confirmDialog.component";
import handleServerResponses from "../../../services/response-handler";
import { Checkbox } from "@mui/material";
import FileFormDistancias from "../../forms/fileFormDistancia.component";
import { Alert } from "@mui/material";

const tableRowCss ={
    '& .MuiTableCell-root':{
        padding:1,
    }
}

const tableStyle ={
    '& thead th span':{
        fontWeight: '600',
        fontSize:'0.7rem',
    },
    '& tbody td': {
        fontSize:'0.7rem',
    }
}

const headCells =[
    {id:'actions',label:"Ações", disableSorting:true},
    {id:'predio', label:'Prédio'},
    {id:'departamento', label:'Departamento'},
    {id:'distancia', label:'Distância'},
    {id:'status', label:'Status'},
]

// Função para obter valores únicos de um array
const arrayUnique = array => [...new Set(array)];

// Função para limpar aspas, espaços e normalizar para minúsculas
const normalizarDept = (dept) => {
    if (!dept) return ''; // Retorna string vazia se a entrada for nula/indefinida
    return String(dept).trim().replace(/^['"]|['"]$/g, '').toLowerCase();
};


const DistanciasMatriz = props =>{
    const {user,logout,config} = props

    const [distancias,setDistancias] = useState([]);
    const [predios,setPredios] = useState([]);
    const [departamentosTurmas, setDepartamentosTurmas] = useState([]); // Armazena depts JÁ NORMALIZADOS das turmas
    const [departamentos,setDepartamentos] = useState([]); // Lista final, unida, normalizada e única de todos os depts
    const [temTodos,setTemTodos] = useState(true);
    const [indiceDistancias,setIndiceDistancias] = useState({});
    const [distanciaTableObjs,setDistanciaTableObjs] = useState([]);
    const [openModalForm, setOpenModalForm] = React.useState(false);
    const [openModalFile, setOpenModalFile] = React.useState(false);
    const [distanciaEdit,setDistanciaEdit] = useState(null)
    const [updatingD,setUpdatingD] = useState(false)
    const [filterFn,setFilterFn] = useState({fn:items=>{return items;}})
    const [notify,setNotify] = useState({isOpen:false,message:'',type:''})
    const [confirmDialog,setConfirmDialog] = useState({isOpen:false,title:'',subtitle:''})
    const [selected, setSelected] = React.useState([]);

    const handleCloseModalForm = () => {
        setOpenModalForm(false)
        setSelected([])
    };
    const handleOpenModalFile = () => setOpenModalFile(true);
    const handleCloseModalFile = () => setOpenModalFile(false);

    useEffect(() => {
        if (user) {
            retornaPredios();
            retornaDistancias();
            retornaDepartamentosTurmas();
        }
    }, [notify, user]);

    // --- USEEFFECT PARA UNIÃO: Roda quando depts de turmas OU distâncias mudam ---
    useEffect(() => {
        // Normaliza os departamentos vindos das distâncias
        const deptsDistanciasNormalizados = arrayUnique(distancias.map(d => normalizarDept(d.departamento)));
        
        // A lista 'departamentosTurmas' já está normalizada. Agora unimos as duas listas limpas.
        const todosDepts = arrayUnique([...departamentosTurmas, ...deptsDistanciasNormalizados]);
        
        setDepartamentos(todosDepts.sort()); // Ordena para consistência na exibição
    }, [departamentosTurmas, distancias]);

    useEffect(() => {
        if (distancias.length > 0) {
            retornaIndiceDistancias();
        }
        // A verificação de 'temTodos' deve ser feita após a tabela ser montada
    }, [distancias]);

    useEffect(() => {
        if (Object.keys(indiceDistancias).length > 0 && predios.length > 0 && departamentos.length > 0) {
            retornaDistanciasTableObjs();
        }
    }, [indiceDistancias, predios, departamentos]);
    
    // Verifica se todas as distâncias estão preenchidas após a tabela ser gerada
    useEffect(() => {
        if(distanciaTableObjs.length > 0){
            const estaoTodosPreenchidos = distanciaTableObjs.every(item => item.status === "OK");
            setTemTodos(estaoTodosPreenchidos);
        }
    }, [distanciaTableObjs]);


    // --- FUNÇÕES DE BUSCA CORRIGIDAS ---

    // Busca depts das turmas e JÁ NORMALIZA
    const retornaDepartamentosTurmas = () => {
        TurmasDataService.getDepartamentos()
            .then(response => {
                const depts = response.data || [];
                // CORREÇÃO: Normaliza os dados assim que eles chegam do backend
                const deptsNormalizados = depts.map(d => normalizarDept(d));
                setDepartamentosTurmas(arrayUnique(deptsNormalizados));
            })
            .catch(err => {
                console.error('Erro ao buscar depts das turmas:', err);
                setDepartamentosTurmas([]);
                const errorResponse = err.response || { data: { msg: "Erro ao buscar depts das turmas." } };
                handleServerResponses('turmas', errorResponse, setNotify);
            });
    };

    const retornaDistancias = () => {
        DistanciasDataService.getAll()
            .then(response => { 
                setDistancias(response.data || []) 
            })
            .catch(err => {
                console.error('Erro ao buscar distâncias:', err);
                const errorResponse = err.response || { data: { msg: "Erro de conexão ao buscar distâncias." } };
                handleServerResponses('distancias', errorResponse, setNotify);
            });
    };

    const retornaPredios = () => {
        SalasDataService.getPredios()
            .then(response => { 
                setPredios(response.data || []) 
            })
            .catch(err => {
                if (err.response?.data?.notAuth) {
                    logout();
                } else {
                    const errorResponse = err.response || { data: { msg: "Erro de conexão ao buscar prédios." } };
                    handleServerResponses('salas', errorResponse, setNotify);
                }
            });
    };

    const retornaIndiceDistancias = () =>{
        const indexDist = {};
        distancias.forEach(cur => {
            const predioNormalizado = cur.predio.trim(); // Limpa espaços do prédio também
            const deptNormalizado = normalizarDept(cur.departamento); // Normaliza o depto para usar como chave
            if (!indexDist[predioNormalizado]) indexDist[predioNormalizado] = {};
            indexDist[predioNormalizado][deptNormalizado] = {
                distancia: cur.valorDist,
                _id: cur._id,
            };
        });
        setIndiceDistancias(indexDist)
    }

    const retornaDistanciasTableObjs = () =>{
        let distTableObjArray = []
        predios.forEach((predio) => {
            // A lista 'departamentos' já está limpa, normalizada e única
            departamentos.forEach((departamentoNormalizado) => {
                const entry = indiceDistancias[predio.trim()]?.[departamentoNormalizado];
                const strId = `id_${predio}_${departamentoNormalizado}`;
                
                distTableObjArray.push({
                    _id: entry?._id || strId,
                    predio: predio,
                    departamento: departamentoNormalizado.toUpperCase(), // Exibe em maiúsculas para ficar mais legível
                    valorDist: entry?.distancia ?? "-", // Usa ?? para tratar valor 0 corretamente
                    status: entry !== undefined ? "OK" : "Não Informado"
                });
            });
        });
        setDistanciaTableObjs(distTableObjArray)
    }

    const retornaTemTodos = () =>{
        // Esta função agora é controlada pelo useEffect que verifica a tabela montada
        // A chamada à API pode ser mantida se o backend tiver uma lógica mais complexa
        DistanciasDataService.temTodos()
            .then(res => {
                // A verificação local é mais confiável neste caso, mas podemos manter a do backend se preferir
                // setTemTodos(res.data.isComplete)
            }).catch(err => console.error('Erro em temTodos:', err))
    }

    const handleSearch = e =>{
        let target = e.target
        setFilterFn({
            fn: items =>{
                if(target.value === ""){
                    return items
                }else{
                    return items.filter(distancia => {
                        return (
                            distancia.predio
                                .toLowerCase()
                                .includes(target.value.toLowerCase())
                            || distancia.departamento
                                .toLowerCase()
                                .includes(target.value.toLowerCase()) 
                            || distancia.status
                                .toLowerCase()
                                .includes(target.value.toLowerCase()) 
                        )
                    }) 
                }
            }
        })
    }
    
    const handleSelectAllClick = (event) => {
        if (event.target.checked) {
          const newSelecteds = recordsAfterPagingAndSorting().map((distancia) => distancia._id);
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
            selected.slice(selectedIndex + 1),
          );
        }
        setSelected(newSelected);
    };

    const fileHandleResponse = res =>{
        setOpenModalFile(false)
        handleServerResponses('distancias',res,setNotify)
        retornaDistancias()
    }
    
    const addOrEdit = (updating,distancia,resetForm) =>{
        let data= {...distancia}
        if (updating){
            DistanciasDataService.updateDistancia(distancia._id,data)
                .then(res =>handleServerResponses('distancias',res,setNotify))
                .catch(err=>handleServerResponses('distancias',err,setNotify))
        }else{
            DistanciasDataService.addDistancia(data)
                .then(res =>handleServerResponses('distancias',res,setNotify))
                .catch(err=>handleServerResponses('distancias',err,setNotify))
        }
        setSelected([]);
        resetForm()
        setOpenModalForm(false)
        retornaDistancias()
    }

    const onDelete =(distancias)=>{
        setConfirmDialog({
            ...confirmDialog,
            isOpen:false
        })
        let data={distanciasID:distancias}
        DistanciasDataService.deleteDistancias(data)
            .then(res =>handleServerResponses('distancias',res,setNotify))
            .catch(err=>handleServerResponses('distancias',err,setNotify))
        retornaDistancias()
        setSelected([]);
    }

    const{
        TblContainer,
        TblHead,
        TblPagination,
        recordsAfterPagingAndSorting
    }=useTable(distanciaTableObjs,headCells,filterFn)

    const openInModalEdit = distancia =>{
        setUpdatingD(true)
        setDistanciaEdit(distancia)
        setOpenModalForm(true)
    }

    const openInModalNew = () =>{
        setUpdatingD(false)
        setDistanciaEdit(null)
        setOpenModalForm(true)
    }
    
    const forceReload = () => {
        retornaPredios();
        retornaDistancias();
        retornaDepartamentosTurmas();
    };

    return(
        <>
            <PageHeader 
                title="Distâncias"
                subtitle="Cadastro, edição e visualização de distâncias"
                icon={<DirectionsWalkIcon />}
            />
            
            <Mensagem 
                notify={notify}
                setNotify={setNotify}
            />
            <ConfirmDialog
                confirmDialog={confirmDialog}
                setConfirmDialog={setConfirmDialog}
            />
            <TableContainer component={Paper}>
                <Modal
                    id='modalFile'
                    open={openModalFile}
                    onClose={handleCloseModalFile}
                >
                    <FileFormDistancias
                        title={'Adicionar arquivo'}
                        closeButton={handleCloseModalFile}
                        handleResponse={fileHandleResponse}
                    />
                </Modal>
                <Dialog maxWidth="md"
                    id='modalForm'
                    scroll='body'
                    open={openModalForm}
                    onClose={handleCloseModalForm}
                ><DialogContent >
                        <DistanciaForm
                            addOrEdit ={addOrEdit}
                            predios = {predios}
                            departamentos = {departamentos}
                            tableObjs = {distanciaTableObjs}
                            updating = {updatingD}
                            distanciaEdit = {distanciaEdit}
                            closeModalForm ={handleCloseModalForm}
                        />
                </DialogContent>
                </Dialog>
                <Toolbar>
                
                <Grid container 
                    spacing={2} 
                    sx={{paddingTop:'12px'}} 
                    alignItems="center" 
                    justifyContent="space-between"
                    columns={20}
                > 
                    <Grid item xs ={5} sx={{fontSize:'14px',fontWeight:'500',color:"#666"}}>Adicionar</Grid>
                    <Grid item xs ={9} sx={{fontSize:'14px',fontWeight:'500',color:"#666"}}>Buscar</Grid>
                    <Grid item xs ={4} sx={{fontSize:'14px',fontWeight:'500',color:"#666"}}>Mostrar</Grid>
                    <Grid item xs ={1} sx={{fontSize:'14px',fontWeight:'500',color:"#666"}}>Ajuda</Grid>
                    <Grid item xs={6} sx={{fontSize:'14px',fontWeight:'500',color:"#666"}} sm={2}>
                        <Button 
                            startIcon={<AddIcon/>} 
                            variant="contained"  
                            onClick ={handleOpenModalFile}
                            sx={{fontSize:'12px',paddingTop:'12px',paddingBottom:'12px'}} >Arquivo
                        </Button>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Button 
                            startIcon={<AddIcon/>} 
                            variant="contained" 
                            onClick={openInModalNew}
                            sx={{fontSize:'12px',paddingTop:'12px',paddingBottom:'12px'}}>Formulário
                        </Button>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Button 
                            variant="outlined" 
                            onClick={forceReload}
                            sx={{fontSize:'12px',paddingTop:'12px',paddingBottom:'12px'}}>Debug: Reload Dados
                        </Button>
                    </Grid>
                    <Grid item xs ={6} sm={6}>
                        <TextField
                            sx={{width:'100%'}}
                            variant="outlined"
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon/></InputAdornment>,
                            }}
                            onChange={handleSearch}
                        />
                    </Grid>
                    <Grid item xs={6} sm={2}>
                    </Grid>
                    <Grid item xs={6} sm={2}>
                    </Grid>
                    <Grid item xs={6} sm={1}>
                        <IconButton
                            color="inherit"
                            edge="start"
                        >
                            <HelpIcon />
                        </IconButton>
                    </Grid>
                </Grid>
                </Toolbar>{temTodos ?(
                    <></>
                ):(
                    <Alert severity="error" sx={{marginTop:'10px'}}>Existem distâncias entre prédios e departamentos 
                    não informadas. A otimização só podera ser executada com todas as distâncias cadastradas.</Alert>
                )}
                <TblContainer 
                    sx={tableStyle} 
                    tableTitle="Lista de distâncias"
                    numSelected={selected.length}
                    deleteSelected={()=>{
                        setConfirmDialog({
                            isOpen:true,
                            title:'Deletar Distâncias',
                            subtitle:'Tem certeza que deseja deletar? Você não pode desfazer esta operação.',
                            onConfirm: () =>{onDelete(selected)}
                        })
                    }}
                >
                    <TblHead
                        onSelectAllClick={handleSelectAllClick}
                        numSelected={selected.length}
                        rowCount={recordsAfterPagingAndSorting().length}
                    />
                    <TableBody>
                        {recordsAfterPagingAndSorting().map((distancia,index)=>{
                            const isItemSelected = isSelected(distancia._id);
                            const labelId = `distancias-table-checkbox-${index}`;
                            return(
                                <TableRow 
                                    key={distancia._id} 
                                    sx ={tableRowCss}
                                    selected={isItemSelected}
                                    aria-checked={isItemSelected}
                                    role="checkbox"
                                    onClick={(event) => handleClick(event, distancia._id)}
                                >
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            color="primary"
                                            checked={isItemSelected}
                                            inputProps={{
                                                'aria-labelledby': labelId,
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <IconButton 
                                            sx={{padding:'4px'}} 
                                            color="primary"
                                            onClick={(e)=>{ e.stopPropagation(); openInModalEdit(distancia)}} // Adicionado stopPropagation
                                        >
                                            <EditOutlinedIcon fontSize="small"/> 
                                        </IconButton>
                                    </TableCell>
                                    <TableCell>{distancia.predio}</TableCell>
                                    <TableCell>{distancia.departamento}</TableCell>
                                    <TableCell>{distancia.valorDist}</TableCell>
                                    <TableCell>{distancia.status}</TableCell>

                                </TableRow>
                            )
                        })}
                    </TableBody>
                </TblContainer>
                <TblPagination/>
            </ TableContainer>


        </>
    )
}

export default DistanciasMatriz;