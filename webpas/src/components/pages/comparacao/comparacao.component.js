import React, { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import PageHeader from "../../re-usable/page-header.component";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import {
  Paper,
  Typography,
  Grid,
  Box,
  Alert,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Divider,
  LinearProgress,
  TextField,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  InputAdornment,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SearchIcon from "@mui/icons-material/Search";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorIcon from "@mui/icons-material/Error";
import InfoIcon from "@mui/icons-material/Info";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

// ============================================================
// HELPERS: normalização flexível de headers e valores
// ============================================================

const normalizeHeader = (h) =>
  String(h || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

const findCol = (headers, ...aliases) => {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const target = normalizeHeader(alias);
    const idx = normalized.indexOf(target);
    if (idx >= 0) return headers[idx];
  }
  // fallback: partial match
  for (const alias of aliases) {
    const target = normalizeHeader(alias);
    const idx = normalized.findIndex((h) => h.includes(target));
    if (idx >= 0) return headers[idx];
  }
  return null;
};

const clean = (v) =>
  String(v ?? "")
    .trim()
    .replace(/^['"]|['"]$/g, "");

const extractBuilding = (salaStr) => {
  const s = clean(salaStr);
  // "AT10 Sala 233" → "AT10"
  // "AT05.Pr Sala 108" → "AT05.Pr"
  const match = s.match(/^(AT\d+[^\s]*)/i);
  return match ? match[1].toUpperCase() : s.split(" ")[0].toUpperCase();
};

const baseBuilding = (predio) => {
  // "AT05.Pr" → "AT05", "AT02 (T)" → "AT02", "AT07" → "AT07"
  const s = clean(predio).toUpperCase();
  const match = s.match(/^(AT\d+)/i);
  return match ? match[1] : s;
};

// ============================================================
// INFO EXTRAS: parser da aba "Info" para classificar turmas filtradas
// Retorna map { horario_id: { cred, alocado, continua, nome, turma, dia, hIni } }
// ============================================================

const parseInfoExtras = (workbook) => {
  const infoSheetName = workbook.SheetNames.find(
    (n) => normalizeHeader(n) === "info",
  );
  if (!infoSheetName) return null;
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[infoSheetName], { defval: "" });
  if (rows.length === 0) return null;

  const headers = Object.keys(rows[0]);
  const colId = findCol(headers, "ID", "id_horario", "idhorario");
  const colCred = findCol(headers, "cred. Aula", "cred_aula", "credaula");
  const colAlocado = findCol(headers, "alocado", "alocado_chefia");
  const colContinua = findCol(headers, "Continua", "continua");
  const colNome = findCol(headers, "nome discip", "nome_disciplina", "disciplina");
  const colTurma = findCol(headers, "turma", "letra_turma");
  const colDia = findCol(headers, "dia semana", "dia_da_semana", "dia");
  const colHini = findCol(headers, "H. ini", "hora_inicio", "horario_inicio");
  if (!colId) return null;

  const result = {};
  rows.forEach((r) => {
    const id = clean(r[colId]);
    if (!id || id === "0") return;
    result[id] = {
      cred: Number(r[colCred] || 0),
      alocado: String(r[colAlocado] || "").toLowerCase().trim(),
      continua: String(r[colContinua] || "").toLowerCase().trim(),
      nome: clean(r[colNome]),
      turma: clean(r[colTurma]),
      dia: clean(r[colDia]),
      hIni: clean(r[colHini]),
    };
  });
  return result;
};

// Classifica o motivo de uma turma "fantasma" (solicitação sem alocação)
const classifyFantasma = (id, infoExtras, solicitacoes, manualRows) => {
  const info = infoExtras ? infoExtras[id] : null;
  if (!info) return { reason: "id_inexistente", label: "ID não existe na planilha manual" };

  if (info.continua === "junto") {
    return { reason: "f12_pair", label: "F12-pair (segundo slot absorvido)" };
  }
  if (info.alocado === "t") {
    return { reason: "alocado_chefia", label: "Alocada pela chefia (pré-alocada)" };
  }
  if (info.cred <= 0) {
    return { reason: "cred_zero", label: "cred_aula = 0 (filtrada pelo solver)" };
  }
  return { reason: "outro", label: "Motivo desconhecido (verificar manualmente)" };
};

// ============================================================
// SOLICITAÇÕES: parser das abas "Acessibilidade" e "Recursos"
// Retorna map { horario_id: tipo } onde tipo ∈ { "terreo", "prancheta" }
// ============================================================

const parseSolicitacoesSheets = (workbook) => {
  const result = {};
  const getSheet = (name) =>
    workbook.SheetNames.find((n) => normalizeHeader(n) === normalizeHeader(name));

  const acessName = getSheet("Acessibilidade");
  if (acessName) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[acessName], { defval: "" });
    rows.forEach((r) => {
      const id = clean(r.Id_disciplina || r["Id_disciplina"] || r.ID || "");
      if (id && id !== "0") result[id] = "terreo";
    });
  }

  const recName = getSheet("Recursos");
  if (recName) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[recName], { defval: "" });
    rows.forEach((r) => {
      const id = clean(r.Id_disciplina || r["Id_disciplina"] || r.ID || "");
      if (id && id !== "0") result[id] = "prancheta";
    });
  }

  return Object.keys(result).length > 0 ? result : null;
};

// Verifica se a sala (nome do prédio) atende a solicitação
const salaAtendeSolicitacao = (predio, tipo) => {
  const p = (predio || "").toUpperCase();
  if (tipo === "terreo") return p.includes("(T)");
  if (tipo === "prancheta") return p.includes(".PR");
  if (tipo === "qv") return p.includes(".QV") || p.includes("(QV)");
  if (tipo === "qb") return p.includes(".QB") || p.includes("(QB)");
  if (tipo === "lab") return p.includes("(LAB)");
  return true;
};

// ============================================================
// DISTÂNCIAS: parser da aba "Dist" do arquivo manual
// ============================================================

const parseDistSheet = (workbook) => {
  const distSheetName = workbook.SheetNames.find(
    (n) => normalizeHeader(n) === "dist" || normalizeHeader(n) === "distancias",
  );
  if (!distSheetName) return null;

  const sheet = workbook.Sheets[distSheetName];
  if (!sheet || !sheet["!ref"]) return null;

  const range = XLSX.utils.decode_range(sheet["!ref"]);

  // Row 1: department headers from col 3+
  const depts = [];
  for (let c = 3; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 1, c })];
    if (!cell || !cell.v) break;
    depts.push({ col: c, name: String(cell.v).trim().toUpperCase() });
  }

  // Col 2: building names from row 2+, distances in intersections
  const distances = {};
  const seenBuildings = new Set();
  for (let r = 2; r <= range.e.r; r++) {
    const bc = sheet[XLSX.utils.encode_cell({ r, c: 2 })];
    if (!bc || !bc.v) continue;
    const building = String(bc.v).trim().toUpperCase();
    if (seenBuildings.has(building)) continue;
    seenBuildings.add(building);

    distances[building] = {};
    for (const dept of depts) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c: dept.col })];
      if (cell && typeof cell.v === "number") {
        distances[building][dept.name] = cell.v;
      }
    }
  }

  return Object.keys(distances).length > 0 ? distances : null;
};

// Busca a distância para um depto, com fallback para match parcial
const lookupDist = (distances, building, depto) => {
  if (!distances || !building || !depto) return null;
  const b = building.toUpperCase();
  const d = depto.toUpperCase().trim();

  // Tenta prédio exato
  const tryDepts = (predioKey) => {
    const row = distances[predioKey];
    if (!row) return null;
    // Match exato
    if (row[d] !== undefined) return row[d];
    // Depto pode ter prefixo (ex: "Esp-Sul-DPsi" → tenta "DPSI")
    const parts = d.split(/[-_]/);
    for (let i = parts.length - 1; i >= 0; i--) {
      const candidate = parts[i];
      if (row[candidate] !== undefined) return row[candidate];
    }
    // Match parcial
    for (const key of Object.keys(row)) {
      if (d.includes(key) || key.includes(d)) return row[key];
    }
    return null;
  };

  // Tenta prédio exato, depois prédio-base
  let dist = tryDepts(b);
  if (dist !== null) return dist;
  const bBase = baseBuilding(b);
  if (bBase !== b) dist = tryDepts(bBase);
  return dist;
};

// ============================================================
// PARSING: lê Excel e detecta colunas automaticamente
// ============================================================

