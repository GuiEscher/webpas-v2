import React, { useState } from "react";
import { Grid, Typography, IconButton, Button, Box, LinearProgress } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import styled from "@emotion/styled";
import SalasDataService from "../../services/salas"; // Verifique se o caminho do serviço está correto

const Input = styled('input')({
    display: 'none',
});

const modalStyleFile = {
    position: 'absolute',
    backgroundColor: "#fff",
    borderRadius: '8px',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '75%',
    p: 4,
};

const FileFormSalas = (props) => {
    const { title, closeButton, handleResponse } = props;
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState(null);

    const handleFileChoose = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            alert("Por favor, selecione um arquivo de planilha (.xlsx, .xlsm).");
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            // Chama o novo método de upload de planilha no serviço de Salas
            const res = await SalasDataService.uploadPlanilha(formData);
            handleResponse(res);
        } catch (error) {
            const errorResponse = error.response 
                ? error.response 
                : { data: { msg: "Erro de conexão com o servidor." } };
            handleResponse(errorResponse);
        } finally {
            setLoading(false);
            closeButton();
        }
    };
    
    return (
        <Box component="form" sx={modalStyleFile} onSubmit={handleSubmit}>
            <Grid container rowSpacing={2} spacing={1} justifyContent="space-between">
                <Grid item xs={11}>
                    <Typography variant='h5'>{title || "Upload de Salas (ATs)"}</Typography>
                    <Typography variant='body2'>A planilha deve conter a aba "AT".</Typography>
                </Grid>
                <Grid item xs={1}>
                    <IconButton onClick={closeButton} disabled={loading}><CloseIcon/></IconButton>
                </Grid>
                <Grid item xs={12} mb={1}>
                    <label htmlFor='readExcelFileSalas'>
                        <Input 
                            accept=".xlsx, .xlsm"
                            id="readExcelFileSalas" 
                            type="file"
                            onChange={handleFileChoose}
                        />
                        <Button component='span' variant='outlined' disabled={loading}>Escolher Planilha</Button>
                    </label>
                    <Typography sx={{display:"inline", marginLeft:2}} variant='body1'>
                        {file ? file.name : "Nenhum arquivo selecionado"}
                    </Typography>
                </Grid>
                <Grid item xs={6}>
                    <Button variant='contained' type="submit" disabled={loading || !file}>
                        {loading ? 'Enviando...' : 'Enviar'}
                    </Button>
                </Grid>
                <Grid item xs={12}>
                    {loading && <LinearProgress />}
                </Grid>
            </Grid>
        </Box>
    );
}

export default FileFormSalas;