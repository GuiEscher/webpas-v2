import React, { useEffect } from "react";
import useAuth from '../../services/useAuth';
import { styled, useTheme } from '@mui/material/styles';
import Navbar from "../re-usable/navbar.component";
import { Container, Grid, Paper, Typography, Box, Card, CardContent, CardHeader, Avatar, Divider, List, ListItem, ListItemIcon, ListItemText } from "@mui/material";
import PageHeader from "../re-usable/page-header.component";
import WebhookIcon from '@mui/icons-material/Webhook';
import UserDataService from '../../services/user';

// Ícones para as seções
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import CalculateIcon from '@mui/icons-material/Calculate';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import GroupsIcon from '@mui/icons-material/Groups';
import RoomPreferencesIcon from '@mui/icons-material/RoomPreferences';

const DrawerHeader = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: theme.spacing(0, 1),
    // necessary for content to be below app bar
    ...theme.mixins.toolbar,
}));
  
const containerStyle = {
    '@media (min-width: 1400px)': {
      maxWidth: '1400px'
    }
}

const HomePage = props => {
    const {logout, user} = useAuth();
    const {nav, setNav} = props;
    const theme = useTheme();

    useEffect(() => {
        UserDataService.getPrivate()
            .then(res => {
                let authorized = res.data.success;
                if(!authorized){
                    logout();
                }
            }).catch(err => {
                console.log(err);
                logout();
            })
    }, []);

    return(
        <>
            <Navbar open={nav} setOpen={setNav}/>
            <Box component="main" sx={{ flexGrow: 1, p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
                <DrawerHeader />
                <Container sx={containerStyle}>
                    
                    {/* Cabeçalho da Página */}
                    <PageHeader
                        title="WebPAS"
                        subtitle="Sistema Integrado de Alocação de Salas Universitárias"
                        icon={<WebhookIcon fontSize="large"/>}
                    />

                    {/* Banner de Boas-vindas */}
                    <Paper 
                        elevation={0} 
                        sx={{ 
                            p: 4, 
                            mt: 3, 
                            mb: 4, 
                            backgroundColor: theme.palette.primary.main, 
                            color: theme.palette.primary.contrastText,
                            borderRadius: 2
                        }}
                    >
                        <Grid container alignItems="center" spacing={2}>
                            <Grid item xs={12} md={8}>
                                <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
                                    Bem-vindo ao WebPAS
                                </Typography>
                                <Typography variant="h6" sx={{ opacity: 0.9 }}>
                                    Uma solução robusta para otimizar a distribuição de turmas e espaços físicos, garantindo eficiência e atendendo às necessidades acadêmicas.
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: 'flex-end', opacity: 0.2 }}>
                                <WebhookIcon sx={{ fontSize: 120 }} />
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Seção: Fluxo de Trabalho */}
                    <Box sx={{ mb: 6 }}>
                        <Typography variant="h5" gutterBottom sx={{ fontWeight: '500', color: '#444', mb: 3, borderLeft: `5px solid ${theme.palette.secondary.main}`, pl: 2 }}>
                            Como Funciona
                        </Typography>
                        
                        <Grid container spacing={3}>
                            {/* Card 1: Importação */}
                            <Grid item xs={12} md={4}>
                                <Card sx={{ height: '100%', transition: '0.3s', '&:hover': { boxShadow: 6 } }}>
                                    <CardHeader
                                        avatar={
                                            <Avatar sx={{ bgcolor: theme.palette.primary.light }}>
                                                <UploadFileIcon />
                                            </Avatar>
                                        }
                                        title={<Typography variant="h6">1. Dados & Importação</Typography>}
                                    />
                                    <CardContent>
                                        <Typography variant="body2" color="text.secondary">
                                            Comece cadastrando os <b>Prédios</b> e <b>Salas</b> disponíveis. Em seguida, utilize a importação via CSV para carregar centenas de <b>Turmas</b> de uma só vez, com suporte para diferentes campi (São Carlos e Sorocaba) e horários flexíveis.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Card 2: Configuração */}
                            <Grid item xs={12} md={4}>
                                <Card sx={{ height: '100%', transition: '0.3s', '&:hover': { boxShadow: 6 } }}>
                                    <CardHeader
                                        avatar={
                                            <Avatar sx={{ bgcolor: theme.palette.primary.light }}>
                                                <SettingsSuggestIcon />
                                            </Avatar>
                                        }
                                        title={<Typography variant="h6">2. Regras & Distâncias</Typography>}
                                    />
                                    <CardContent>
                                        <Typography variant="body2" color="text.secondary">
                                            O sistema utiliza uma matriz de distâncias para priorizar salas próximas aos departamentos ofertantes. Você pode configurar restrições específicas, como a necessidade de <b>Quadro Verde</b> ou <b>Branco</b> para determinadas turmas.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Card 3: Solver */}
                            <Grid item xs={12} md={4}>
                                <Card sx={{ height: '100%', transition: '0.3s', '&:hover': { boxShadow: 6 } }}>
                                    <CardHeader
                                        avatar={
                                            <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                                                <CalculateIcon />
                                            </Avatar>
                                        }
                                        title={<Typography variant="h6">3. Otimização (Solver)</Typography>}
                                    />
                                    <CardContent>
                                        <Typography variant="body2" color="text.secondary">
                                            Nosso algoritmo inteligente processa todas as variáveis para encontrar a melhor alocação possível. Ele realiza a junção automática de horários quebrados e respeita a capacidade das salas para minimizar conflitos.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Seção: Diferenciais e Detalhes */}
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3, height: '100%' }}>
                                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CheckCircleOutlineIcon color="success" /> Objetivos do Sistema
                                </Typography>
                                <Divider sx={{ my: 2 }} />
                                <List>
                                    <ListItem>
                                        <ListItemIcon><GroupsIcon color="primary" /></ListItemIcon>
                                        <ListItemText 
                                            primary="Maximização do Uso" 
                                            secondary="Garantir que as salas sejam ocupadas de forma eficiente, evitando ociosidade." 
                                        />
                                    </ListItem>
                                    <ListItem>
                                        <ListItemIcon><RoomPreferencesIcon color="primary" /></ListItemIcon>
                                        <ListItemText 
                                            primary="Conforto Logístico" 
                                            secondary="Minimizar a distância percorrida por alunos e professores entre as aulas." 
                                        />
                                    </ListItem>
                                </List>
                            </Paper>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3, height: '100%', bgcolor: '#fffde7' }}>
                                <Typography variant="h6" gutterBottom color="warning.dark">
                                    Dicas de Uso
                                </Typography>
                                <Divider sx={{ my: 2 }} />
                                <Typography variant="body2" paragraph>
                                    • <b>CSV:</b> Certifique-se de usar o padrão correto de colunas ao importar turmas. O sistema detecta automaticamente se o separador é vírgula ou ponto-e-vírgula.
                                </Typography>
                                <Typography variant="body2" paragraph>
                                    • <b>Sorocaba vs São Carlos:</b> Utilize o seletor de campus nas telas de Turmas e Resultados para filtrar a visualização e evitar confusão de dados.
                                </Typography>
                                <Typography variant="body2">
                                    • <b>Edição Rápida:</b> Na lista de turmas, você pode alterar o tipo de quadro (Verde/Branco) diretamente na tabela e salvar tudo de uma vez.
                                </Typography>
                            </Paper>
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 8, textAlign: 'center', color: '#999', fontSize: '0.8rem' }}>
                        <Typography variant="caption">
                            WebPAS © {new Date().getFullYear()} - Problema de Alocação de Salas
                        </Typography>
                    </Box>

                </Container>
            </Box>
        </>
    )

}

export default HomePage;