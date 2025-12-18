import React, { useState, useEffect } from "react";
import PageHeader from "../../re-usable/page-header.component";
import CalculateIcon from '@mui/icons-material/Calculate';
import {
  Paper, Typography, Grid, Box, Alert, IconButton, Checkbox, CircularProgress,
  Dialog, DialogContent, Button, FormControl, FormLabel, FormControlLabel,
  TextField, FormGroup, Accordion, AccordionSummary, AccordionDetails, Divider
} from "@mui/material";
import Select from "../../forms/select.component";
import DistanciasDataService from '../../../services/distancias';
import TurmasDataService from '../../../services/turmas';
import SalasDataService from '../../../services/salas';
import ResultadosDataService from "../../../services/resultados";
import HelpIcon from '@mui/icons-material/Help';
import DoneIcon from '@mui/icons-material/Done';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import AjudaSolver from '../help/ajuda-solver.component';

const thisYear = new Date().getFullYear();

// Função para obter valores únicos de um array
const arrayUnique = array => [...new Set(array)];

// Função para limpar aspas, espaços e normalizar para minúsculas
const normalizarDept = (dept) => {
    if (!dept) return '';
    return String(dept).trim().replace(/^['"]|['"]$/g, '').toLowerCase();
};

const configTemp = {
    dias: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'],
    periodos: ['Manhã', 'Tarde', 'Noite']
}

const Solver = props => {
    const { config, user, logout } = props;

    const [ano, setAno] = useState(thisYear);
    const [anos, setAnos] = useState([]);
    const [semestre, setSemestre] = useState(1);
    const [temTodos, setTemTodos] = useState(true);

    const [selectAll, setSelectAll] = useState(false);
    const [openHelp, setOpenHelp] = useState(false);
    
    // --- VALORES PADRÃO (Conforme solicitado) ---
    const [delta, setDelta] = useState(0);       // Folga
    const [minAlunos, setMinAlunos] = useState(5); // Nro Min Alunos
    const [useAtx, setUseAtx] = useState(true);  // Prédio Auxiliar
    const [tmLim, setTmLim] = useState(60);      // Tempo Limite
    const [mipGap, setMipGap] = useState(0.1);   // MIP Gap

    const [erros, setErros] = useState({});
    const [working, setWorking] = useState(false);
    const [executado, setExecutado] = useState(false);
    const [resultObj, setResultObj] = useState({});
    
    const [dispCheckBoxList, setDispCheckBoxList] = useState(() => {
        let result = {}
        configTemp.dias.forEach(dia => {
            result[dia] = {}
            configTemp.periodos.forEach(periodo => {
                result[dia][periodo] = false
            })
        })
        return result
    })

    useEffect(() => {
        if (user) {
            retornaAnos();
            retornaDadosParaVerificacao();
        }
    }, [user])

    const retornaDadosParaVerificacao = () => {
        Promise.all([
            SalasDataService.getPredios(),
            TurmasDataService.getDepartamentos(),
            DistanciasDataService.getAll()
        ]).then(([prediosRes, turmasRes, distanciasRes]) => {
            const prediosData = prediosRes.data || [];
            const deptsTurmasData = turmasRes.data || [];
            const distanciasData = distanciasRes.data || [];

            const deptsTurmasNormalizados = arrayUnique(deptsTurmasData.map(d => normalizarDept(d)));
            const deptsDistanciasNormalizados = arrayUnique(distanciasData.map(d => normalizarDept(d.departamento)));
            const todosDepts = arrayUnique([...deptsTurmasNormalizados, ...deptsDistanciasNormalizados]).sort();

            const indexDist = {};
            distanciasData.forEach(cur => {
                const predioNormalizado = cur.predio.trim();
                const deptNormalizado = normalizarDept(cur.departamento);
                if (!indexDist[predioNormalizado]) indexDist[predioNormalizado] = {};
                indexDist[predioNormalizado][deptNormalizado] = cur.valorDist;
            });

            let todosPreenchidos = true;
            for (const predio of prediosData) {
                for (const depto of todosDepts) {
                    if (indexDist[predio.trim()]?.[depto] === undefined) {
                        todosPreenchidos = false;
                        break;
                    }
                }
                if (!todosPreenchidos) break;
            }
            setTemTodos(todosPreenchidos);
        }).catch(err => {
            console.error("Erro ao buscar dados para verificação:", err);
            setTemTodos(false);
        });
    };

    const handleCloseHelp = () => setOpenHelp(false);
    const handleOpenHelp = () => setOpenHelp(true);

    const retornaAnos = () => {
        const anoAtual = new Date().getFullYear()
        const firstYear = anoAtual - 4
        let anos = []
        for (let i = 0; i < 6; i++) {
            let anoA = firstYear + i;
            anos.push(anoA);
        }
        setAnos(anos)
    }

    const handleCheckBox = e => {
        const { name } = e.target
        let dia = name.slice(0, name.search("-"))
        let periodo = name.slice(name.search("-") + 1)
        let changeCB = !dispCheckBoxList[dia][periodo]
        setDispCheckBoxList(prevState => ({
            ...prevState,
            [dia]: {
                ...prevState[dia],
                [periodo]: changeCB
            }
        }));
        setSelectAll(false)
        setExecutado(false)
    }

    const handleUseAtx = e => { setUseAtx(!useAtx); };
    const handleMinAlunosChange = e => { setMinAlunos(e.target.value); };
    const handleTLChange = e => { setTmLim(e.target.value); };
    const handleMipGapChange = e => { setMipGap(e.target.value); };
    const handleDeltaChange = e => { setDelta(e.target.value); setExecutado(false); };
    const handleAnoSelect = e => { setAno(e.target.value); setExecutado(false); };
    const handleSemestreSelect = e => { setSemestre(e.target.value); setExecutado(false); };

    const handleSelectAll = e => {
        const newCheckedState = !selectAll;
        let result = {}
        config.dias.forEach(dia => {
            result[dia] = {}
            config.periodos.forEach(periodo => {
                result[dia][periodo] = newCheckedState
            })
        })
        setDispCheckBoxList(result)
        setSelectAll(newCheckedState)
        setExecutado(false)
    }

    const criarLista = () => {
        let lista = []
        config.dias.forEach(dia => {
            config.periodos.forEach(periodo => {
                if (dispCheckBoxList[dia][periodo]) {
                    lista.push({ dia: dia, periodo: periodo });
                }
            })
        })
        return lista
    }

    const validate = () => {
        let validated = true
        let tempErro = {}
        if (isNaN(delta) || delta === '') { validated = false; tempErro.delta = "Deve ser número"; }
        if (isNaN(minAlunos) || minAlunos === '') { validated = false; tempErro.minAlunos = "Deve ser número"; }
        if (isNaN(tmLim) || tmLim === '') { validated = false; tempErro.tmLim = "Deve ser número"; }
        if (isNaN(mipGap) || mipGap === '') { validated = false; tempErro.mipGap = "Deve ser número"; }
        setErros(tempErro)
        return validated
    }

    const handleExecute = () => {
        setExecutado(false);
        if (validate() && temTodos) {
            setErros({})
            setWorking(true)
            const lista = criarLista()

            let data = {
                ano: ano,
                semestre: semestre,
                delta: delta,
                lista: lista,
                predioAux: useAtx,
                minAlunos: minAlunos,
                tmLim: tmLim,
                mipGap: mipGap
            }

            console.log("Enviando para o solver:", data);

            ResultadosDataService.calculaLista(data)
                .then(res => {
                    setWorking(false)
                    setExecutado(true)
                    setResultObj(res.data)
                })
                .catch(err => {
                    console.error("Erro ao executar o solver:", err);
                    setWorking(false);
                })
        }
    }

    return (
        <>
            <PageHeader
                title="Resolver"
                subtitle="Execução do modelo de otimização"
                icon={<CalculateIcon />}
            />
            <Dialog open={openHelp} onClose={handleCloseHelp}>
                <DialogContent><AjudaSolver /></DialogContent>
            </Dialog>

            <Paper sx={{ p: 4, mb: 4, borderRadius: 2 }}>
                {!temTodos && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        Existem distâncias entre prédios e departamentos não informadas. A otimização só poderá ser executada com todas as distâncias cadastradas.
                    </Alert>
                )}

                {/* --- SEÇÃO 1: PERÍODO --- */}
                <Typography variant="h6" gutterBottom color="primary.main" fontWeight="500">
                    1. Período Letivo
                </Typography>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Select label="Ano" value={ano} onChange={handleAnoSelect} options={anos} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Select label="Semestre" value={semestre} onChange={handleSemestreSelect} options={[1, 2]} />
                    </Grid>
                    <Grid item xs={12} md={6} display="flex" justifyContent="flex-end" alignItems="center">
                        <Button startIcon={<HelpIcon />} onClick={handleOpenHelp} color="inherit">Ajuda</Button>
                    </Grid>
                </Grid>

                <Divider sx={{ mb: 4 }} />

                {/* --- SEÇÃO 2: SELEÇÃO DE DIAS E HORÁRIOS --- */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" color="primary.main" fontWeight="500">
                        2. Dias e Turnos para Alocação
                    </Typography>
                    <FormControlLabel 
                        control={<Checkbox checked={selectAll} onChange={handleSelectAll} color="primary" />} 
                        label={<Typography fontWeight="bold">Selecionar Todos</Typography>} 
                    />
                </Box>
                
                <Paper variant="outlined" sx={{ p: 2, mb: 4, bgcolor: '#fafafa' }}>
                    <Grid container spacing={1}>
                        <Grid item xs={3}></Grid> {/* Spacer para Labels */}
                        {config.periodos.map((periodo, index) => (
                            <Grid item xs={3} key={index} textAlign="center">
                                <Typography variant="subtitle2" fontWeight="bold" color="textSecondary">{periodo}</Typography>
                            </Grid>
                        ))}

                        {config.dias.map((dia, index) => (
                            <React.Fragment key={dia}>
                                <Grid item xs={3} display="flex" alignItems="center">
                                    <Typography variant="body2" fontWeight="500">{dia}</Typography>
                                </Grid>
                                {config.periodos.map((periodo) => (
                                    <Grid item xs={3} key={`${dia}-${periodo}`} textAlign="center" display="flex" justifyContent="center" alignItems="center">
                                        <Checkbox
                                            name={`${dia}-${periodo}`}
                                            onChange={handleCheckBox}
                                            checked={dispCheckBoxList[dia] ? dispCheckBoxList[dia][periodo] : false}
                                            size="small"
                                        />
                                        <Box width={24} height={24} ml={1} display="flex" alignItems="center" justifyContent="center">
                                            {working && dispCheckBoxList[dia]?.[periodo] ? (
                                                <CircularProgress size={16} />
                                            ) : (executado && dispCheckBoxList[dia]?.[periodo] ? (
                                                resultObj[dia]?.[periodo] ? <DoneIcon color="success" fontSize="small" /> : <CloseIcon color="error" fontSize="small" />
                                            ) : null)}
                                        </Box>
                                    </Grid>
                                ))}
                                <Grid item xs={12}><Divider light /></Grid>
                            </React.Fragment>
                        ))}
                    </Grid>
                </Paper>

                {/* --- SEÇÃO 3: CONFIGURAÇÕES AVANÇADAS (Accordion) --- */}
                <Accordion defaultExpanded={false} sx={{ mb: 4, border: '1px solid #e0e0e0', borderRadius: '4px !important', boxShadow: 'none' }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#f5f5f5' }}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <SettingsSuggestIcon color="action" />
                            <Typography variant="subtitle1" fontWeight="500">Configurações Avançadas do Solver</Typography>
                        </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={3} sx={{ mt: 1 }}>
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField 
                                    fullWidth 
                                    size="small"
                                    variant="outlined" 
                                    label="Folga (Delta)" 
                                    name="delta" 
                                    onChange={handleDeltaChange} 
                                    value={delta} 
                                    helperText={erros.delta}
                                    error={Boolean(erros.delta)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField 
                                    fullWidth 
                                    size="small"
                                    variant="outlined" 
                                    label="Mínimo de Alunos" 
                                    name="minAlunos" 
                                    onChange={handleMinAlunosChange} 
                                    value={minAlunos} 
                                    helperText={erros.minAlunos}
                                    error={Boolean(erros.minAlunos)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField 
                                    fullWidth 
                                    size="small"
                                    variant="outlined" 
                                    label="Tempo Limite (s)" 
                                    name="tmLim" 
                                    onChange={handleTLChange} 
                                    value={tmLim} 
                                    helperText={erros.tmLim}
                                    error={Boolean(erros.tmLim)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField 
                                    fullWidth 
                                    size="small"
                                    variant="outlined" 
                                    label="MIP Gap" 
                                    name="mipGap" 
                                    onChange={handleMipGapChange} 
                                    value={mipGap} 
                                    helperText={erros.mipGap}
                                    error={Boolean(erros.mipGap)}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControl component="fieldset">
                                    <FormLabel component="legend" sx={{ fontSize: '0.8rem' }}>Opções Extras</FormLabel>
                                    <FormGroup>
                                        <FormControlLabel 
                                            control={<Checkbox checked={useAtx} onChange={handleUseAtx} size="small" />} 
                                            label={<Typography variant="body2">Permitir uso de Prédio Auxiliar (se faltar sala)</Typography>} 
                                        />
                                    </FormGroup>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </AccordionDetails>
                </Accordion>

                {/* --- BOTÃO DE AÇÃO --- */}
                <Box display="flex" justifyContent="center">
                    <Button 
                        variant="contained" 
                        color="secondary"
                        size="large"
                        onClick={handleExecute} 
                        disabled={!temTodos || working}
                        sx={{ px: 6, py: 1.5, fontSize: '1rem', fontWeight: 'bold' }}
                        startIcon={working ? <CircularProgress size={20} color="inherit" /> : <CalculateIcon />}
                    >
                        {working ? 'Executando Otimização...' : 'Executar Alocação'}
                    </Button>
                </Box>

            </Paper>
        </>
    )
}

export default Solver;