// --- Parser para formato PIVÔ (aba "Resultados" da planilha manual) ---
// Estrutura: Row 0 = timeslot headers ("SEGUNDA-FEIRA 8H", …) a cada 10 colunas
//            Row 1 = sub-headers repetidos (AT, SALA, CÓDIGO, TURMA, DISCIPLINA, PROFESSOR, DPTO, PERÍODO, ID, OCUPA)
//            Rows 2+ = dados, uma linha por sala
const PIVOT_SUBCOLS = { AT: 0, SALA: 1, CODIGO: 2, TURMA: 3, DISCIPLINA: 4, PROFESSOR: 5, DPTO: 6, PERIODO: 7, ID: 8, OCUPA: 9 };
const PIVOT_GROUP_SIZE = 10;

const parseDayHour = (header) => {
  // "SEGUNDA-FEIRA 8H" → { dia: "Segunda", hIni: "800" }
  const h = (header || "").trim().toUpperCase();
  const dayMap = {
    "SEGUNDA": "Segunda", "TERCA": "Terça", "QUARTA": "Quarta",
    "QUINTA": "Quinta", "SEXTA": "Sexta", "SABADO": "Sábado", "DOMINGO": "Domingo",
  };
  let dia = "";
  for (const [key, val] of Object.entries(dayMap)) {
    if (h.includes(key)) { dia = val; break; }
  }
  const hourMatch = h.match(/(\d+)\s*H/);
  const hIni = hourMatch ? String(Number(hourMatch[1]) * 100) : "";
  return { dia, hIni };
};

const isPivotSheet = (workbook, sheetName) => {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet || !sheet["!ref"]) return false;
  // Check row 1 (0-indexed) for "AT" in cell A2 and "SALA" in cell B2
  const cellA1 = sheet[XLSX.utils.encode_cell({ r: 1, c: 0 })];
  const cellB1 = sheet[XLSX.utils.encode_cell({ r: 1, c: 1 })];
  if (!cellA1 || !cellB1) return false;
  const a = normalizeHeader(cellA1.v);
  const b = normalizeHeader(cellB1.v);
  return a === "at" && b === "sala";
};

const parsePivotSheet = (workbook, sheetName) => {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { rows: [], error: `Aba "${sheetName}" não encontrada.` };

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const totalCols = range.e.c + 1;
  const totalRows = range.e.r + 1;

  // 1) Extrair timeslot headers de Row 0
  const timeslots = [];
  for (let c = 0; c < totalCols; c += PIVOT_GROUP_SIZE) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c })];
    if (cell && cell.v) {
      timeslots.push({ col: c, ...parseDayHour(cell.v) });
    }
  }
  if (timeslots.length === 0)
    return { rows: [], error: "Não foi possível detectar os timeslots na aba pivô." };

  // 2) Extrair alocações de Rows 2+
  const byId = {};
  for (let r = 2; r < totalRows; r++) {
    for (const ts of timeslots) {
      const idCell = sheet[XLSX.utils.encode_cell({ r, c: ts.col + PIVOT_SUBCOLS.ID })];
      if (!idCell || !idCell.v) continue;
      const id = String(idCell.v).trim();
      if (!id || id === "0") continue;

      // Se já vimos este ID, pular (pivot repete para slots de 4h)
      if (byId[id]) continue;

      const getVal = (offset) => {
        const cell = sheet[XLSX.utils.encode_cell({ r, c: ts.col + offset })];
        return cell ? clean(String(cell.v)) : "";
      };

      const at = getVal(PIVOT_SUBCOLS.AT);
      const sala = getVal(PIVOT_SUBCOLS.SALA);
      const salaCompleta = at && sala ? `${at} ${sala}` : at || sala;

      byId[id] = {
        id,
        sala: salaCompleta,
        predio: at ? at.toUpperCase() : extractBuilding(salaCompleta),
        predioBase: baseBuilding(at || salaCompleta),
        nome: getVal(PIVOT_SUBCOLS.DISCIPLINA),
        cod: getVal(PIVOT_SUBCOLS.CODIGO),
        turma: getVal(PIVOT_SUBCOLS.TURMA),
        dia: ts.dia,
        hIni: ts.hIni,
        hFim: "",
        depto: getVal(PIVOT_SUBCOLS.DPTO),
        deptoOferta: "",
        total: "",
        docente: getVal(PIVOT_SUBCOLS.PROFESSOR),
        alocado: "",
      };
    }
  }

  return { rows: Object.values(byId), error: null };
};

// --- Parser para formato tabular (aba "Info" ou qualquer aba com colunas tradicionais) ---
const parseTabularSheet = (workbook, sheetName) => {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { rows: [], error: `Aba "${sheetName}" não encontrada.` };

  const raw = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  if (raw.length === 0) return { rows: [], error: "Aba vazia." };

  const headers = Object.keys(raw[0]);

  const colId = findCol(headers, "ID", "id_horario", "idhorario", "horario_id");
  const colSala = findCol(headers, "Sala", "sala_alocada", "sala alocada");
  const colNome = findCol(
    headers, "nome discip", "nome disciplina", "nomedisciplina",
    "nome_discip", "disciplina",
  );
  const colCod = findCol(
    headers, "cod discip", "coddiscip", "cod_discip",
    "codigo_disciplina", "codDisciplina",
  );
  const colTurma = findCol(headers, "turma", "letra_turma");
  const colDia = findCol(headers, "dia semana", "dia_da_semana", "dia");
  const colHini = findCol(headers, "H. ini", "hora_inicio", "horario_inicio", "hini");
  const colHfim = findCol(headers, "Hora fim", "hora_fim", "horario_fim", "hfim");
  const colDepto = findCol(
    headers, "Depto Turma", "departamento_turma", "depto turma", "departamento",
  );
  const colDeptoOferta = findCol(
    headers, "Depto Oferta", "departamento_oferta", "depto oferta",
  );
  const colTotal = findCol(
    headers, "total turma", "total_turma", "total deferidos", "numero_vagas",
  );
  const colDocente = findCol(headers, "docente", "docentes", "ministrantes");
  const colAlocado = findCol(headers, "alocado", "alocado_chefia");

  if (!colId)
    return { rows: [], error: "Coluna de ID não encontrada. Verifique se a aba correta foi selecionada (ex: 'Info' para formato tabular, 'Resultados' para formato pivô)." };

  const rows = raw
    .filter((r) => {
      const id = clean(r[colId]);
      return id && id !== "" && id !== "0";
    })
    .map((r) => {
      const salaRaw = colSala ? clean(r[colSala]) : "";
      return {
        id: clean(r[colId]),
        sala: salaRaw,
        predio: salaRaw ? extractBuilding(salaRaw) : "",
        predioBase: salaRaw ? baseBuilding(extractBuilding(salaRaw)) : "",
        nome: colNome ? clean(r[colNome]) : "",
        cod: colCod ? clean(r[colCod]) : "",
        turma: colTurma ? clean(r[colTurma]) : "",
        dia: colDia ? clean(r[colDia]) : "",
        hIni: colHini ? clean(r[colHini]) : "",
        hFim: colHfim ? clean(r[colHfim]) : "",
        depto: colDepto ? clean(r[colDepto]) : "",
        deptoOferta: colDeptoOferta ? clean(r[colDeptoOferta]) : "",
        total: colTotal ? clean(r[colTotal]) : "",
        docente: colDocente ? clean(r[colDocente]) : "",
        alocado: colAlocado ? clean(r[colAlocado]).toLowerCase() : "",
      };
    });

  return { rows, error: null, headers };
};

// --- Função principal: detecta formato e despacha ---
const parseManualFile = (workbook, sheetName) => {
  if (isPivotSheet(workbook, sheetName)) {
    return parsePivotSheet(workbook, sheetName);
  }
  return parseTabularSheet(workbook, sheetName);
};

