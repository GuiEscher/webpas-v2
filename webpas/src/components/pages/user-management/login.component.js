import React,{useState,useEffect} from "react";
import UserDataService from '../../../services/user'
import { Box } from "@mui/system";
import useForm from "../../forms/useForm";
import { Container, Typography } from "@mui/material";
import {TextField} from "@mui/material";
import {Button, Grid, Paper, Link} from "@mui/material";
import { Link as RouterLink,Navigate,useSearchParams } from 'react-router-dom';
import useAuth from "../../../services/useAuth";
import { useNavigate } from "react-router-dom";

const inicialValues ={
    email:'',
    password:'', 
}

const Login = props =>{
    const {user} = useAuth(false)

    let [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate()
    const [error,setError] = useState("");
    
    useEffect(()=>{
        if(user){
            navigate('/')
        }
    },[user])
    
    const{
        values,
        setValues,
        handleInputChange,
        erros,
        setErros,
        resetForm,
    }=useForm(inicialValues)

    const handleSubmit = e =>{
        e.preventDefault()
        const data = {...values}

        // Credenciais do usuário de teste
        const testUserEmail = 'teste';
        const testUserPassword = '123456';

        // Objeto de usuário de teste com um token simulado
        const testUserToken = {
            _id: '123456789',
            name: 'Usuário de Teste',
            email: testUserEmail
            // Adicione outras propriedades que seu token de usuário possa ter
        };

        // Verifica se as credenciais correspondem ao usuário de teste
        if (data.email === testUserEmail && data.password === testUserPassword) {
            // Se as credenciais estiverem corretas, simula o login
            // e armazena o token de usuário no cookie, igual ao fluxo da API.
            document.cookie = `user=${JSON.stringify(testUserToken)};max-age=${1000 * 60 * 24 * 30 *60}`
            let callbackUrl = searchParams.get("callbackUrl")
            window.location.href = callbackUrl || "/"
            return; // Interrompe a execução
        }

        UserDataService.login(data)
            .then(res=>{
                document.cookie = `user=${JSON.stringify(res.data.userToken)};max-age=${1000 * 60 * 24 * 30 *60}`
                let callbackUrl = searchParams.get("callbackUrl")
                window.location.href = callbackUrl || "/"
            })
            .catch(err=>{
                let serverResponse = err.response.data
                console.log(serverResponse)
                setError(serverResponse.error)
            })
    }

    const resetLogin = () =>{
        resetForm()
        setError("")
    }

    return(
        <>
            <Box component="form" onSubmit={handleSubmit}>
                <Container>
                <Paper>
                    <Grid container spacing={2} alignItems="center" padding="50px">
                        <Grid item xs={6}>
                            <Typography variant="h5">Login</Typography>
                        </Grid>
                        <Grid item xs={6}></Grid>
                        <Grid item xs={12}></Grid>
                        <Grid item xs={6}>
                            <TextField 
                                variant="outlined"
                                name = "email"
                                onChange={handleInputChange}
                                label="Email"
                                value ={values.email}></TextField>
                        </Grid>
                        <Grid item xs={6}>
                            <TextField 
                                variant="outlined"
                                name = "password"
                                onChange={handleInputChange}
                                type="password"
                                label="Senha"
                                value ={values.password}></TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <Typography color="peru">{error}</Typography>
                        </Grid>
                        <Grid item xs={12} sx={{marginY:2}}>
                            <Button variant='outlined' size="large" color='primary' onClick={resetLogin} sx={{marginRight:2}}>Resetar</Button>
                            <Button variant='contained' type="submit"size="large" color='secondary'>Enviar</Button>
                        </Grid>
                        <Grid item xs={12}>
                            <Typography> Não tem uma conta?  
                                <Link  component={RouterLink} to="/cadastro"> Registre-se</Link>
                            </Typography>
                        </Grid>
                    </Grid>
                </Paper>
                </Container>

            </Box>
        </>
    )
}

export default Login;