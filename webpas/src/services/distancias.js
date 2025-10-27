import http from "../http-commom";

class DistanciasDataService {
    getAll(){
        return http.get('distancias')
    }

    addDistancia(distancia){
        return http.post('distancias/add',distancia)
    }

    addManyDistancias(novasDistancias){
        return http.post('distancias/arquivodistancia',novasDistancias)
    }

    updateDistancia(distanciaId,distancia){
        return http.post(`distancias/update/${distanciaId}`,distancia)
    }

    deleteDistancias(distancia){
        return http.post(`distancias/deleteMany`,distancia)
    }

    temTodos(){
        return http.get('distancias/iscomplete')
    }
}

export default new DistanciasDataService();