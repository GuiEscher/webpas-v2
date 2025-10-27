// services/turmas.js

import http from "../http-commom";

class TurmasDataService {
    getAll(){
        return http.get('turmas')
    }

    getDepartamentos(){
        return http.get('turmas/d/')
    }

    getByAnoSemestre(ano,semestre){
        return http.get(`turmas/${ano}/${semestre}`)
    }

    addTurma(turma){
        return http.post('turmas/add',turma)
    }

    addManyTurmas(novasTurmas){
        return http.post('turmas/arquivoturma',novasTurmas)
    }
 
    // --- NOVO MÉTODO ADICIONADO ---
    uploadCSV(formData) {
        // A requisição POST para o novo endpoint de CSV.
        // O header 'Content-Type': 'multipart/form-data' é crucial para o envio de arquivos
        // e é adicionado automaticamente pelo navegador ao usar FormData.
        return http.post("/turmas/upload-csv", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
    }
    // --- FIM DO NOVO MÉTODO ---

    updateTurma(turmaId,turma){
        return http.post(`turmas/update/${turmaId}`,turma)
    }

    deleteTurmas(turmas){
        return http.post(`turmas/deleteMany`,turmas)
    }

    deleteAnoSemestre(ano,semestre){
        return http.delete(`turmas/delete/${ano}/${semestre}`)
    }
}

export default new TurmasDataService();