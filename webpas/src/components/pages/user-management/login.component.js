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

        UserDataService.login(data)
            .then(res=>{
				document.cookie = `user=${encodeURIComponent(JSON.stringify(res.data.userToken))};max-age=${1000 * 60 * 24 * 30 *60};path=/;SameSite=Lax`
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
                <Box component="form" onSubmit={handleSubmit} sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2 }}>
                    <Container maxWidth="sm" sx={{ py: 6 }}>
                    <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
                        <Grid container spacing={2} alignItems="stretch">
                            <Grid item xs={12}>
                                <Typography variant="h5" sx={{ mb: 1 }}>Login</Typography>
                            </Grid>
                            <Grid item xs={12}>
                            <TextField 
                                variant="outlined"
                                name = "email"
                                onChange={handleInputChange}
                                label="Email"
                                    value ={values.email}
                                    fullWidth
                                />
                        </Grid>
                            <Grid item xs={12}>
                            <TextField 
                                variant="outlined"
                                name = "password"
                                onChange={handleInputChange}
                                type="password"
                                label="Senha"
                                    value ={values.password}
                                    fullWidth
                                />
                        </Grid>
                        <Grid item xs={12}>
                            <Typography color="peru">{error}</Typography>
                        </Grid>
                            <Grid item xs={12} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                                <Button variant='outlined' size="large" color='primary' onClick={resetLogin}>Resetar</Button>
                                <Button variant='contained' type="submit" size="large" color='secondary'>Enviar</Button>
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