const parseSiteFile = (workbook, sheetName) => {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { rows: [], error: `Aba "${sheetName}" não encontrada.` };

  const raw = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  if (raw.length === 0) return { rows: [], error: "Aba vazia." };

  const headers = Object.keys(raw[0]);

  const colId = findCol(
    headers,
    "ID Horário",
    "ID Horario",
    "idhorario",
    "id_horario",
    "horario_id",
    "ID",
  );
  const colPredio = findCol(headers, "Predio", "prédio", "predio");
  const colSala = findCol(headers, "Sala", "sala");
  const colNome = findCol(
    headers,
    "Nome da Disciplina",
    "nomedadisciplina",
    "nome_disciplina",
    "disciplina",
  );
  const colCod = findCol(
    headers,
    "codDisciplina",
    "cod_disciplina",
    "codigo_disciplina",
  );
  const colTurma = findCol(headers, "Turma", "turma");
  const colDia = findCol(headers, "Dia", "dia_da_semana");
  const colHini = findCol(
    headers,
    "Horário de Início",
    "Horario de Inicio",
    "horario_inicio",
    "hora_inicio",
  );
  const colHfim = findCol(
    headers,
    "Horário de Término",
    "Horario de Termino",
    "horario_fim",
    "hora_fim",
  );
  const colDepto = findCol(
    headers,
    "Departamento Recomendado",
    "departamento_turma",
    "depto turma",
  );
  const colDeptoOferta = findCol(
    headers,
    "Departamento de Oferta",
    "departamento_oferta",
  );
  const colTotal = findCol(
    headers,
    "Número de Alunos",
    "numero_alunos",
    "total_turma",
  );
  const colDocente = findCol(headers, "Docentes", "docente", "ministrantes");
  const colCap = findCol(headers, "Capacidade", "capacidade");

  if (!colId)
    return {
      rows: [],
      error: "Coluna de ID não encontrada no arquivo do site.",
    };

  // Agrupa por ID (site pode ter várias linhas por turma por slot)
  const groupById = {};
  raw.forEach((r) => {
    const id = clean(r[colId]);
    if (!id || id === "" || id === "0") return;
    if (!groupById[id]) {
      const predioRaw = colPredio ? clean(r[colPredio]) : "";
      const salaRaw = colSala ? clean(r[colSala]) : "";
      groupById[id] = {
        id,
        predio: predioRaw.toUpperCase(),
        predioBase: baseBuilding(predioRaw),
        sala: salaRaw,
        salaCompleta: predioRaw ? `${predioRaw} ${salaRaw}` : salaRaw,
        nome: colNome ? clean(r[colNome]) : "",
        cod: colCod ? clean(r[colCod]) : "",
        turma: colTurma ? clean(r[colTurma]) : "",
        dia: colDia ? clean(r[colDia]) : "",
        hIni: colHini ? clean(r[colHini]) : "",
        hFim: colHfim ? clean(r[colHfim]) : "",
        depto: colDepto ? clean(r[colDepto]) : "",
        deptoOferta: colDeptoOferta ? clean(r[colDeptoOferta]) : "",
        total: colTotal ? clean(r[colTotal]) : "",
        docente: colDocente ? clean(r[colDocente]) : "",
        capacidade: colCap ? clean(r[colCap]) : "",
      };
    }
  });

  return { rows: Object.values(groupById), error: null, headers };
};

// ============================================================
// COMPARAÇÃO
// ============================================================

const STATUS = {
  IDENTICAL: "identical",
  SAME_BUILDING: "same_building",
  COMPATIBLE: "compatible",
  DIST_OK: "dist_ok",
  ATTENTION: "attention",
  ONLY_MANUAL: "only_manual",
  ONLY_SITE: "only_site",
  NO_ROOM_MANUAL: "no_room_manual",
};

// Pontuação para o score de validação (0-100)
const SCORE_MAP = {
  [STATUS.IDENTICAL]: 100,
  [STATUS.SAME_BUILDING]: 95,
  [STATUS.COMPATIBLE]: 88,
  [STATUS.DIST_OK]: 78,
  [STATUS.ATTENTION]: 30,
};

const statusConfig = {
  [STATUS.IDENTICAL]: {
    label: "Idêntico",
    color: "success",
    icon: <CheckCircleIcon fontSize="small" />,
    description: "Mesma sala e prédio",
  },
  [STATUS.SAME_BUILDING]: {
    label: "Mesmo Prédio",
    color: "success",
    icon: <CheckCircleIcon fontSize="small" />,
    description: "Mesmo prédio, sala diferente",
  },
  [STATUS.COMPATIBLE]: {
    label: "Compatível",
    color: "info",
    icon: <InfoIcon fontSize="small" />,
    description: "Prédio diferente, mas mesmo prédio-base (ex: AT05 e AT05.Pr)",
  },
  [STATUS.DIST_OK]: {
    label: "Dist. OK",
    color: "info",
    icon: <CheckCircleIcon fontSize="small" />,
    description: "Prédio diferente, mas a distância ao departamento é aceitável",
  },
  [STATUS.ATTENTION]: {
    label: "Atenção",
    color: "warning",
    icon: <WarningIcon fontSize="small" />,
    description: "Prédio diferente com distância significativamente maior ao departamento",
  },
  [STATUS.ONLY_MANUAL]: {
    label: "Só Manual",
    color: "default",
    icon: <HelpOutlineIcon fontSize="small" />,
    description: "Turma existe apenas no resultado manual",
  },
  [STATUS.ONLY_SITE]: {
    label: "Só Site",
    color: "default",
    icon: <HelpOutlineIcon fontSize="small" />,
    description: "Turma existe apenas no resultado do site",
  },
  [STATUS.NO_ROOM_MANUAL]: {
    label: "Sem Sala (Manual)",
    color: "default",
    icon: <HelpOutlineIcon fontSize="small" />,
    description: "Turma sem sala alocada no resultado manual",
  },
};

