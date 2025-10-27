import React, {useState, useEffect} from "react";
import PageHeader from "../../re-usable/page-header.component";
import CalculateIcon from '@mui/icons-material/Calculate';
import { Paper, Typography, Grid, Box } from "@mui/material";
import Select from "../../forms/select.component";
import DistanciasDataService from '../../../services/distancias'
import TurmasDataService from '../../../services/turmas';
import SalasDataService from '../../../services/salas';
import { Alert } from "@mui/material";
import { IconButton } from "@mui/material";
import HelpIcon from '@mui/icons-material/Help';
import DoneIcon from '@mui/icons-material/Done';
import { Checkbox } from "@mui/material";
import { CircularProgress } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import { Dialog, DialogContent } from "@mui/material";
import AjudaSolver from '../help/ajuda-solver.component'
import ResultadosDataService from "../../../services/resultados"
import { Button, FormControl, FormLabel, FormControlLabel, TextField, FormGroup} from "@mui/material";

const thisYear = new Date().getFullYear()

// Função para obter valores únicos de um array
const arrayUnique = array => [...new Set(array)];

// Função para limpar aspas, espaços e normalizar para minúsculas
const normalizarDept = (dept) => {
    if (!dept) return '';
    return String(dept).trim().replace(/^['"]|['"]$/g, '').toLowerCase();
};

const configTemp = {
    dias: ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'],
    periodos: ['Manhã','Tarde','Noite']
}

const Solver = props =>{
    const {config,user,logout} = props

    const [ano,setAno] = useState(thisYear);
    const [anos,setAnos] = useState([]);
    const [semestre,setSemestre] = useState(1);
    
    // CORREÇÃO: O estado 'temTodos' agora é controlado pela verificação local
    const [temTodos,setTemTodos] = useState(true); // Começa como true e é verificado

    const [selectAll,setSelectAll] = useState(false);
    const [openHelp, setOpenHelp] = useState(false);
    const [delta,setDelta] = useState(0);
    const [minAlunos,setMinAlunos] = useState(1);
    const [useAtx,setUseAtx] = useState(true);
    const [tmLim,setTmLim] = useState(0);
    const [mipGap,setMipGap] = useState(0);
    const [erros,setErros] = useState({});
    const [working,setWorking] = useState(false);
    const [executado,setExecutado] = useState(false);
    const [resultObj,setResultObj] = useState({});
    const [dispCheckBoxList,setDispCheckBoxList] = useState(()=>{
        let result = {}
        configTemp.dias.forEach(dia=>{
            result[dia] = {}
            configTemp.periodos.forEach(periodo=>{
                result[dia][periodo] = false
            })
        })
        return result
    })

    useEffect(()=>{
        if (user) {
            retornaAnos();
            // Inicia a cadeia de busca de dados para a verificação
            retornaDadosParaVerificacao();
        }
    }, [user])

    // --- LÓGICA DE VERIFICAÇÃO LOCAL (A MESMA DE DistanciasMatriz) ---
    const retornaDadosParaVerificacao = () => {
        // Busca todas as 3 fontes de dados em paralelo para eficiência
        Promise.all([
            SalasDataService.getPredios(),
            TurmasDataService.getDepartamentos(),
            DistanciasDataService.getAll()
        ]).then(([prediosRes, turmasRes, distanciasRes]) => {
            const prediosData = prediosRes.data || [];
            const deptsTurmasData = turmasRes.data || [];
            const distanciasData = distanciasRes.data || [];

            // Normaliza os departamentos de ambas as fontes
            const deptsTurmasNormalizados = arrayUnique(deptsTurmasData.map(d => normalizarDept(d)));
            const deptsDistanciasNormalizados = arrayUnique(distanciasData.map(d => normalizarDept(d.departamento)));

            // Une e ordena a lista final de todos os departamentos únicos
            const todosDepts = arrayUnique([...deptsTurmasNormalizados, ...deptsDistanciasNormalizados]).sort();
            
            // Cria um índice/mapa de distâncias existentes para busca rápida
            const indexDist = {};
            distanciasData.forEach(cur => {
                const predioNormalizado = cur.predio.trim();
                const deptNormalizado = normalizarDept(cur.departamento);
                if (!indexDist[predioNormalizado]) indexDist[predioNormalizado] = {};
                indexDist[predioNormalizado][deptNormalizado] = cur.valorDist;
            });
            
            // Verifica se cada par (predio, departamento) necessário existe no índice
            let todosPreenchidos = true;
            for (const predio of prediosData) {
                for (const depto of todosDepts) {
                    if (indexDist[predio.trim()]?.[depto] === undefined) {
                        todosPreenchidos = false;
                        break; // Para o loop interno se encontrar um faltando
                    }
                }
                if (!todosPreenchidos) break; // Para o loop externo também
            }
            
            setTemTodos(todosPreenchidos);

        }).catch(err => {
            console.error("Erro ao buscar dados para verificação:", err);
            setTemTodos(false); // Assume que há erro se não conseguir buscar os dados
        });
    };
    
    // --- Funções do formulário ---

    const handleCloseHelp = () => setOpenHelp(false);
    const handleOpenHelp = () => setOpenHelp(true);

    const retornaAnos = () =>{
        const anoAtual = new Date().getFullYear()
        const firstYear = anoAtual - 4
        let anos = []
        for(let i=0;i<6;i++){
            let anoA = firstYear + i
            anos.push(anoA)
        }
        setAnos(anos)
    }

    const handleCheckBox = e =>{
        const {name} = e.target
        let dia = name.slice(0,name.search("-"))
        let periodo = name.slice(name.search("-")+1)
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

    const handleUseAtx = e =>{ setUseAtx(!useAtx); };
    const handleMinAlunosChange = e =>{ setMinAlunos(e.target.value); };
    const handleTLChange = e => { setTmLim(e.target.value); };
    const handleMipGapChange = e =>{ setMipGap(e.target.value); };

    const handleSelectAll = e =>{
        const newCheckedState = !selectAll;
        let result = {}
        config.dias.forEach(dia=>{
            result[dia] = {}
            config.periodos.forEach(periodo=>{
                result[dia][periodo] = newCheckedState
            })
        })
        setDispCheckBoxList(result)
        setSelectAll(newCheckedState)
        setExecutado(false)
    }

    const criarLista = () =>{
        let lista = []
        config.dias.forEach(dia=>{
            config.periodos.forEach(periodo=>{
                if (dispCheckBoxList[dia][periodo]){
                    lista.push({ dia: dia, periodo: periodo });
                }
            })
        })
        return lista
    }
 
    const handleAnoSelect = e =>{ setAno(e.target.value); setExecutado(false); };
    const handleDeltaChange = e =>{ setDelta(e.target.value); setExecutado(false); };
    const handleSemestreSelect = e =>{ setSemestre(e.target.value); setExecutado(false); };

    const validate = () =>{
        let validated = true
        let tempErro = {} // Começa com objeto limpo
        if (isNaN(delta) || delta === '') {
            validated = false
            tempErro.delta = "Deve ser um número";
        }
        if (isNaN(minAlunos) || minAlunos === '') {
            validated = false
            tempErro.minAlunos = "Deve ser um número";
        }
        if (isNaN(tmLim) || tmLim === '') {
            validated = false
            tempErro.tmLim = "Deve ser um número";
        }
        if (isNaN(mipGap) || mipGap === '') {
            validated = false
            tempErro.mipGap = "Deve ser um número";
        }
        setErros(tempErro)
        return validated
    }

    const handleExecute = () =>{
        setExecutado(false);
        if(validate() && temTodos){
            setErros({})
            setWorking(true)
            const lista = criarLista()

            // CORREÇÃO: Adicionados 'tmLim' e 'mipGap' ao objeto de dados
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

            console.log("Enviando para o solver:", data); // Log para depuração

            ResultadosDataService.calculaLista(data)
                .then(res=>{
                    setWorking(false)
                    setExecutado(true)
                    setResultObj(res.data)
                    console.log("Resultado recebido do solver:", res.data); // Log corrigido
                })
                .catch(err=>{
                    console.error("Erro ao executar o solver:", err); // Log de erro
                    setWorking(false);
                })
        } else {
            // Adicionado log para saber por que não executou
            console.log("Execução bloqueada. Validação:", validate(), "Tem Todos:", temTodos);
        }
    }

    return (
        <>
        <PageHeader
            title="Resolver"
            subtitle="Execução do modelo de otimização"
            icon={<CalculateIcon/>}
        />
        <Dialog open={openHelp} onClose={handleCloseHelp}>
            <DialogContent><AjudaSolver/></DialogContent>
        </Dialog>
        <Paper>
            <Box padding={'30px'}>
                {!temTodos && (
                    <Alert severity="error" sx={{marginY:'10px'}}>
                        Existem distâncias entre prédios e departamentos 
                        não informadas. A otimização só poderá ser executada com todas as distâncias cadastradas.
                    </Alert>
                )}
                <Grid container alignItems="center" columns={20} spacing={2}>
                    {/* Seções do formulário (sem alterações lógicas, apenas formatação) */}
                    <Grid item xs={20}><Typography fontSize={'1.1rem'} fontWeight={'405'}> Escolher Ano e Semestre</Typography></Grid>
                    <Grid item xs={3}><Select label="Ano" value={ano} onChange={handleAnoSelect} options={anos}/> </Grid>
                    <Grid item xs={3} ><Select label="Semestre" value={semestre} onChange={handleSemestreSelect} options ={[1,2]}/></Grid>
                    <Grid item xs={13}></Grid>
                    <Grid item xs={1}><IconButton color="inherit" edge="start" onClick={handleOpenHelp}><HelpIcon /></IconButton></Grid>
                    
                    <Grid item xs={20} mt={2}><Typography fontSize={'1.1rem'} fontWeight={'405'}> Escolher dias e períodos</Typography></Grid>
                    <Grid item xs={20}></Grid>
                    <Grid item xs ={4}></Grid>
                    {config.periodos.map((periodo,index)=>(<Grid item xs={4} key={index}><Typography fontWeight={450}>{periodo}</Typography></Grid>))}
                    
                    {config.dias.map((dia,index)=>(
                        <Grid item xs ={20} key={index}>
                            <FormControl  sx={{width:'100%'}}>
                            <Grid container columnSpacing={3} alignItems="center"  justifyContent="flex-start">
                                <Grid item xs={4}><FormLabel fontWeight={450}>{dia}</FormLabel></Grid>
                                {config.periodos.map((periodo)=>(
                                    <React.Fragment key={`${dia}-${periodo}`}>
                                        <Grid item xs={1} alignContent="center"> 
                                            <Checkbox name={`${dia}-${periodo}`} onChange={handleCheckBox} checked={dispCheckBoxList[dia] ? dispCheckBoxList[dia][periodo] : false} /> 
                                        </Grid>
                                        <Grid item xs={1}>
                                            {working && dispCheckBoxList[dia]?.[periodo] ?(<CircularProgress size={16}/>
                                            ): ( executado && dispCheckBoxList[dia]?.[periodo] ? (
                                                    resultObj[dia]?.[periodo] ? <DoneIcon color="success"/> : <CloseIcon color="error" />
                                                ) : <></>
                                            )}
                                        </Grid>
                                        <Grid item xs={2}></Grid>
                                    </React.Fragment>
                                ))}
                            </Grid>
                            </FormControl>
                        </Grid>
                    ))}
                    
                    <Grid item xs={20}><FormControlLabel control={<Checkbox checked={selectAll} onChange={handleSelectAll}/>} label="Selecionar Todos" /></Grid>
                    
                    <Grid item xs={20} mt={2}><Typography fontSize={'1.1rem'} fontWeight={'405'}> Escolher folga e número de alunos mínimo</Typography></Grid>
                    <Grid item xs={20}></Grid>
                    <Grid item xs={3}>
                        <TextField fullWidth variant="outlined" label="Folga*" name="delta" onChange={handleDeltaChange} value={delta} {...(erros.delta && { error:true, helperText:erros.delta })}/>
                    </Grid>
                    <Grid item xs={3}>
                        <TextField fullWidth variant="outlined" label="Nro mínimo de alunos*" name="minAlunos" onChange={handleMinAlunosChange} value={minAlunos} {...(erros.minAlunos && { error:true, helperText:erros.minAlunos })} />
                    </Grid>
                    
                    <Grid item xs={20} mt={2}><Typography fontSize={'1.1rem'} fontWeight={'405'}> Prédio auxiliar</Typography></Grid>
                    <Grid item xs={20}><FormGroup><FormControlLabel control={<Checkbox checked={useAtx} onChange={handleUseAtx} />} label="Usar prédio auxiliar" /></FormGroup></Grid>

                    <Grid item xs={20} mt={2}><Typography fontSize={'1.1rem'} fontWeight={'405'}> Opções do solver</Typography></Grid>
                    <Grid item xs={20}></Grid>
                    <Grid item xs={3}>
                        <TextField fullWidth variant="outlined" label="Tempo máximo de execução (s)" name="tmLim" onChange={handleTLChange} value={tmLim} {...(erros.tmLim && { error:true, helperText:erros.tmLim })} />
                    </Grid>
                    <Grid item xs={3}>
                        <TextField fullWidth variant="outlined" label="MIP gap" name="mipGap" onChange={handleMipGapChange} value={mipGap} {...(erros.mipGap && { error:true, helperText:erros.mipGap })} />
                    </Grid>

                    <Grid item xs={20} mt={3}>
                        <Button variant="contained" onClick={handleExecute} disabled={!temTodos || working}> 
                            {working ? 'Executando...' : 'Executar'}
                        </Button>
                    </Grid>
                </Grid>
            </Box>
        </Paper>
        </>
    )
}

export default Solver;
