class ExcelExporter {
  colunasComFiltroComCampos(alocacoes, filterFn, state) {
    let resultArray = [];
    filterFn.fn(alocacoes).map((alocacao) => {
      let resultObj = {
        Predio: alocacao.sala.predio,
        Sala: alocacao.sala.numeroSala,
        Dia: alocacao.turma.diaDaSemana,
        "Horário Alocação": alocacao.horario,
      };
      if (state.capacidade) {
        resultObj["Capacidade"] = alocacao.sala.capacidade;
      }
      resultObj["Horário de Início"] = alocacao.turma.horarioInicio;
      if (state.horarioFim) {
        resultObj["Horário de Término"] = alocacao.turma.horarioFim;
      }
      if (state.idTurma) {
        resultObj["idTurma"] = alocacao.turma.idTurma;
      }
      // --- ADICIONADO AQUI (Controlado pelo checkbox) ---
      if (state.horario_id) {
        resultObj["ID Horário"] = alocacao.turma.horario_id || "";
      }
      // --------------------------------------------------
      if (state.nomeDisciplina) {
        resultObj["Nome da Disciplina"] = alocacao.turma.nomeDisciplina;
      }
      if (state.codDisciplina) {
        resultObj["codDisciplina"] = alocacao.turma.codDisciplina;
      }
      if (state.turma) {
        resultObj["Turma"] = alocacao.turma.turma;
      }
      if (state.departamentoOferta) {
        resultObj["Departamento de Oferta"] = alocacao.turma.departamentoOferta;
      }
      if (state.departamentoTurma) {
        resultObj["Departamento Recomendado"] =
          alocacao.turma.departamentoTurma;
      }
      if (state.totalTurma) {
        resultObj["Número de Alunos"] = alocacao.turma.totalTurma;
      }
      if (state.docentes) {
        resultObj["Docentes"] = alocacao.turma.docentes;
      }
      if (state.creditosAula) {
        resultObj["Créditos"] = alocacao.turma.creditosAula;
      }
      if (alocacao.turma.juncao && alocacao.turma.juncao > 0) {
        resultObj["Junção"] = alocacao.juncao ? "Junto" : alocacao.turma.juncao;
      }

      resultArray.push(resultObj);
    });
    return resultArray;
  }

  colunasComFiltroSemCampos(alocacoes, filterFn) {
    let resultArray = [];
    filterFn.fn(alocacoes).map((alocacao) => {
      let resultObj = {
        Predio: alocacao.sala.predio,
        Sala: alocacao.sala.numeroSala,
        Dia: alocacao.turma.diaDaSemana,
        "Horário Alocação": alocacao.horario,
      };
      resultObj["Capacidade"] = alocacao.sala.capacidade;
      resultObj["Horário de Início"] = alocacao.turma.horarioInicio;
      resultObj["Horário de Término"] = alocacao.turma.horarioFim;
      resultObj["idTurma"] = alocacao.turma.idTurma;

      // --- ADICIONADO AQUI (Sempre incluído) ---
      resultObj["ID Horário"] = alocacao.turma.horario_id || "";
      // ----------------------------------------

      resultObj["Nome da Disciplina"] = alocacao.turma.nomeDisciplina;
      resultObj["codDisciplina"] = alocacao.turma.codDisciplina;
      resultObj["Turma"] = alocacao.turma.turma;
      resultObj["Departamento de Oferta"] = alocacao.turma.departamentoOferta;
      resultObj["Departamento Recomendado"] = alocacao.turma.departamentoTurma;
      resultObj["Número de Alunos"] = alocacao.turma.totalTurma;
      resultObj["Docentes"] = alocacao.turma.docentes;
      resultObj["Créditos"] = alocacao.turma.creditosAula;
      if (alocacao.turma.juncao && alocacao.turma.juncao > 0) {
        resultObj["Junção"] = alocacao.juncao ? "Junto" : alocacao.turma.juncao;
      }

      resultArray.push(resultObj);
    });
    return resultArray;
  }

