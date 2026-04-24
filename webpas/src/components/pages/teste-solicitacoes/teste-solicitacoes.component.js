import React, { useState } from "react";
import * as XLSX from "xlsx";
import http from "../../../http-commom";
import PageHeader from "../../re-usable/page-header.component";
import ScienceIcon from "@mui/icons-material/Science";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import {
  Paper,
  Typography,
  Grid,
  Box,
  Alert,
  Button,
  TextField,
  MenuItem,
  LinearProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  Divider,
} from "@mui/material";

// =========================================================================
// PÁGINA DE TESTE — pode ser removida depois
// Lê abas "Acessibilidade" e "Recursos" do Excel manual e aplica
// solicitações (terreo/prancheta) em lote nas turmas do banco.
// =========================================================================

const thisYear = new Date().getFullYear();

const TesteSolicitacoes = () => {
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null); // { terreo: [...], prancheta: [...] }
  const [ano, setAno] = useState(thisYear);
  const [semestre, setSemestre] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const out = { terreo: [], prancheta: [] };

        // Acessibilidade → terreo (ignora os campos Esp-Sul/Esp-Norte, só aplica terreo)
        const acess = wb.Sheets["Acessibilidade"];
        if (acess) {
          const rows = XLSX.utils.sheet_to_json(acess, { defval: "" });
          rows.forEach((r) => {
            const id = String(r.Id_disciplina || r["Id_disciplina"] || "").trim();
            if (id && id !== "0") {
              out.terreo.push({ horario_id: id, dept: String(r.Dept || "").trim() });
            }
          });
        }

        // Recursos → prancheta
        const rec = wb.Sheets["Recursos"];
        if (rec) {
          const rows = XLSX.utils.sheet_to_json(rec, { defval: "" });
          rows.forEach((r) => {
            const id = String(r.Id_disciplina || r["Id_disciplina"] || "").trim();
            if (id && id !== "0") {
              out.prancheta.push({ horario_id: id, dept: String(r.Dept || "").trim() });
            }
          });
        }

        if (out.terreo.length === 0 && out.prancheta.length === 0) {
          setError(
            "Nenhuma solicitação encontrada. Verifique se o arquivo contém as abas 'Acessibilidade' e/ou 'Recursos'.",
          );
          setParsed(null);
          return;
        }
        setParsed(out);
      } catch (err) {
        setError("Erro ao ler arquivo: " + err.message);
        setParsed(null);
      }
    };
    reader.readAsArrayBuffer(f);
  };

  const handleAplicar = async () => {
    if (!parsed) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const solicitacoes = [
      ...parsed.terreo.map((x) => ({ horario_id: x.horario_id, tipo: "terreo" })),
      ...parsed.prancheta.map((x) => ({ horario_id: x.horario_id, tipo: "prancheta" })),
    ];

    try {
      const res = await http.post("/turmas/teste/aplicar-solicitacoes-lote", {
        ano: Number(ano),
        semestre: Number(semestre),
        solicitacoes,
      });
      setResult({
        kind: "aplicar",
        ...res.data,
        total: solicitacoes.length,
      });
    } catch (err) {
      setError(
        "Erro ao aplicar: " +
          (err.response?.data?.msg || err.message || "desconhecido"),
      );
    }
    setLoading(false);
  };

  const handleLimpar = async () => {
    if (!window.confirm(
      `Limpar TODAS as solicitações de ${ano}/${semestre}? Esta ação define solicitacao=null em todas as turmas desse período.`,
    )) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await http.post("/turmas/teste/limpar-solicitacoes-lote", {
        ano: Number(ano),
        semestre: Number(semestre),
      });
      setResult({ kind: "limpar", ...res.data });
    } catch (err) {
      setError(
        "Erro ao limpar: " +
          (err.response?.data?.msg || err.message || "desconhecido"),
      );
    }
    setLoading(false);
  };

  return (
    <>
      <PageHeader
        title="TESTE: Aplicar Solicitações em Lote"
        subtitle="Lê as abas Acessibilidade e Recursos do Excel manual e aplica solicitações nas turmas do banco"
        icon={<ScienceIcon />}
      />

      <Alert severity="warning" sx={{ mb: 3 }}>
        <strong>⚠️ Página de TESTE.</strong> Esta funcionalidade escreve no banco
        de dados — aplica <code>solicitacao = "terreo"</code> nas turmas da aba{" "}
        <strong>Acessibilidade</strong> (ignora Esp-Norte/Esp-Sul, aplica só térreo)
        e <code>solicitacao = "prancheta"</code> nas turmas da aba{" "}
        <strong>Recursos</strong>. Use "Limpar" para reverter antes de outros testes.
      </Alert>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight={500}>
          1. Período e Arquivo
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
          <Grid item xs={6} sm={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Ano"
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
            >
              {[thisYear - 2, thisYear - 1, thisYear, thisYear + 1].map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="Semestre"
              value={semestre}
              onChange={(e) => setSemestre(Number(e.target.value))}
            >
              <MenuItem value={1}>1</MenuItem>
              <MenuItem value={2}>2</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              variant="contained"
              component="label"
              startIcon={<UploadFileIcon />}
              fullWidth
            >
              {file ? `Arquivo: ${file.name}` : "Selecionar Excel Manual"}
              <input
                type="file"
                hidden
                accept=".xlsx,.xls,.xlsm"
                onChange={handleFile}
              />
            </Button>
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {parsed && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Solicitações encontradas
              {(() => {
                const uniq = new Set([
                  ...parsed.terreo.map((x) => x.horario_id),
                  ...parsed.prancheta.map((x) => x.horario_id),
                ]);
                const totalLines = parsed.terreo.length + parsed.prancheta.length;
                return uniq.size !== totalLines ? (
                  <span style={{ color: "#ef6c00", fontWeight: 400 }}>
                    {" "}— {totalLines} linhas, <strong>{uniq.size} IDs únicos</strong> (há duplicatas nas abas)
                  </span>
                ) : null;
              })()}:
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: "#e8f5e9" }}>
                  <Typography variant="h5" fontWeight={700} color="success.main">
                    {parsed.terreo.length}
                  </Typography>
                  <Typography variant="body2">
                    Térreo (aba Acessibilidade)
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: "#fff3e0" }}>
                  <Typography variant="h5" fontWeight={700} color="warning.dark">
                    {parsed.prancheta.length}
                  </Typography>
                  <Typography variant="body2">
                    Prancheta (aba Recursos)
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight={500}>
          2. Ações
        </Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<PlayArrowIcon />}
            onClick={handleAplicar}
            disabled={!parsed || loading}
            size="large"
          >
            Aplicar Solicitações
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<ClearAllIcon />}
            onClick={handleLimpar}
            disabled={loading}
            size="large"
          >
            Limpar Todas (reverter)
          </Button>
        </Box>
        {loading && <LinearProgress sx={{ mt: 2 }} />}
      </Paper>

      {result && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom fontWeight={500}>
            3. Resultado
          </Typography>
          {result.kind === "aplicar" ? (
            <>
              <Alert severity={result.aplicadas > 0 ? "success" : "warning"} sx={{ mb: 2 }}>
                <strong>{result.aplicadas}</strong> de {result.total} solicitações
                aplicadas no banco.
                {result.naoEncontradas > 0 && (
                  <> {result.naoEncontradas} não encontradas (horário_id não existe no banco).</>
                )}
                {result.tipoInvalido > 0 && (
                  <> {result.tipoInvalido} com tipo inválido.</>
                )}
              </Alert>
              {result.detalhes?.naoEncontradas?.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 2 }}>
                    IDs não encontrados no banco (
                    {result.detalhes.naoEncontradas.length}):
                  </Typography>
                  <Box sx={{ fontSize: "0.8rem", color: "text.secondary", mt: 1, maxHeight: 150, overflow: "auto" }}>
                    {result.detalhes.naoEncontradas.join(", ")}
                  </Box>
                </>
              )}
            </>
          ) : (
            <Alert severity="info">
              <strong>{result.limpas}</strong> turmas tiveram a solicitação
              removida.
            </Alert>
          )}
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            <strong>Próximos passos:</strong> vá em <em>Resolver</em>, rode o
            solver e depois exporte o resultado em <em>Resultado</em>. Na
            comparação, carregue o Excel manual + o novo resultado do site para
            validar se as solicitações foram atendidas.
          </Typography>
        </Paper>
      )}
    </>
  );
};

export default TesteSolicitacoes;
