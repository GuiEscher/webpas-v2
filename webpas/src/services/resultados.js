import http from "../http-commom";
import axios from "axios";

class ResultadosDataService {
    getAll(){
        return http.get('resultados')
    }

    getByAnoSemestre(ano,semestre){
        return http.get(`resultados/${ano}/${semestre}`)
    }

    getByAnoSemestreDia(ano,semestre,dia){
        return http.get(`resultados/${ano}/${semestre}/${dia}`)
    }

    getByAnoSemestreDiaPeriodo(ano,semestre,dia,periodo){
        return http.get(`resultados/${ano}/${semestre}/${dia}/${periodo}`)
    }

    calculaLista(data){
        return http.post('resultados/calculalista',data)
    }

    trocaSala(data,id){
        return http.post(`resultados/update/${id}`,data)
    }

    getSalasLivres(resultadoId, slot) {
        return http.get(`resultados/salas-livres/${resultadoId}/${slot}`);
    }

    atribuirSala(resultadoId, data) {
        return http.post(`resultados/atribuir-sala/${resultadoId}`, data);
    }

    getSalasLivresTurma(turmaId) {
        return http.get(`resultados/salas-livres-turma/${turmaId}`);
    }

    alocarManual(data) {
        return http.post(`resultados/alocar-manual`, data);
    }

    getAnalise(ano, semestre, minAlunos = 5, campus) {
        const c = campus ? `&campus=${encodeURIComponent(campus)}` : "";
        return http.get(`resultados/analise/${ano}/${semestre}?minAlunos=${minAlunos}${c}`);
    }
    deleteByAnoSemestre = (ano, semestre, campus) => {
    const q = campus ? `?campus=${encodeURIComponent(campus)}` : '';
    const url = `http://localhost:5000/resultados/delete/${ano}/${semestre}${q}`;
    console.log('URL DELETE gerada:', url);
    return axios.delete(url, { withCredentials: true });  // CORREÇÃO: Envia cookies/auth
}


}

export default new ResultadosDataService();