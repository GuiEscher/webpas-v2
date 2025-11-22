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
    deleteByAnoSemestre = (ano, semestre) => {
    const url = `http://localhost:5000/resultados/delete/${ano}/${semestre}`;
    console.log('URL DELETE gerada:', url);
    return axios.delete(url, { withCredentials: true });  // CORREÇÃO: Envia cookies/auth
}


}

export default new ResultadosDataService();