import React, { useEffect, useState } from "react";
import useForm from "./useForm";
import {
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  RadioGroup,
  TextField,
} from "@mui/material";
import { Radio } from "@mui/material";
import { Grid } from "@mui/material";
import { Box } from "@mui/system";
import { Typography } from "@mui/material";
import { IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExcelExporter from "../../services/excel-exporter";
import * as XLSX from "xlsx/xlsx.mjs";

const inicialValues = {
  formato: 1,
  filtro: 1,
  camposSelecionados: 1,
};

const formCssClass = {
  "& .MuiGrid-item": {
    "& .MuiTextField-root": {
      width: "100%",
    },
  },
};

const ExportarResultadoForm = (props) => {
  const {
    ano,
    semestre,
    closeModalForm,
    resultados,
    horariosInicio,
    state,
    filterFn,
  } = props;

  const [exportLinhas, setExportLinhas] = useState([]);
  const [exportColunas, setExportColunas] = useState([]);
  const [alocacoes, setAlocacoes] = useState([]);

  useEffect(() => {
    retornaAlocacoes();
  }, [resultados]);

  const retornaAlocacoes = () => {
    if (resultados.length > 0) {
      let alocacoesTemp = [];
      resultados.map((resultado) => {
        resultado.alocacoes.map((alocacao) => {
          let alocacaoTemp = {
            horario:
              alocacao?.horarioSlot == 1
                ? getHorarioByPeriodo(resultado.periodo, 1)
                : getHorarioByPeriodo(resultado.periodo, 2),
            turma: alocacao?.turma,
            sala: alocacao?.sala,
          };
          alocacoesTemp.push(alocacaoTemp);
        });
      });

      setAlocacoes(alocacoesTemp);
    } else {
      setAlocacoes([]);
    }
  };

  const getHorarioByPeriodo = (periodo, slot) => {
    let periodoNum = 0;
    if (periodo === "Manhã") {
      periodoNum = 0;
    } else if (periodo === "Tarde") {
      periodoNum = 1;
    } else if (periodo === "Noite") {
      periodoNum = 2;
    }
    return horariosInicio[periodoNum * 2 + slot - 1];
  };

  const retornaExportObjLinhas = () => {
    if (alocacoes.length > 0) {
      // Obter salas únicas
      let unique = alocacoes.reduce((acc, cur) => {
        const search = acc.find(
          (obj) =>
            obj.sala === cur.sala.numeroSala && obj.predio === cur.sala.predio,
        );
        if (!search) {
          acc.push({
            sala: cur.sala.numeroSala,
            predio: cur.sala.predio,
            capacidade: cur.sala.capacidade,
          });
        }
        return acc;
      }, []);

      // Obter dias únicos e ordenados
      let dias = [...new Set(alocacoes.map((item) => item.turma.diaDaSemana))];
      const ordemDias = [
        "Segunda",
        "Terça",
        "Quarta",
        "Quinta",
        "Sexta",
        "Sábado",
      ];
      dias.sort((a, b) => ordemDias.indexOf(a) - ordemDias.indexOf(b));

      let exportData = [];

      // Para cada sala, criar uma linha com todos os horários de todos os dias
      unique.forEach((salaObj) => {
        let row = {
          Prédio: salaObj.predio,
          Sala: salaObj.sala,
          Capacidade: salaObj.capacidade,
        };

        // Para cada dia da semana
        dias.forEach((dia) => {
          // Para cada horário
          horariosInicio.forEach((horario) => {
            // Procurar alocação para essa sala, dia e horário
            let alocacao = alocacoes.find(
              (aloc) =>
                aloc.sala.numeroSala == salaObj.sala &&
                aloc.sala.predio == salaObj.predio &&
                aloc.horario == horario &&
                aloc.turma.diaDaSemana == dia,
            );

            // Criar coluna com nome "Dia - Horário"
            let colName = `${dia} - ${horario}h`;

            if (alocacao) {
              // Montar informações da turma
              let info = [];
              if (alocacao.turma.codDisciplina)
                info.push(alocacao.turma.codDisciplina);
              if (alocacao.turma.turma)
                info.push(`Turma: ${alocacao.turma.turma}`);
              if (alocacao.turma.nomeDisciplina)
                info.push(alocacao.turma.nomeDisciplina);
              if (alocacao.turma.horario_id)
                info.push(`ID: ${alocacao.turma.horario_id}`);
              if (alocacao.turma.totalTurma)
                info.push(`Alunos: ${alocacao.turma.totalTurma}`);

              row[colName] = info.join(" | ");
            } else {
              row[colName] = "";
            }
          });
        });

        exportData.push(row);
      });

      createExcelFileAgenda(exportData);
    }
  };

  const retornaExportObjColunas = () => {
    if (alocacoes.length > 0) {
      let result = [];
      if (values.filtro == 1) {
        if (values.camposSelecionados == 1) {
          result = ExcelExporter.colunasSemFiltroSemCampos(alocacoes);
        } else if (values.camposSelecionados == 2) {
          result = ExcelExporter.colunasSemFiltroComCampos(alocacoes, state);
        }
      } else if (values.filtro == 2) {
        if (values.camposSelecionados == 1) {
          result = ExcelExporter.colunasComFiltroSemCampos(alocacoes, filterFn);
        } else if (values.camposSelecionados == 2) {
          result = ExcelExporter.colunasComFiltroComCampos(
            alocacoes,
            filterFn,
            state,
          );
        }
      }
      setExportColunas(result);
      createExcelFile(result);
    }
  };

  const createExcelFile = (exportArray) => {
    var workbook = XLSX.utils.book_new();
    var worksheet = XLSX.utils.json_to_sheet(exportArray);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Resultados");
    XLSX.writeFile(workbook, "Resultado_" + ano + "_" + semestre + ".xlsx");
  };

  const createExcelFileAgenda = (exportArray) => {
    if (exportArray.length === 0) return;

    var workbook = XLSX.utils.book_new();

    // Obter dias únicos e horários
    let dias = [...new Set(alocacoes.map((item) => item.turma.diaDaSemana))];
    const ordemDias = [
      "Segunda",
      "Terça",
      "Quarta",
      "Quinta",
      "Sexta",
      "Sábado",
    ];
    dias.sort((a, b) => ordemDias.indexOf(a) - ordemDias.indexOf(b));

    // Criar matriz de dados do zero
    let data = [];

    // LINHA 1: Títulos dos dias (será mesclada)
    let headerDias = ["", "", "Cap"];
    dias.forEach((dia) => {
      headerDias.push(dia + "-feira");
      for (let i = 1; i < horariosInicio.length; i++) {
        headerDias.push(""); // Células vazias para merge
      }
    });
    data.push(headerDias);

    // LINHA 2: Horários
    let headerHorarios = ["", "", ""];
    dias.forEach(() => {
      horariosInicio.forEach((h) => {
        headerHorarios.push(h + "h");
      });
    });
    data.push(headerHorarios);

    // LINHAS DE DADOS: Uma linha por sala
    exportArray.forEach((sala) => {
      let row = [sala.Prédio, sala.Sala, sala.Capacidade];

      dias.forEach((dia) => {
        horariosInicio.forEach((horario) => {
          let colName = `${dia} - ${horario}h`;
          let cellValue = sala[colName] || "";

          // Extrair apenas código da disciplina e turma (formato mais limpo)
          if (cellValue) {
            let partes = cellValue.split(" | ");
            let codigo = partes[0] || "";
            let turmaInfo = partes.find((p) => p.startsWith("Turma:"));
            let turma = turmaInfo ? turmaInfo.replace("Turma: ", "") : "";
            cellValue = codigo + (turma ? ` (${turma})` : "");
          }

          row.push(cellValue);
        });
      });

      data.push(row);
    });

    // Criar worksheet a partir da matriz
    var worksheet = XLSX.utils.aoa_to_sheet(data);

    // Configurar merges para os títulos dos dias
    let merges = [];
    let colIndex = 3; // Começa após Prédio, Sala, Cap
    dias.forEach(() => {
      merges.push({
        s: { r: 0, c: colIndex },
        e: { r: 0, c: colIndex + horariosInicio.length - 1 },
      });
      colIndex += horariosInicio.length;
    });
    worksheet["!merges"] = merges;

    // Cores para cada dia da semana
    const coresDias = {
      Segunda: "ADD8E6", // Azul claro
      Terça: "FFB6C1", // Rosa claro
      Quarta: "FFE4B5", // Amarelo claro
      Quinta: "D8BFD8", // Lilás
      Sexta: "B0E0E6", // Azul céu
      Sábado: "F0E68C", // Amarelo esverdeado
    };

    // Estilizar linha dos horários (linha 2)
    const headerHorarioStyle = {
      font: { bold: true },
      alignment: { horizontal: "center", vertical: "center" },
      fill: { fgColor: { rgb: "E8F4F8" } },
    };

    // Aplicar estilos aos headers de horários (linha 2)
    for (let c = 0; c < headerHorarios.length; c++) {
      let cellRef2 = XLSX.utils.encode_cell({ r: 1, c: c });
      if (worksheet[cellRef2]) worksheet[cellRef2].s = headerHorarioStyle;
    }

    // Aplicar cores aos dias da semana (linha 1) com cores diferentes
    colIndex = 3;
    dias.forEach((dia) => {
      let cor = coresDias[dia] || "E8F4F8";
      let diaStyle = {
        font: { bold: true, sz: 12 },
        alignment: { horizontal: "center", vertical: "center" },
        fill: { fgColor: { rgb: cor } },
      };

      // Aplicar estilo à célula principal do dia
      let cellRef = XLSX.utils.encode_cell({ r: 0, c: colIndex });
      if (worksheet[cellRef]) worksheet[cellRef].s = diaStyle;

      colIndex += horariosInicio.length;
    });

    // Estilizar células fixas (Prédio, Sala, Cap)
    const fixoStyle = {
      font: { bold: true },
      alignment: { horizontal: "center", vertical: "center" },
      fill: { fgColor: { rgb: "D3D3D3" } },
    };
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        let cellRef = XLSX.utils.encode_cell({ r: r, c: c });
        if (worksheet[cellRef]) worksheet[cellRef].s = fixoStyle;
      }
    }

    // Ajustar largura das colunas
    const colWidths = [
      { wch: 8 }, // Prédio
      { wch: 8 }, // Sala
      { wch: 5 }, // Cap
    ];

    for (let i = 0; i < horariosInicio.length * dias.length; i++) {
      colWidths.push({ wch: 25 }); // Colunas dos horários
    }

    worksheet["!cols"] = colWidths;

    // Definir altura das linhas
    worksheet["!rows"] = [
      { hpt: 25 }, // Linha 1 (dias)
      { hpt: 20 }, // Linha 2 (horários)
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Agenda");
    XLSX.writeFile(workbook, "Agenda_" + ano + "_" + semestre + ".xlsx");
  };

  const { values, setValues, handleInputChange, erros, setErros, resetForm } =
    useForm(inicialValues);

  const createExportLinhasFile = () => {};

  const handleSubmit = (e) => {
    e.preventDefault();
    if (values.formato == 1) {
      // Base de Dados (formato em colunas)
      retornaExportObjColunas();
    } else if (values.formato == 2) {
      // Agenda (formato de grade)
      retornaExportObjLinhas();
    }
  };

  return (
    <>
      <Box component="form" onSubmit={handleSubmit}>
        <Grid
          container
          columns={12}
          spacing={2}
          sx={formCssClass}
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Grid item xs={11}>
            <Typography variant="h5">Exportar Resultado</Typography>
          </Grid>
          <Grid item xs={1}>
            <IconButton onClick={closeModalForm}>
              <CloseIcon />
            </IconButton>
          </Grid>
          <Grid item xs={12}>
            <Divider />
          </Grid>

          <Grid item xs={12}>
            <FormControl>
              <FormLabel>Formato</FormLabel>
              <RadioGroup
                row
                name="formato"
                value={values.formato}
                onChange={handleInputChange}
              >
                <FormControlLabel
                  value={1}
                  control={<Radio />}
                  label="Base de Dados"
                />
                <FormControlLabel
                  value={2}
                  control={<Radio />}
                  label="Agenda"
                />
              </RadioGroup>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControl>
              <FormLabel>Busca</FormLabel>
              <RadioGroup
                row
                name="filtro"
                value={values.filtro}
                onChange={handleInputChange}
              >
                <FormControlLabel value={1} control={<Radio />} label="Todos" />
                <FormControlLabel
                  value={2}
                  control={<Radio />}
                  label="Somente buscados"
                />
              </RadioGroup>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControl>
              <FormLabel>Campos</FormLabel>
              <RadioGroup
                row
                name="camposSelecionados"
                value={values.camposSelecionados}
                onChange={handleInputChange}
              >
                <FormControlLabel value={1} control={<Radio />} label="Todos" />
                <FormControlLabel
                  value={2}
                  control={<Radio />}
                  label="Somente campos selecionados"
                />
              </RadioGroup>
            </FormControl>
          </Grid>
          <Grid item xs={12}></Grid>
          <Grid item xs={12} sx={{ marginY: 2 }}>
            <Button
              variant="outlined"
              size="large"
              color="primary"
              onClick={resetForm}
              sx={{ marginRight: 2 }}
            >
              Resetar
            </Button>
            <Button
              variant="contained"
              type="submit"
              size="large"
              color="secondary"
            >
              Baixar
            </Button>
          </Grid>
        </Grid>
      </Box>
    </>
  );
};

export default ExportarResultadoForm;
