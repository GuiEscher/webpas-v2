import React, { useState } from "react";
import Select from "./select.component";
import { Grid, Typography, IconButton, Button, RadioGroup, Radio, FormControlLabel, FormControl, FormLabel, LinearProgress, ToggleButton, ToggleButtonGroup } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import styled from "@emotion/styled";
import { Box } from "@mui/system";
import useForm from "./useForm";
import TurmasDataService from "../../services/turmas";

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
    width: '90%',
    p: 4,
    '@media (min-width: 900px)': { width: '80%' },
    '@media (min-width: 1050px)': { width: '70%' },
    '@media (min-width: 1400px)': { width: '60%' },
    '@media (min-width: 1600px)': { width: '50%' },
    '@media (min-width: 1800px)': { width: '40%' },
};

const inicialValues = {
    ano: new Date().getFullYear(),
    semestre: 1
};

export default function FileFormTurma(props) {
    const { title, closeButton, anos, handleResponse, setListaErros } = props;

    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState(null);
    
    // NOVO ESTADO: Campus Padrão (São Carlos)
    const [campus, setCampus] = useState('São Carlos');

    const {
        values,
        handleInputChange,
        erros,
        setErros,
    } = useForm(inicialValues);

    const handleFileChoose = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };
    
    // Handler para mudança de campus
    const handleCampusChange = (event, newCampus) => {
        if (newCampus !== null) {
            setCampus(newCampus);
        }
    };

   const handleSubmit = async () => {
    if (!validate()) return;
    if (!file) {
        alert("Por favor, selecione um arquivo CSV para enviar.");
        return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('ano', values.ano);
    formData.append('semestre', values.semestre);
    // Enviando o campus escolhido
    formData.append('campusSelecionado', campus);

    try {
        const res = await TurmasDataService.uploadCSV(formData);
        
        handleResponse(res); 
        if (res.data.erros) {
            setListaErros(res.data.erros);
        }
        
        setLoading(false);
        closeButton();

    } catch (error) {
        console.error("Erro na requisição:", error);
        const errorResponse = error.response 
            ? error.response 
            : { data: { msg: "Erro de conexão: não foi possível conectar ao servidor." } };
        
        handleResponse(errorResponse);

        if (errorResponse.data?.erros) {
            setListaErros(errorResponse.data.erros);
        }

        setLoading(false);
        closeButton();
    }
};

    const validate = () => {
        let temp = {};
        temp.ano = values.ano ? "" : "O ano é obrigatório";
        setErros({ ...temp });
        return Object.values(temp).every(errorValue => errorValue === "");
    };

    return (
        <Box component="form" sx={modalStyleFile}>
            <Grid container rowSpacing={2} spacing={1} justifyContent="space-between" columns={12}>
                <Grid item xs={11}>
                    <Typography variant='h5'>{title}</Typography>
                </Grid>
                <Grid item xs={1}>
                    <IconButton onClick={closeButton} disabled={loading}><CloseIcon /></IconButton>
                </Grid>

                {/* --- NOVO SELETOR DE CAMPUS --- */}
                <Grid item xs={12} sx={{display:'flex', justifyContent:'center', my: 2}}>
                    <ToggleButtonGroup
                        color="primary"
                        value={campus}
                        exclusive
                        onChange={handleCampusChange}
                        aria-label="Selectionar Campus"
                        size="small"
                    >
                        <ToggleButton value="São Carlos">São Carlos</ToggleButton>
                        <ToggleButton value="Sorocaba">Sorocaba</ToggleButton>
                    </ToggleButtonGroup>
                </Grid>
                {/* ------------------------------- */}

                <Grid item xs={12} mb={1}>
                    <label htmlFor='readCsvFile'>
                        <Input
                            accept=".csv"
                            id="readCsvFile"
                            type="file"
                            onChange={handleFileChoose}
                        />
                        <Button component='span' variant='outlined' disabled={loading}>Escolher Arquivo CSV</Button>
                    </label>
                    <Typography sx={{ display: "inline", marginLeft: 2 }} variant='body1'>
                        {file ? file.name : "Nenhum arquivo selecionado"}
                    </Typography>
                </Grid>
                <Grid item xs={12}>
                    <Typography variant='body1'> Adicionar ao ano e semestre de</Typography>
                </Grid>
                <Grid item xs={12} sm={11} md={5}>
                    <Select
                        name="ano"
                        label="Ano"
                        value={values.ano}
                        onChange={handleInputChange}
                        options={anos}
                        error={erros.ano}
                        disabled={loading}
                    />
                </Grid>
                <Grid item xs={12} sm={12} md={6}>
                    <FormControl>
                        <FormLabel>Semestre</FormLabel>
                        <RadioGroup row
                            name="semestre"
                            value={values.semestre}
                            onChange={handleInputChange}>
                            <FormControlLabel value={1} control={<Radio disabled={loading}/>} label="1º Semestre" />
                            <FormControlLabel value={2} control={<Radio disabled={loading}/>} label="2º Semestre" />
                        </RadioGroup>
                    </FormControl>
                </Grid>
                <Grid item xs={12}>
                    <Button variant='contained' onClick={handleSubmit} disabled={loading || !file}>
                        {loading ? "Enviando..." : "Enviar"}
                    </Button>
                </Grid>
                <Grid item xs={12}>
                    {loading && <LinearProgress />}
                </Grid>
            </Grid>
        </Box>
    );
}