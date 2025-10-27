import React from "react";
import { useState } from "react";
import Select from "./select.component";
import { Grid, Typography, IconButton, Button, RadioGroup, Radio, FormControlLabel, FormControl, FormLabel, LinearProgress } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import styled from "@emotion/styled";
import { Box } from "@mui/system";
import useForm from "./useForm";
import TurmasDataService from "../../services/turmas"; // Usaremos o serviço para enviar o arquivo

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
    // ... (mantive seus outros breakpoints de estilo)
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
    const [file, setFile] = useState(null); // Estado para guardar o arquivo selecionado

    const {
        values,
        handleInputChange,
        erros,
        setErros,
    } = useForm(inicialValues);

    // Atualiza o estado com o arquivo escolhido e limpa erros antigos
    const handleFileChoose = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };
    
   const handleSubmit = async () => {
    // 1. Validação inicial para garantir que ano e arquivo foram selecionados
    if (!validate()) return;
    if (!file) {
        alert("Por favor, selecione um arquivo CSV para enviar.");
        return;
    }

    // 2. Ativa o estado de carregamento (mostra a barra de progresso)
    setLoading(true);

    // 3. Monta o payload com o arquivo e os dados do formulário
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ano', values.ano);
    formData.append('semestre', values.semestre);

    try {
        // 4. Tenta enviar os dados para o backend
        const res = await TurmasDataService.uploadCSV(formData);
        
        // Em caso de sucesso, passa a resposta para os componentes pais
        handleResponse(res); 
        if (res.data.erros) {
            setListaErros(res.data.erros);
        }
        
        // 5. Desativa o carregamento e fecha o modal APÓS o sucesso
        setLoading(false);
        closeButton();

    } catch (error) {
        // 6. Bloco de captura de erro robusto
        console.error("Erro na requisição:", error);

        // Garante que 'errorResponse' sempre será um objeto válido
        const errorResponse = error.response 
            ? error.response 
            : { data: { msg: "Erro de conexão: não foi possível conectar ao servidor." } };
        
        // Passa o erro formatado para os componentes pais
        handleResponse(errorResponse);

        if (errorResponse.data?.erros) {
            setListaErros(errorResponse.data.erros);
        }

        // 7. Desativa o carregamento e fecha o modal APÓS o erro
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
                <Grid item xs={12} mb={1}>
                    <label htmlFor='readCsvFile'>
                        <Input
                            accept=".csv" // MUDANÇA: Aceitar apenas .csv
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