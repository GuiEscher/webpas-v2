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
 
    uploadCSV(formData) {
        return http.post("/turmas/upload-csv", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    }

    updateTurma(turmaId,turma){
        return http.post(`turmas/update/${turmaId}`,turma)
    }

    deleteTurmas(turmas){
        return http.post(`turmas/deleteMany`,turmas)
    }

    deleteAnoSemestre(ano,semestre){
        return http.delete(`turmas/delete/${ano}/${semestre}`)
    }

    // --- NOVOS MÉTODOS PARA GERENCIAMENTO DE PERÍODOS ---
    getSemestresDisponiveis() {
        return http.get("/turmas/info/semestres-disponiveis");
    }

    deletePeriodos(data) {
        // data = { periodos: [{ano: 2023, semestre: 1}, ...] }
        return http.post("/turmas/delete-periodos", data);
    }
}

export default new TurmasDataService();