const compareResults = (manualRows, siteRows, distances, solicitacoes, infoExtras) => {
  const manualMap = {};
  manualRows.forEach((r) => {
    manualMap[r.id] = r;
  });

  const siteMap = {};
  siteRows.forEach((r) => {
    siteMap[r.id] = r;
  });

  const allIds = new Set([
    ...Object.keys(manualMap),
    ...Object.keys(siteMap),
  ]);

  const results = [];

  allIds.forEach((id) => {
    const manual = manualMap[id];
    const site = siteMap[id];

    if (!site) {
      // Turma só existe no manual
      if (manual.alocado === "t") return; // alocado pela chefia, ignorar

      // Verifica se é par F12 (segundo slot absorvido pelo stitching do solver)
      // Mesmo cod+turma+dia existe no site com ID diferente → turma foi alocada via F12
      const isF12pair = siteRows.some(
        (s) =>
          s.cod === manual.cod &&
          s.turma === manual.turma &&
          s.dia === manual.dia &&
          s.id !== id,
      );
      if (isF12pair) return; // turma alocada, só o ID do 2º slot não aparece no export

      const solOm = solicitacoes ? solicitacoes[id] : null;
      results.push({
        id,
        status: STATUS.ONLY_MANUAL,
        manual,
        site: null,
        nome: manual.nome,
        cod: manual.cod,
        turma: manual.turma,
        depto: manual.depto || manual.deptoOferta,
        dia: manual.dia,
        hIni: manual.hIni,
        salaManual: manual.sala,
        salaSite: "",
        predioManual: manual.predio,
        predioSite: "",
        nota: "Turma presente apenas no resultado manual.",
        solicitacao: solOm,
        solicitacaoAtendida: null, // sem sala do site pra validar
      });
      return;
    }

    if (!manual) {
      const solOs = solicitacoes ? solicitacoes[id] : null;
      results.push({
        id,
        status: STATUS.ONLY_SITE,
        manual: null,
        site,
        nome: site.nome,
        cod: site.cod,
        turma: site.turma,
        depto: site.depto || site.deptoOferta,
        dia: site.dia,
        hIni: site.hIni,
        salaManual: "",
        salaSite: site.salaCompleta,
        predioManual: "",
        predioSite: site.predio,
        nota: "Turma presente apenas no resultado do site.",
        solicitacao: solOs,
        solicitacaoAtendida: solOs ? salaAtendeSolicitacao(site.predio, solOs) : null,
      });
      return;
    }

    // Ambos existem
    const nome = manual.nome || site.nome;
    const cod = manual.cod || site.cod;
    const turma = manual.turma || site.turma;
    const depto = manual.depto || site.depto || manual.deptoOferta || site.deptoOferta;

    if (!manual.sala || manual.sala === "") {
      const solNr = solicitacoes ? solicitacoes[id] : null;
      results.push({
        id,
        status: STATUS.NO_ROOM_MANUAL,
        manual,
        site,
        nome,
        cod,
        turma,
        depto,
        dia: manual.dia || site.dia,
        hIni: manual.hIni || site.hIni,
        salaManual: "(sem sala)",
        salaSite: site.salaCompleta,
        predioManual: "",
        predioSite: site.predio,
        nota: "Manual não alocou sala para esta turma. O site alocou.",
        solicitacao: solNr,
        solicitacaoAtendida: solNr ? salaAtendeSolicitacao(site.predio, solNr) : null,
      });
      return;
    }

    const salaManualNorm = manual.sala.toUpperCase().replace(/\s+/g, " ");
    const salaSiteNorm = site.salaCompleta.toUpperCase().replace(/\s+/g, " ");

    // Comparação
    let status;
    let nota = "";

    if (salaManualNorm === salaSiteNorm) {
      status = STATUS.IDENTICAL;
      nota = "Alocação idêntica.";
    } else if (manual.predioBase === site.predioBase) {
      if (manual.predio === site.predio) {
        status = STATUS.SAME_BUILDING;
        nota = `Mesmo prédio (${manual.predio}), sala diferente.`;
      } else {
        status = STATUS.COMPATIBLE;
        nota = `Mesmo prédio-base (${manual.predioBase}). Manual: ${manual.predio}, Site: ${site.predio}.`;
      }
    } else {
      // Prédios diferentes — validar pela distância se disponível
      const distManual = lookupDist(distances, manual.predio, depto);
      const distSite = lookupDist(distances, site.predio, depto);

      if (distManual !== null && distSite !== null) {
        // Ambas distâncias são de "penalidade" (>= 2500) → sem dados úteis
        if (distManual >= 2500 && distSite >= 2500) {
          status = STATUS.DIST_OK;
          nota = `Prédios diferentes (Manual=${manual.predio}, Site=${site.predio}). Sem distância cadastrada para o depto ${depto} em ambos — provavelmente solicitação especial.`;
        } else if (distSite <= distManual * 2.5 && distSite < 2500) {
          status = STATUS.DIST_OK;
          nota = `Prédios diferentes, mas distância aceitável: Manual=${manual.predio} (dist ${distManual}), Site=${site.predio} (dist ${distSite}) para depto ${depto}.`;
        } else {
          status = STATUS.ATTENTION;
          nota = `Distância elevada: Manual=${manual.predio} (dist ${distManual}), Site=${site.predio} (dist ${distSite}) para depto ${depto}.`;
        }
      } else {
        // Sem dados de distância — manter como atenção genérica
        status = STATUS.ATTENTION;
        nota = `Prédios diferentes: Manual=${manual.predio}, Site=${site.predio}. Sem dados de distância para validar (depto ${depto}).`;
      }
    }

    // Validação de solicitação (se a turma tinha solicitação no manual)
    const solicitacao = solicitacoes ? solicitacoes[id] : null;
    let solicitacaoAtendida = null; // null = sem solicitação, true/false = atendida/não
    if (solicitacao) {
      solicitacaoAtendida = salaAtendeSolicitacao(site.predio, solicitacao);
    }

    results.push({
      id,
      status,
      manual,
      site,
      nome,
      cod,
      turma,
      depto,
      dia: manual.dia || site.dia,
      hIni: manual.hIni || site.hIni,
      salaManual: manual.sala,
      salaSite: site.salaCompleta,
      predioManual: manual.predio,
      predioSite: site.predio,
      nota,
      solicitacao,
      solicitacaoAtendida,
    });
  });

  // Solicitações "fantasma": IDs com solicitação que não estão em manual nem site
  // Ficam SEPARADAS do fluxo principal (não entram em `results`)
  const fantasmas = [];
  if (solicitacoes) {
    Object.keys(solicitacoes).forEach((id) => {
      if (!allIds.has(id)) {
        const info = infoExtras ? infoExtras[id] : null;
        const classification = classifyFantasma(id, infoExtras);
        fantasmas.push({
          id,
          solicitacao: solicitacoes[id],
          nome: info ? info.nome : "",
          turma: info ? info.turma : "",
          dia: info ? info.dia : "",
          hIni: info ? info.hIni : "",
          cred: info ? info.cred : null,
          alocado: info ? info.alocado : null,
          continua: info ? info.continua : null,
          reason: classification.reason,
          reasonLabel: classification.label,
        });
      }
    });
  }

  // Ordenar: atenção primeiro, depois dist_ok, depois compatível, depois iguais
  const order = {
    [STATUS.ATTENTION]: 0,
    [STATUS.ONLY_MANUAL]: 1,
    [STATUS.ONLY_SITE]: 2,
    [STATUS.DIST_OK]: 3,
    [STATUS.COMPATIBLE]: 4,
    [STATUS.SAME_BUILDING]: 5,
    [STATUS.NO_ROOM_MANUAL]: 6,
    [STATUS.IDENTICAL]: 7,
  };
  results.sort((a, b) => (order[a.status] ?? 99) - (order[b.status] ?? 99));

  // Calcular score de validação (0-100%)
  const scoreable = results.filter((r) => SCORE_MAP[r.status] !== undefined);
  const totalScore =
    scoreable.length > 0
      ? scoreable.reduce((sum, r) => sum + SCORE_MAP[r.status], 0) /
        scoreable.length
      : 0;

  // Estatísticas de solicitações (se houver). Fantasmas ficam fora do total principal.
  const comSolicitacao = results.filter((r) => r.solicitacao);
  const totalAplicadas = comSolicitacao.length + (solicitacoes ? 0 : 0);
  const solicitacaoStats = (comSolicitacao.length > 0 || (solicitacoes && Object.keys(solicitacoes).length > 0)) ? {
    total: comSolicitacao.length,
    totalAplicadas: solicitacoes ? Object.keys(solicitacoes).length : comSolicitacao.length,
    atendidas: comSolicitacao.filter((r) => r.solicitacaoAtendida === true).length,
    naoAtendidas: comSolicitacao.filter((r) => r.solicitacaoAtendida === false).length,
    semValidacao: comSolicitacao.filter((r) => r.solicitacaoAtendida === null).length,
    fantasmasCount: fantasmas.length,
    porTipo: comSolicitacao.reduce((acc, r) => {
      acc[r.solicitacao] = acc[r.solicitacao] || { total: 0, atendidas: 0 };
      acc[r.solicitacao].total++;
      if (r.solicitacaoAtendida) acc[r.solicitacao].atendidas++;
      return acc;
    }, {}),
  } : null;

  return {
    items: results,
    score: Math.round(totalScore * 10) / 10,
    solicitacaoStats,
    fantasmas,
  };
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

const Comparacao = () => {
  // --- Estado dos arquivos ---
  const [siteFile, setSiteFile] = useState(null);
  const [manualFile, setManualFile] = useState(null);
  const [siteWorkbook, setSiteWorkbook] = useState(null);
  const [manualWorkbook, setManualWorkbook] = useState(null);
  const [siteSheets, setSiteSheets] = useState([]);
  const [manualSheets, setManualSheets] = useState([]);
  const [siteSheet, setSiteSheet] = useState("");
  const [manualSheet, setManualSheet] = useState("");

  // --- Estado da comparação (persiste em sessionStorage para não perder ao mudar de aba) ---
  const [results, setResultsRaw] = useState(() => {
    try {
      const saved = sessionStorage.getItem("webpas_comparacao");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const setResults = (val) => {
    setResultsRaw(val);
    try {
      if (val) sessionStorage.setItem("webpas_comparacao", JSON.stringify(val));
      else sessionStorage.removeItem("webpas_comparacao");
    } catch { /* ignore quota errors */ }
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // --- Leitura de arquivo ---
  const handleFileRead = useCallback((file, setWb, setSheets, setSheet, setFileState) => {
    if (!file) return;
    setFileState(file);
    setResults(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: "array" });
        setWb(wb);
        setSheets(wb.SheetNames);

        // Auto-selecionar aba
        const names = wb.SheetNames;
        const infoSheet = names.find(
          (n) => normalizeHeader(n) === "info",
        );
        const resultSheet = names.find(
          (n) => normalizeHeader(n).includes("resultado"),
        );
        if (infoSheet) setSheet(infoSheet);
        else if (resultSheet) setSheet(resultSheet);
        else if (names.length === 1) setSheet(names[0]);
        else setSheet("");
      } catch (err) {
        setError(`Erro ao ler arquivo: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleSiteUpload = (e) => {
    const file = e.target.files[0];
    if (file)
      handleFileRead(
        file,
        setSiteWorkbook,
        setSiteSheets,
        setSiteSheet,
        setSiteFile,
      );
  };

  const handleManualUpload = (e) => {
    const file = e.target.files[0];
    if (file)
      handleFileRead(
        file,
        setManualWorkbook,
        setManualSheets,
        setManualSheet,
        setManualFile,
      );
  };

  // --- Comparação ---
  const handleCompare = () => {
    setError(null);
    if (!siteWorkbook || !manualWorkbook) {
      setError("Carregue ambos os arquivos antes de comparar.");
      return;
    }
    if (!siteSheet || !manualSheet) {
      setError("Selecione a aba de cada arquivo.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      try {
        const siteParsed = parseSiteFile(siteWorkbook, siteSheet);
        if (siteParsed.error) {
          setError(`Arquivo do Site: ${siteParsed.error}`);
          setLoading(false);
          return;
        }

        const manualParsed = parseManualFile(manualWorkbook, manualSheet);
        if (manualParsed.error) {
          setError(`Arquivo Manual: ${manualParsed.error}`);
          setLoading(false);
          return;
        }

        // Tenta extrair a matriz de distâncias do arquivo manual
        const distances = parseDistSheet(manualWorkbook);
        // Tenta extrair solicitações (Acessibilidade + Recursos) do arquivo manual
        const solicitacoes = parseSolicitacoesSheets(manualWorkbook);
        // Parseia a aba Info (se existir) para classificar turmas filtradas
        const infoExtras = parseInfoExtras(manualWorkbook);

        const compResults = compareResults(
          manualParsed.rows,
          siteParsed.rows,
          distances,
          solicitacoes,
          infoExtras,
        );
        setResults(compResults);
      } catch (err) {
        setError(`Erro na comparação: ${err.message}`);
      }
      setLoading(false);
    }, 50);
  };

  // --- Dados derivados ---
  const items = results ? results.items : [];
  const validationScore = results ? results.score : 0;
  const solicitacaoStats = results ? results.solicitacaoStats : null;
  const fantasmas = results ? (results.fantasmas || []) : [];

  const stats = results
    ? {
        total: items.length,
        identical: items.filter((r) => r.status === STATUS.IDENTICAL).length,
        sameBuilding: items.filter((r) => r.status === STATUS.SAME_BUILDING)
          .length,
        compatible: items.filter((r) => r.status === STATUS.COMPATIBLE).length,
        distOk: items.filter((r) => r.status === STATUS.DIST_OK).length,
        attention: items.filter((r) => r.status === STATUS.ATTENTION).length,
        onlyManual: items.filter((r) => r.status === STATUS.ONLY_MANUAL)
          .length,
        onlySite: items.filter((r) => r.status === STATUS.ONLY_SITE).length,
        noRoomManual: items.filter(
          (r) => r.status === STATUS.NO_ROOM_MANUAL,
        ).length,
      }
    : null;

  // --- Filtro ---
  const filteredResults = items
    ? items.filter((r) => {
        if (statusFilter !== "all" && r.status !== statusFilter) return false;
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          return (
            (r.nome || "").toLowerCase().includes(term) ||
            (r.cod || "").toLowerCase().includes(term) ||
            (r.id || "").toLowerCase().includes(term) ||
            (r.depto || "").toLowerCase().includes(term) ||
            (r.salaManual || "").toLowerCase().includes(term) ||
            (r.salaSite || "").toLowerCase().includes(term) ||
            (r.predioManual || "").toLowerCase().includes(term) ||
            (r.predioSite || "").toLowerCase().includes(term)
          );
        }
        return true;
      })
    : [];

  // --- Geração de PDF ---
  const generatePDF = () => {
    if (!stats || !items) return;

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    let y = margin;

    const addPageIfNeeded = (needed) => {
      if (y + needed > pageH - margin) {
        doc.addPage();
        y = margin;
      }
    };

    // --- CAPA ---
    doc.setFontSize(22);
    doc.setFont(undefined, "bold");
    doc.text("WebPAS - Relatório de Comparação", pageW / 2, y + 10, { align: "center" });
    y += 20;

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, pageW / 2, y, { align: "center" });
    y += 4;
    if (siteFile) doc.text(`Arquivo Site: ${siteFile.name}`, pageW / 2, y, { align: "center" });
    y += 4;
    if (manualFile) doc.text(`Arquivo Manual: ${manualFile.name}`, pageW / 2, y, { align: "center" });
    y += 12;
    doc.setTextColor(0);

    // --- SCORE ---
    const scoreColor = validationScore >= 75 ? [46, 125, 50] : validationScore >= 50 ? [237, 108, 2] : [211, 47, 47];
    doc.setFontSize(40);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...scoreColor);
    doc.text(`${validationScore}%`, pageW / 2, y + 8, { align: "center" });
    y += 14;
    doc.setFontSize(12);
    doc.text("Score de Validação", pageW / 2, y, { align: "center" });
    y += 8;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      validationScore >= 85
        ? "Excelente concordância entre os resultados."
        : validationScore >= 70
          ? "Boa concordância. Poucas diferenças significativas."
          : validationScore >= 50
            ? "Concordância moderada. Diferenças relevantes."
            : "Concordância baixa. Muitas diferenças.",
      pageW / 2, y, { align: "center" },
    );
    y += 10;
    doc.setTextColor(0);

    // --- RESUMO ---
    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.text("Resumo", margin, y);
    y += 7;

    const summaryData = [
      ["Idêntico", stats.identical, ((stats.identical / stats.total) * 100).toFixed(1) + "%", "100 pts"],
      ["Mesmo Prédio", stats.sameBuilding, ((stats.sameBuilding / stats.total) * 100).toFixed(1) + "%", "95 pts"],
      ["Compatível", stats.compatible, ((stats.compatible / stats.total) * 100).toFixed(1) + "%", "88 pts"],
      ["Dist. OK", stats.distOk, ((stats.distOk / stats.total) * 100).toFixed(1) + "%", "78 pts"],
      ["Atenção", stats.attention, ((stats.attention / stats.total) * 100).toFixed(1) + "%", "30 pts"],
      ["Só Manual", stats.onlyManual, "", "—"],
      ["Só Site", stats.onlySite, "", "—"],
      ["Sem Sala (Manual)", stats.noRoomManual, "", "—"],
      ["Total comparado", stats.total, "100%", ""],
    ];

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Categoria", "Qtd.", "%", "Pontuação"]],
      body: summaryData,
      theme: "grid",
      headStyles: { fillColor: [33, 33, 33], fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 1: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "center" } },
    });
    y = doc.lastAutoTable.finalY + 10;

    // --- AVISO ---
    addPageIfNeeded(12);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      "Obs: Solicitações de acessibilidade (térreo, prancheta, quadro, lab, região) não são consideradas. Diferenças podem ser esperadas.",
      margin, y,
    );
    y += 8;
    doc.setTextColor(0);

    // --- PONTOS DE ATENÇÃO ---
    const attentionItems = items.filter((r) => r.status === STATUS.ATTENTION);
    if (attentionItems.length > 0) {
      addPageIfNeeded(20);
      doc.setFontSize(13);
      doc.setFont(undefined, "bold");
      doc.text(`Pontos de Atenção (${attentionItems.length})`, margin, y);
      y += 6;

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["ID", "Disciplina", "Turma", "Depto", "Dia", "Hora", "Sala Manual", "Sala Site", "Observação"]],
        body: attentionItems.map((r) => [
          r.id, r.nome?.substring(0, 35), r.turma, r.depto, r.dia, r.hIni,
          r.salaManual, r.salaSite, r.nota?.substring(0, 50),
        ]),
        theme: "striped",
        headStyles: { fillColor: [237, 108, 2], fontSize: 7 },
        styles: { fontSize: 7, cellPadding: 1.5 },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // --- TABELA COMPLETA ---
    doc.addPage();
    y = margin;
    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.text("Detalhamento Completo", margin, y);
    y += 6;

    const allBody = items
      .filter((r) => SCORE_MAP[r.status] !== undefined)
      .map((r) => [
        statusConfig[r.status]?.label || r.status,
        r.id,
        r.nome?.substring(0, 30),
        r.turma,
        r.depto,
        r.dia,
        r.hIni,
        r.salaManual || "—",
        r.salaSite || "—",
        r.nota?.substring(0, 45),
      ]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Status", "ID", "Disciplina", "Turma", "Depto", "Dia", "Hora", "Sala Manual", "Sala Site", "Observação"]],
      body: allBody,
      theme: "striped",
      headStyles: { fillColor: [33, 33, 33], fontSize: 7 },
      styles: { fontSize: 6.5, cellPadding: 1.2, overflow: "ellipsize" },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 0) {
          const val = data.cell.raw;
          if (val === "Atenção") data.cell.styles.textColor = [237, 108, 2];
          else if (val === "Idêntico" || val === "Mesmo Prédio") data.cell.styles.textColor = [46, 125, 50];
          else if (val === "Dist. OK" || val === "Compatível") data.cell.styles.textColor = [2, 136, 209];
        }
      },
    });

    // --- Rodapé em todas as páginas ---
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`WebPAS - Relatório de Comparação | Página ${i} de ${totalPages}`, pageW / 2, pageH - 6, { align: "center" });
    }

    doc.save(`Comparacao_WebPAS_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <>
      <PageHeader
        title="Comparar Resultados"
        subtitle="Compare a alocação do site com a alocação manual"
        icon={<CompareArrowsIcon />}
      />

      {/* AVISOS */}
      <Alert severity="warning" sx={{ mb: 2 }}>
        <strong>Atenção:</strong> Solicitações especiais de acessibilidade (térreo,
        prancheta, quadro verde/branco, laboratório, região norte/sul) <strong>não
        são consideradas</strong> nesta comparação. Por isso, algumas diferenças
        entre os resultados são esperadas e podem ser perfeitamente válidas.
      </Alert>
      <Alert severity="info" sx={{ mb: 3 }}>
        A comparação é feita pelo <strong>ID do horário</strong> de cada turma.
        O sistema detecta automaticamente as colunas dos arquivos Excel, mas caso
        os cabeçalhos mudem significativamente, selecione a aba correta em cada
        arquivo. Turmas alocadas pela chefia (alocado = "t") no arquivo manual são
        ignoradas.
      </Alert>

      {/* UPLOAD */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight={500}>
          1. Carregar Arquivos
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                border: "2px dashed",
                borderColor: siteFile ? "success.main" : "grey.400",
                borderRadius: 2,
                p: 3,
                textAlign: "center",
                bgcolor: siteFile ? "success.50" : "grey.50",
              }}
            >
              <Typography variant="subtitle1" gutterBottom fontWeight={500}>
                Resultado do Site (WebPAS)
              </Typography>
              <Button
                variant="contained"
                component="label"
                startIcon={<UploadFileIcon />}
                sx={{ mb: 1 }}
              >
                {siteFile ? "Trocar Arquivo" : "Selecionar Arquivo"}
                <input
                  type="file"
                  hidden
                  accept=".xlsx,.xls,.xlsm,.csv"
                  onChange={handleSiteUpload}
                />
              </Button>
              {siteFile && (
                <Typography variant="caption" display="block" color="success.main">
                  {siteFile.name}
                </Typography>
              )}
              {siteSheets.length > 1 && (
                <TextField
                  select
                  label="Aba"
                  value={siteSheet}
                  onChange={(e) => setSiteSheet(e.target.value)}
                  size="small"
                  sx={{ mt: 1, minWidth: 200 }}
                >
                  {siteSheets.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                border: "2px dashed",
                borderColor: manualFile ? "success.main" : "grey.400",
                borderRadius: 2,
                p: 3,
                textAlign: "center",
                bgcolor: manualFile ? "success.50" : "grey.50",
              }}
            >
              <Typography variant="subtitle1" gutterBottom fontWeight={500}>
                Resultado Manual (Planilha do Alocador)
              </Typography>
              <Button
                variant="contained"
                component="label"
                startIcon={<UploadFileIcon />}
                sx={{ mb: 1 }}
              >
                {manualFile ? "Trocar Arquivo" : "Selecionar Arquivo"}
                <input
                  type="file"
                  hidden
                  accept=".xlsx,.xls,.xlsm,.csv"
                  onChange={handleManualUpload}
                />
              </Button>
              {manualFile && (
                <Typography variant="caption" display="block" color="success.main">
                  {manualFile.name}
                </Typography>
              )}
              {manualSheets.length > 1 && (
                <TextField
                  select
                  label="Aba"
                  value={manualSheet}
                  onChange={(e) => setManualSheet(e.target.value)}
                  size="small"
                  sx={{ mt: 1, minWidth: 200 }}
                >
                  {manualSheets.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Box>
          </Grid>
        </Grid>

        <Box textAlign="center" mt={3}>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            onClick={handleCompare}
            disabled={!siteWorkbook || !manualWorkbook || loading}
            startIcon={<CompareArrowsIcon />}
            sx={{ px: 6, py: 1.5, fontWeight: "bold" }}
          >
            {loading ? "Comparando..." : "Comparar"}
          </Button>
        </Box>
        {loading && <LinearProgress sx={{ mt: 2 }} />}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {/* RESULTADOS */}
      {stats && (
        <>
          {/* SCORE DE VALIDAÇÃO */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight={500}>
              2. Validação do Resultado
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                mb: 3,
                p: 3,
                borderRadius: 3,
                bgcolor:
                  validationScore >= 75
                    ? "success.50"
                    : validationScore >= 50
                      ? "warning.50"
                      : "error.50",
                border: "2px solid",
                borderColor:
                  validationScore >= 75
                    ? "success.main"
                    : validationScore >= 50
                      ? "warning.main"
                      : "error.main",
              }}
            >
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="h2"
                  fontWeight={800}
                  color={
                    validationScore >= 75
                      ? "success.main"
                      : validationScore >= 50
                        ? "warning.main"
                        : "error.main"
                  }
                >
                  {validationScore}%
                </Typography>
                <Typography variant="subtitle1" fontWeight={600}>
                  Score de Validação
                </Typography>
              </Box>
              <Box sx={{ maxWidth: 400 }}>
                <Typography variant="body2" color="text.secondary">
                  {validationScore >= 85
                    ? "Excelente concordância entre o resultado do site e a alocação manual. As diferenças encontradas são aceitáveis."
                    : validationScore >= 70
                      ? "Boa concordância. A maioria das alocações está em prédios adequados, com poucas diferenças significativas."
                      : validationScore >= 50
                        ? "Concordância moderada. Existem diferenças relevantes que merecem atenção."
                        : "Concordância baixa. Há muitas diferenças entre os resultados. Revise os pontos de atenção."}
                </Typography>
              </Box>
            </Box>

            {/* EXPLICAÇÃO DO SCORE */}
            <Accordion sx={{ mb: 3, boxShadow: "none", border: "1px solid #e0e0e0" }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "#fafafa" }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <InfoIcon color="action" fontSize="small" />
                  <Typography variant="body2" fontWeight={500}>
                    Como o score é calculado?
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary" paragraph>
                  O score é a média ponderada de todas as turmas comparáveis (excluindo "Só Manual", "Só Site" e "Sem Sala").
                  Cada turma recebe uma pontuação de acordo com o nível de concordância entre o resultado do site e o manual:
                </Typography>
                <Table size="small" sx={{ maxWidth: 450, mb: 2 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Categoria</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }} align="center">Pontos</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Significado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow><TableCell sx={{ fontSize: "0.75rem" }}>Idêntico</TableCell><TableCell align="center" sx={{ fontSize: "0.75rem" }}>100</TableCell><TableCell sx={{ fontSize: "0.75rem" }}>Mesma sala exata</TableCell></TableRow>
                    <TableRow><TableCell sx={{ fontSize: "0.75rem" }}>Mesmo Prédio</TableCell><TableCell align="center" sx={{ fontSize: "0.75rem" }}>95</TableCell><TableCell sx={{ fontSize: "0.75rem" }}>Mesmo prédio, sala diferente</TableCell></TableRow>
                    <TableRow><TableCell sx={{ fontSize: "0.75rem" }}>Compatível</TableCell><TableCell align="center" sx={{ fontSize: "0.75rem" }}>88</TableCell><TableCell sx={{ fontSize: "0.75rem" }}>Mesmo prédio-base (ex: AT05 e AT05.Pr)</TableCell></TableRow>
                    <TableRow><TableCell sx={{ fontSize: "0.75rem" }}>Dist. OK</TableCell><TableCell align="center" sx={{ fontSize: "0.75rem" }}>78</TableCell><TableCell sx={{ fontSize: "0.75rem" }}>Prédio diferente, mas distância aceitável</TableCell></TableRow>
                    <TableRow><TableCell sx={{ fontSize: "0.75rem" }}>Atenção</TableCell><TableCell align="center" sx={{ fontSize: "0.75rem" }}>30</TableCell><TableCell sx={{ fontSize: "0.75rem" }}>Distância significativamente maior</TableCell></TableRow>
                  </TableBody>
                </Table>
                <Typography variant="body2" color="text.secondary">
                  A validação por distância usa a aba "Dist" do arquivo manual. Se a distância
                  do prédio alocado pelo site ao departamento for até 2,5x a do manual, é considerada aceitável.
                </Typography>
              </AccordionDetails>
            </Accordion>

            {/* CARDS DE RESUMO — clicáveis para filtrar */}
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Clique em um card para filtrar a tabela abaixo:
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6} sm={4} md={2.4}>
                <StatCard label="Idêntico" value={stats.identical} color="success.main" pct={stats.total}
                  active={statusFilter === STATUS.IDENTICAL}
                  onClick={() => setStatusFilter(statusFilter === STATUS.IDENTICAL ? "all" : STATUS.IDENTICAL)} />
              </Grid>
              <Grid item xs={6} sm={4} md={2.4}>
                <StatCard label="Mesmo Prédio" value={stats.sameBuilding} color="success.main" pct={stats.total}
                  active={statusFilter === STATUS.SAME_BUILDING}
                  onClick={() => setStatusFilter(statusFilter === STATUS.SAME_BUILDING ? "all" : STATUS.SAME_BUILDING)} />
              </Grid>
              <Grid item xs={6} sm={4} md={2.4}>
                <StatCard label="Compatível" value={stats.compatible} color="info.main" pct={stats.total}
                  active={statusFilter === STATUS.COMPATIBLE}
                  onClick={() => setStatusFilter(statusFilter === STATUS.COMPATIBLE ? "all" : STATUS.COMPATIBLE)} />
              </Grid>
              <Grid item xs={6} sm={4} md={2.4}>
                <StatCard label="Dist. OK" value={stats.distOk} color="info.main" pct={stats.total}
                  active={statusFilter === STATUS.DIST_OK}
                  onClick={() => setStatusFilter(statusFilter === STATUS.DIST_OK ? "all" : STATUS.DIST_OK)} />
              </Grid>
              <Grid item xs={6} sm={4} md={2.4}>
                <StatCard label="Atenção" value={stats.attention} color="warning.main" pct={stats.total}
                  active={statusFilter === STATUS.ATTENTION}
                  onClick={() => setStatusFilter(statusFilter === STATUS.ATTENTION ? "all" : STATUS.ATTENTION)} />
              </Grid>
            </Grid>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6} sm={4} md={4}>
                <StatCard label="Só Manual" value={stats.onlyManual} color="text.secondary"
                  active={statusFilter === STATUS.ONLY_MANUAL}
                  onClick={() => setStatusFilter(statusFilter === STATUS.ONLY_MANUAL ? "all" : STATUS.ONLY_MANUAL)} />
              </Grid>
              <Grid item xs={6} sm={4} md={4}>
                <StatCard label="Só Site" value={stats.onlySite} color="text.secondary"
                  active={statusFilter === STATUS.ONLY_SITE}
                  onClick={() => setStatusFilter(statusFilter === STATUS.ONLY_SITE ? "all" : STATUS.ONLY_SITE)} />
              </Grid>
              <Grid item xs={6} sm={4} md={4}>
                <StatCard label="Sem Sala (Manual)" value={stats.noRoomManual} color="text.secondary"
                  active={statusFilter === STATUS.NO_ROOM_MANUAL}
                  onClick={() => setStatusFilter(statusFilter === STATUS.NO_ROOM_MANUAL ? "all" : STATUS.NO_ROOM_MANUAL)} />
              </Grid>
            </Grid>

            {stats.attention > 0 && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                <strong>{stats.attention} turma(s)</strong> foram alocadas em
                prédios com distância significativamente maior ao departamento.
              </Alert>
            )}
            {stats.distOk > 0 && (
              <Alert severity="info" sx={{ mb: 1 }}>
                <strong>{stats.distOk} turma(s)</strong> estão em prédios
                diferentes, mas a distância ao departamento é aceitável
                (validado pela matriz de distâncias).
              </Alert>
            )}

            {solicitacaoStats && (
              <Paper
                variant="outlined"
                sx={{ p: 2, mt: 2, mb: 1, bgcolor: "#f3e5f5" }}
              >
                <Typography
                  variant="subtitle1"
                  fontWeight={600}
                  sx={{ mb: 1 }}
                >
                  🔬 Validação de Solicitações (abas Acessibilidade + Recursos)
                </Typography>
                {solicitacaoStats.fantasmasCount > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                    {solicitacaoStats.totalAplicadas} solicitações aplicadas,{" "}
                    <strong>{solicitacaoStats.total}</strong> em turmas que aparecem nos resultados.{" "}
                    {solicitacaoStats.fantasmasCount} em turmas filtradas pelo solver — veja seção abaixo.
                  </Typography>
                )}
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <StatCard
                      label="Validadas"
                      value={solicitacaoStats.total}
                      color="text.primary"
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <StatCard
                      label="Atendidas"
                      value={solicitacaoStats.atendidas}
                      color="success.main"
                      pct={solicitacaoStats.total}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <StatCard
                      label="NÃO atendidas"
                      value={solicitacaoStats.naoAtendidas}
                      color="error.main"
                      pct={solicitacaoStats.total}
                    />
                  </Grid>
                  {solicitacaoStats.semValidacao > 0 && (
                    <Grid item xs={6} sm={3}>
                      <StatCard
                        label="Sem validação*"
                        value={solicitacaoStats.semValidacao}
                        color="text.secondary"
                        pct={solicitacaoStats.total}
                      />
                    </Grid>
                  )}
                </Grid>
                {solicitacaoStats.semValidacao > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                    * turmas com solicitação que não estão no resultado do site (ex: "Só Manual") — não é possível validar se atendidas
                  </Typography>
                )}
                {Object.entries(solicitacaoStats.porTipo).length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Por tipo:{" "}
                      {Object.entries(solicitacaoStats.porTipo)
                        .map(
                          ([tipo, s]) =>
                            `${tipo}: ${s.atendidas}/${s.total}`,
                        )
                        .join(" | ")}
                    </Typography>
                  </Box>
                )}
                {solicitacaoStats.naoAtendidas > 0 && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <strong>{solicitacaoStats.naoAtendidas}</strong>{" "}
                    turma(s) com solicitação NÃO foram alocadas em sala
                    adequada. Veja detalhes na tabela abaixo.
                  </Alert>
                )}

                {/* Accordion: Detalhes de todas as solicitações */}
                <Accordion defaultExpanded sx={{ mt: 2, boxShadow: "none", border: "1px solid #ce93d8" }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "#f3e5f5" }}>
                    <Typography variant="body2" fontWeight={600}>
                      Detalhes das solicitações e alocação do site ({items.filter((r) => r.solicitacao).length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    <TableContainer sx={{ maxHeight: 500 }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600, fontSize: "0.7rem", bgcolor: "#e1bee7", width: 40 }} align="center">#</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: "0.7rem", bgcolor: "#e1bee7" }}>ID</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: "0.7rem", bgcolor: "#e1bee7" }}>Disciplina</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: "0.7rem", bgcolor: "#e1bee7" }}>Turma</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: "0.7rem", bgcolor: "#e1bee7" }}>Dia/Hora</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: "0.7rem", bgcolor: "#e1bee7" }}>Solicitação</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: "0.7rem", bgcolor: "#e1bee7" }}>Sala Manual</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: "0.7rem", bgcolor: "#e1bee7" }}>Sala Site</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: "0.7rem", bgcolor: "#e1bee7" }} align="center">Atendida?</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {items
                            .filter((r) => r.solicitacao)
                            .sort((a, b) => {
                              // Ordem: não atendidas (false) > sem validação (null) > atendidas (true)
                              const order = (v) => (v === false ? 0 : v === null ? 1 : 2);
                              const oa = order(a.solicitacaoAtendida);
                              const ob = order(b.solicitacaoAtendida);
                              if (oa !== ob) return oa - ob;
                              return String(a.id).localeCompare(String(b.id));
                            })
                            .map((r, idx) => (
                              <TableRow
                                key={"sol-" + r.id}
                                sx={{
                                  bgcolor:
                                    r.solicitacaoAtendida === false
                                      ? "#ffebee"
                                      : r.solicitacaoAtendida === null
                                        ? "#fafafa"
                                        : "transparent",
                                }}
                              >
                                <TableCell align="center" sx={{ fontSize: "0.7rem", color: "text.secondary", fontWeight: 500 }}>
                                  {idx + 1}
                                </TableCell>
                                <TableCell sx={{ fontSize: "0.7rem", fontFamily: "monospace" }}>
                                  {r.id}
                                </TableCell>
                                <TableCell sx={{ fontSize: "0.7rem", maxWidth: 280 }}>
                                  <Tooltip title={r.nome || ""}>
                                    <span>{(r.nome || "").substring(0, 45)}</span>
                                  </Tooltip>
                                </TableCell>
                                <TableCell sx={{ fontSize: "0.7rem" }}>{r.turma}</TableCell>
                                <TableCell sx={{ fontSize: "0.7rem" }}>
                                  {r.dia} {r.hIni}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={r.solicitacao}
                                    size="small"
                                    color={r.solicitacao === "terreo" ? "success" : "warning"}
                                    sx={{ fontSize: "0.65rem", height: 20 }}
                                  />
                                </TableCell>
                                <TableCell sx={{ fontSize: "0.7rem" }}>
                                  {r.salaManual || "—"}
                                </TableCell>
                                <TableCell sx={{ fontSize: "0.7rem", fontWeight: r.solicitacaoAtendida ? 400 : 600 }}>
                                  {r.salaSite || "—"}
                                </TableCell>
                                <TableCell align="center">
                                  {r.solicitacaoAtendida === true ? (
                                    <CheckCircleIcon fontSize="small" sx={{ color: "success.main" }} />
                                  ) : r.solicitacaoAtendida === false ? (
                                    <ErrorIcon fontSize="small" sx={{ color: "error.main" }} />
                                  ) : (
                                    <Tooltip title="Turma não está no resultado do site — não validada">
                                      <HelpOutlineIcon fontSize="small" sx={{ color: "text.disabled" }} />
                                    </Tooltip>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionDetails>
                </Accordion>

                {/* Accordion separado: turmas filtradas pelo solver (fantasmas) */}
                {fantasmas.length > 0 && (() => {
                  const byReason = fantasmas.reduce((acc, f) => {
                    acc[f.reason] = acc[f.reason] || { label: f.reasonLabel, items: [] };
                    acc[f.reason].items.push(f);
                    return acc;
                  }, {});
                  return (
                    <Accordion sx={{ mt: 1, boxShadow: "none", border: "1px solid #ffb74d" }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "#fff3e0" }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <WarningIcon fontSize="small" sx={{ color: "warning.dark" }} />
                          <Typography variant="body2" fontWeight={600}>
                            {fantasmas.length} solicitaç{fantasmas.length === 1 ? "ão" : "ões"} em turmas filtradas pelo solver
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            (sem alocação no resultado)
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                          Estas solicitações foram aplicadas mas as turmas não aparecem nos resultados
                          por motivos das regras do solver (cred_aula=0, alocada pela chefia, F12-pair,
                          ID inexistente). Não é bug — é comportamento esperado.
                        </Typography>
                        {Object.entries(byReason).map(([reason, group]) => (
                          <Box key={reason} sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                              {group.label} ({group.items.length})
                            </Typography>
                            <TableContainer>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>ID</TableCell>
                                    <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Disciplina</TableCell>
                                    <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Turma</TableCell>
                                    <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Dia/Hora</TableCell>
                                    <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Solicitação</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {group.items.map((f) => (
                                    <TableRow key={"fan-" + f.id}>
                                      <TableCell sx={{ fontSize: "0.7rem", fontFamily: "monospace" }}>{f.id}</TableCell>
                                      <TableCell sx={{ fontSize: "0.7rem" }}>
                                        {(f.nome || "—").substring(0, 45)}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: "0.7rem" }}>{f.turma || "—"}</TableCell>
                                      <TableCell sx={{ fontSize: "0.7rem" }}>
                                        {f.dia ? `${f.dia} ${f.hIni}` : "—"}
                                      </TableCell>
                                      <TableCell>
                                        <Chip
                                          label={f.solicitacao}
                                          size="small"
                                          color={f.solicitacao === "terreo" ? "success" : "warning"}
                                          sx={{ fontSize: "0.65rem", height: 20 }}
                                        />
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Box>
                        ))}
                      </AccordionDetails>
                    </Accordion>
                  );
                })()}
              </Paper>
            )}

            <Box textAlign="center" mt={3}>
              <Button
                variant="contained"
                size="large"
                startIcon={<PictureAsPdfIcon />}
                onClick={generatePDF}
                sx={{ px: 5, py: 1.2, fontWeight: "bold" }}
              >
                Gerar Relatório PDF
              </Button>
            </Box>
          </Paper>

          {/* TABELA DETALHADA */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight={500}>
              3. Detalhes
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar por nome, código, ID, depto, prédio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Filtrar por status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">Todos ({stats.total})</MenuItem>
                  {Object.entries(statusConfig).map(([key, cfg]) => {
                    const count = items.filter(
                      (r) => r.status === key,
                    ).length;
                    if (count === 0) return null;
                    return (
                      <MenuItem key={key} value={key}>
                        {cfg.label} ({count})
                      </MenuItem>
                    );
                  })}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Exibindo {filteredResults.length} de {stats.total} turmas
                </Typography>
              </Grid>
            </Grid>

            {/* ACCORDION: Pontos de Atenção */}
            {stats.attention > 0 && statusFilter === "all" && (
              <Accordion defaultExpanded sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <WarningIcon color="warning" />
                    <Typography fontWeight={500}>
                      Pontos de Atenção ({stats.attention})
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {items
                    .filter((r) => r.status === STATUS.ATTENTION)
                    .map((r) => (
                      <Alert
                        key={r.id}
                        severity="warning"
                        sx={{ mb: 1, "& .MuiAlert-message": { width: "100%" } }}
                      >
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          flexWrap="wrap"
                          gap={1}
                        >
                          <Typography variant="body2" fontWeight={500}>
                            {r.nome} ({r.cod}-{r.turma}) — {r.dia} {r.hIni}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Depto: {r.depto}
                          </Typography>
                        </Box>
                        <Typography variant="caption">
                          Manual: <strong>{r.salaManual}</strong> | Site:{" "}
                          <strong>{r.salaSite}</strong>
                        </Typography>
                      </Alert>
                    ))}
                </AccordionDetails>
              </Accordion>
            )}

            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
                      Status
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
                      ID
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
                      Disciplina
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
                      Turma
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
                      Depto
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
                      Dia
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
                      Hora
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
                      Sala Manual
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
                      Sala Site
                    </TableCell>
                    {solicitacaoStats && (
                      <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
                        Solicitação
                      </TableCell>
                    )}
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
                      Observação
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredResults.slice(0, 500).map((r) => {
                    const cfg = statusConfig[r.status];
                    return (
                      <TableRow key={r.id} hover>
                        <TableCell>
                          <Tooltip title={cfg.description}>
                            <Chip
                              icon={cfg.icon}
                              label={cfg.label}
                              size="small"
                              color={cfg.color}
                              variant={
                                r.status === STATUS.ATTENTION
                                  ? "filled"
                                  : "outlined"
                              }
                              sx={{ fontSize: "0.65rem" }}
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.7rem" }}>{r.id}</TableCell>
                        <TableCell sx={{ fontSize: "0.7rem", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <Tooltip title={r.nome}>
                            <span>{r.nome}</span>
                          </Tooltip>
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.7rem" }}>{r.turma}</TableCell>
                        <TableCell sx={{ fontSize: "0.7rem" }}>{r.depto}</TableCell>
                        <TableCell sx={{ fontSize: "0.7rem" }}>{r.dia}</TableCell>
                        <TableCell sx={{ fontSize: "0.7rem" }}>{r.hIni}</TableCell>
                        <TableCell
                          sx={{
                            fontSize: "0.7rem",
                            fontWeight:
                              r.status === STATUS.ATTENTION ? 600 : 400,
                          }}
                        >
                          {r.salaManual || "—"}
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: "0.7rem",
                            fontWeight:
                              r.status === STATUS.ATTENTION ? 600 : 400,
                          }}
                        >
                          {r.salaSite || "—"}
                        </TableCell>
                        {solicitacaoStats && (
                          <TableCell sx={{ fontSize: "0.7rem" }}>
                            {r.solicitacao ? (
                              <Chip
                                label={
                                  r.solicitacaoAtendida
                                    ? `✓ ${r.solicitacao}`
                                    : `✗ ${r.solicitacao}`
                                }
                                size="small"
                                color={r.solicitacaoAtendida ? "success" : "error"}
                                sx={{ fontSize: "0.65rem", height: 20 }}
                              />
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                —
                              </Typography>
                            )}
                          </TableCell>
                        )}
                        <TableCell sx={{ fontSize: "0.65rem", color: "text.secondary", maxWidth: 250 }}>
                          {r.nota}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            {filteredResults.length > 500 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: "block" }}
              >
                Exibindo as primeiras 500 linhas. Use o filtro para refinar.
              </Typography>
            )}
          </Paper>
        </>
      )}
    </>
  );
};

// --- Card de estatística ---
const StatCard = ({ label, value, color, pct, onClick, active }) => (
  <Paper
    variant="outlined"
    onClick={onClick}
    sx={{
      p: 1.5,
      textAlign: "center",
      borderRadius: 2,
      cursor: onClick ? "pointer" : "default",
      borderColor: active ? color : undefined,
      borderWidth: active ? 2 : 1,
      bgcolor: active ? "action.hover" : "background.paper",
      transition: "all 0.15s",
      "&:hover": onClick
        ? { bgcolor: "action.hover", borderColor: color }
        : {},
    }}
  >
    <Typography variant="h5" fontWeight={700} color={color}>
      {value}
    </Typography>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    {pct !== undefined && pct > 0 && (
      <Typography variant="caption" display="block" color="text.secondary">
        {((value / pct) * 100).toFixed(1)}%
      </Typography>
    )}
  </Paper>
);

export default Comparacao;
