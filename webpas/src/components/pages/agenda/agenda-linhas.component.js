import React, {Component, useEffect, useState} from "react";
import ResultadosDataService from '../../../services/resultados'
import { Grid, Box, TableContainer, Paper, Divider } from "@mui/material";
import { Typography } from "@mui/material";

const tableHeadCss = {
    fontWeight:'450',
    fontSize:'0.9rem',
    textAlign:"center"
}

const tableRowCss = {
    fontWeight:'400',
    fontSize:'0.8rem',
    textAlign:"center"
}


const AgendaLinhas = props =>{
    const {horariosInicio,state,filterFn,alocacoes} = props

    const [tableObj,setTableObj] = useState([]);

    useEffect(()=>{
        retornaTableObjs()
    },[alocacoes])

    const sortAlocacoes = array =>{
        let sortedArray = array.sort((a,b)=>{
            if (a.predio < b.predio){
                return -1
            } 
            if (a.predio > b.predio){
                return 1
            }
            return 0
        })
        return sortedArray
    }

    

    const retornaTableObjs = () =>{
        const unique = alocacoes.reduce((acc, cur) => {

            const search = acc.find(obj => obj.sala === cur.sala.numeroSala && obj.predio === cur.sala.predio)
            
            if (!search) {
            acc.push({ sala: cur.sala.numeroSala, predio: cur.sala.predio})
            }
            
            return acc
        }, [])
        
        const tableObjs = unique.map(obj=>{
            let result = {...obj}
            horariosInicio.map(horario=>{
                let alocacao = alocacoes.find(aloc=>(
                    aloc.sala.numeroSala == obj.sala &&
                    aloc.sala.predio == obj.predio &&
                    aloc.horario == horario
                ))
                if (alocacao){
                    result[horario] = alocacao.turma
                    result[horario].capacidade = alocacao.sala.capacidade
                }
            })
            return result
        })
        setTableObj(sortAlocacoes(tableObjs))
    }

    return (
        <>
        <Box>
            <Grid container spacing={1.5} justifyContent='space-around' alignItems="center" columns={22} padding={'20px 30px 0px 20px'}>
                <Grid item xs={2}><Typography sx={tableHeadCss} >Prédio</Typography></Grid>
                <Grid item xs={2}><Typography sx={tableHeadCss} >Sala</Typography></Grid>
                {
                    horariosInicio.map(horario=>{
                        return(
                            <>
                                <Grid item xs={3}><Typography sx={tableHeadCss} >{horario}</Typography></Grid>
                            </>
                        )
                    })
                } 
                 <Grid item xs={26}><Divider></Divider></Grid>
            </Grid>
        </Box>
        <TableContainer component={Paper} sx={{boxShadow:"0"}}>
            <Grid container  maxHeight={'550px'} justifyContent='space-around' spacing={1.5} alignItems="center" columns={22} padding={'10px 20px 10px 20px'}> 
               {
                    filterFn.fnAgenda(tableObj).map(obj=>{
                        return(
                            <>
                                <Grid item xs={2}><Typography sx={tableRowCss} >{obj.predio}</Typography></Grid>
                                <Grid item xs={2}><Typography sx={tableRowCss} >{obj.sala}</Typography></Grid>
                                {
                                    horariosInicio.map(horario=>{
                                        return(
                                            <>
                                                <Grid item xs={3}>
                                                    {
                                                        state.capacidade && obj[horario] ?(
                                                            <>
                                                                <Typography sx={tableRowCss}>
                                                                    {obj[horario].capacidade}
                                                                </Typography>
                                                            </>
                                                        ):(<></>)
                                                    }
                                                    {
                                                        state.nomeDisciplina && obj[horario] ?(
                                                            <>
                                                                <Typography sx={tableRowCss}>
                                                                    {obj[horario].nomeDisciplina}
                                                                </Typography>
                                                            </>
                                                        ):(<></>)
                                                    }
                                                    {
                                                        state.turma && obj[horario] ?(
                                                            <>
                                                                <Typography sx={tableRowCss}>
                                                                    {obj[horario].turma}
                                                                </Typography>
                                                            </>
                                                        ):(<></>)
                                                    }
                                                    {
                                                        state.idTurma && obj[horario] ?(
                                                            <>
                                                                <Typography sx={tableRowCss}>
                                                                    {obj[horario].idTurma}
                                                                </Typography>
                                                            </>
                                                        ):(<></>)
                                                    }
                                                    {
                                                        state.totalTurma && obj[horario] ?(
                                                            <>
                                                                <Typography sx={tableRowCss}>
                                                                    {obj[horario].totalTurma}
                                                                </Typography>
                                                            </>
                                                        ):(<></>)
                                                    }
                                                    {
                                                        state.codDisciplina && obj[horario] ?(
                                                            <>
                                                                <Typography sx={tableRowCss}>
                                                                    {obj[horario].codDisciplina}
                                                                </Typography>
                                                            </>
                                                        ):(<></>)
                                                    }
                                                    {
                                                        state.departamentoOferta && obj[horario] ?(
                                                            <>
                                                                <Typography sx={tableRowCss}>
                                                                    {obj[horario].departamentoOferta}
                                                                </Typography>
                                                            </>
                                                        ):(<></>)
                                                    }
                                                    {
                                                        state.departamentoTurma && obj[horario] ?(
                                                            <>
                                                                <Typography sx={tableRowCss}>
                                                                    {obj[horario].departamentoTurma}
                                                                </Typography>
                                                            </>
                                                        ):(<></>)
                                                    }
                                                    {
                                                        state.docentes && obj[horario] ?(
                                                            <>
                                                                <Typography sx={tableRowCss}>
                                                                    {obj[horario].docentes}
                                                                </Typography>
                                                            </>
                                                        ):(<></>)
                                                    }
                                                    {
                                                        state.creditosAula && obj[horario] ?(
                                                            <>
                                                                <Typography sx={tableRowCss}>
                                                                    {obj[horario].creditosAula}
                                                                </Typography>
                                                            </>
                                                        ):(<></>)
                                                    }

                                                    
                                                </Grid>
                                            </>
                                        )
                                    })
                                }
                                <Grid item xs={22}><Divider></Divider></Grid>
                            </>
                        )
                    })
               }
            </Grid>
        </TableContainer>
        
        </>
    )


}

export default AgendaLinhas