  colunasSemFiltroComCampos(alocacoes, state) {
    let resultArray = [];
    alocacoes.map((alocacao) => {
      let resultObj = {
        Predio: alocacao.sala.predio,
        Sala: alocacao.sala.numeroSala,
        Dia: alocacao.turma.diaDaSemana,
        "Horário Alocação": alocacao.horario,
      };
      if (state.capacidade) {
        resultObj["Capacidade"] = alocacao.sala.capacidade;
      }
      resultObj["Horário de Início"] = alocacao.turma.horarioInicio;
      if (state.horarioFim) {
        resultObj["Horário de Término"] = alocacao.turma.horarioFim;
      }
      if (state.idTurma) {
        resultObj["idTurma"] = alocacao.turma.idTurma;
      }
      // --- ADICIONADO AQUI ---
      if (state.horario_id) {
        resultObj["ID Horário"] = alocacao.turma.horario_id || "";
      }
      // -----------------------
      if (state.nomeDisciplina) {
        resultObj["Nome da Disciplina"] = alocacao.turma.nomeDisciplina;
      }
      if (state.codDisciplina) {
        resultObj["codDisciplina"] = alocacao.turma.codDisciplina;
      }
      if (state.turma) {
        resultObj["Turma"] = alocacao.turma.turma;
      }
      if (state.departamentoOferta) {
        resultObj["Departamento de Oferta"] = alocacao.turma.departamentoOferta;
      }
      if (state.departamentoTurma) {
        resultObj["Departamento Recomendado"] =
          alocacao.turma.departamentoTurma;
      }
      if (state.totalTurma) {
        resultObj["Número de Alunos"] = alocacao.turma.totalTurma;
      }
      if (state.docentes) {
        resultObj["Docentes"] = alocacao.turma.docentes;
      }
      if (state.creditosAula) {
        resultObj["Créditos"] = alocacao.turma.creditosAula;
      }
      if (alocacao.turma.juncao && alocacao.turma.juncao > 0) {
        resultObj["Junção"] = alocacao.juncao ? "Junto" : alocacao.turma.juncao;
      }

      resultArray.push(resultObj);
    });
    return resultArray;
  }

  colunasSemFiltroSemCampos(alocacoes) {
    let resultArray = [];
    alocacoes.map((alocacao) => {
      let resultObj = {
        Predio: alocacao.sala.predio,
        Sala: alocacao.sala.numeroSala,
        Dia: alocacao.turma.diaDaSemana,
        "Horário Alocação": alocacao.horario,
      };
      resultObj["Capacidade"] = alocacao.sala.capacidade;
      resultObj["Horário de Início"] = alocacao.turma.horarioInicio;
      resultObj["Horário de Término"] = alocacao.turma.horarioFim;
      resultObj["idTurma"] = alocacao.turma.idTurma;

      // --- ADICIONADO AQUI ---
      resultObj["ID Horário"] = alocacao.turma.horario_id || "";
      // -----------------------

      resultObj["Nome da Disciplina"] = alocacao.turma.nomeDisciplina;
      resultObj["codDisciplina"] = alocacao.turma.codDisciplina;
      resultObj["Turma"] = alocacao.turma.turma;
      resultObj["Departamento de Oferta"] = alocacao.turma.departamentoOferta;
      resultObj["Departamento Recomendado"] = alocacao.turma.departamentoTurma;
      resultObj["Número de Alunos"] = alocacao.turma.totalTurma;
      resultObj["Docentes"] = alocacao.turma.docentes;
      resultObj["Créditos"] = alocacao.turma.creditosAula;
      if (alocacao.turma.juncao && alocacao.turma.juncao > 0) {
        resultObj["Junção"] = alocacao.juncao ? "Junto" : alocacao.turma.juncao;
      }

      resultArray.push(resultObj);
    });
    return resultArray;
  }

  linhasComFiltroComCampos() {
    // Implementar se estiver usando visualização em linhas
  }

  linhasComFiltroSemCampos() {}

  linhasSemFiltroComCampos() {}

  linhasSemFiltroSemCampos() {}
}

export default new ExcelExporter();
