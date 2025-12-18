import React from 'react';
import { Box, Typography, Divider, List, ListItem, ListItemText, Alert } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import TuneIcon from '@mui/icons-material/Tune';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const AjudaSolver = (props) => {
    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InfoIcon color="primary" />
                Como utilizar o Solver
            </Typography>
            
            <Typography variant="body2" color="textSecondary" paragraph>
                Esta ferramenta utiliza um algoritmo de otimização matemática para alocar turmas em salas de aula, 
                respeitando as distâncias entre departamentos e capacidades físicas.
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TuneIcon fontSize="small" /> Parâmetros de Configuração
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText 
                            primary={<Typography variant="subtitle2">Folga (Delta)</Typography>}
                            secondary="Define a tolerância de assentos vazios. Ex: Se Delta é 0, o sistema tenta encontrar a sala mais justa possível. Aumentar este valor permite alocar turmas em salas bem maiores que o necessário."
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemText 
                            primary={<Typography variant="subtitle2">Mínimo de Alunos</Typography>}
                            secondary="Turmas com número de alunos matriculados inferior a este valor serão ignoradas pelo otimizador ou tratadas como exceção."
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemText 
                            primary={<Typography variant="subtitle2">Prédio Auxiliar</Typography>}
                            secondary="Se marcado, permite que o algoritmo aloque aulas em um prédio comum/compartilhado caso não haja salas disponíveis no departamento de origem."
                        />
                    </ListItem>
                </List>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccessTimeIcon fontSize="small" /> Otimização Avançada (MIP)
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                    Ajuste estes valores apenas se o resultado estiver demorando muito ou for insatisfatório.
                </Alert>
                <List dense>
                    <ListItem>
                        <ListItemText 
                            primary={<Typography variant="subtitle2">Tempo Limite (segundos)</Typography>}
                            secondary="Tempo máximo que o algoritmo passará tentando encontrar a melhor solução matemática. Se o tempo expirar, ele retornará a melhor solução encontrada até o momento."
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemText 
                            primary={<Typography variant="subtitle2">MIP Gap (0.0 a 1.0)</Typography>}
                            secondary="Define a margem de erro aceitável para a solução ótima. Um valor de 0.1 (10%) é mais rápido. Um valor de 0.01 busca uma solução 99% ótima, mas pode levar muito mais tempo de processamento."
                        />
                    </ListItem>
                </List>
            </Box>
        </Box>
    );
};

export default AjudaSolver;