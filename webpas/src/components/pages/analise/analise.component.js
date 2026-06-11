import React, { useState } from "react";
import ResultadosDataService from "../../../services/resultados";
import PageHeader from "../../re-usable/page-header.component";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";
import InfoIcon from "@mui/icons-material/Info";
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  Divider,
} from "@mui/material";

const thisYear = new Date().getFullYear();

// Cards pequenos de resumo — local para não conflitar com Comparacao
const StatCard = ({ label, value, color, pct, sub }) => (
  <Paper variant="outlined" sx={{ p: 1.5, textAlign: "center", borderRadius: 2 }}>
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
    {sub && (
      <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
        {sub}
      </Typography>
    )}
  </Paper>
);

// Descrição legível de cada motivo
const MOTIVO_DESCRICAO = {
  credZero: {
    label: "Sem créditos de aula teórica",
    color: "warning",
    icon: <WarningIcon fontSize="small" />,
    text: "Turmas sem créditos de aula (cred_aula = 0). Geralmente são estágios, práticas supervisionadas e laboratórios que não precisam de alocação de sala padrão.",
  },
  alocadoChefia: {
    label: "Alocada pela chefia do departamento",
    color: "default",
    icon: <InfoIcon fontSize="small" />,
    text: "Turmas com o campo \"alocado pela chefia\" marcado como verdadeiro. A chefia já definiu a sala manualmente e o sistema não mexe nelas.",
  },
  poucoAlunos: {
    label: "Poucos alunos inscritos",
    color: "warning",
    icon: <WarningIcon fontSize="small" />,
    text: "Turmas com número de inscritos abaixo do mínimo configurado (e que não fazem parte de junção com outras turmas).",
  },
  horarioAtipico: {
    label: "Horário fora do padrão",
    color: "warning",
    icon: <WarningIcon fontSize="small" />,
    text: "Horários que não encaixam em nenhum período (Manhã, Tarde ou Noite) configurado. Ex.: aulas que atravessam períodos (como 16h–21h).",
  },
  f12Pair: {
    label: "Aula contínua de 4h — segundo horário",
    color: "info",
    icon: <InfoIcon fontSize="small" />,
    text: "Estas turmas fazem parte de uma aula contínua de 4 horas, dividida em dois horários consecutivos (ex.: 8h–10h e 10h–12h). O sistema aloca a aula inteira em um único bloco usando a sala do primeiro horário; por isso o segundo horário não aparece como alocação separada, mas a turma está sim alocada.",
  },
  juncaoAbsorvida: {
    label: "Turma em junção (alocada com outra)",
    color: "info",
    icon: <InfoIcon fontSize="small" />,
    text: "Turmas que fazem parte de um grupo de junção (mesma disciplina, mesmo horário, múltiplas turmas compartilhando a sala). A sala foi alocada na turma representante do grupo; as demais estão alocadas junto com ela.",
  },
  solverFalhou: {
    label: "Sem alocação — precisa de atenção",
    color: "error",
    icon: <ErrorIcon fontSize="small" />,
    text: "Turmas que deveriam ter sido alocadas mas o sistema não encontrou sala adequada. Possíveis causas: falta de sala disponível no horário, capacidade insuficiente, ou restrições de distância/acessibilidade muito rígidas.",
  },
};

const TabelaTurmas = ({ turmas, extraCols = [] }) => (
  <TableContainer sx={{ maxHeight: 400 }}>
    <Table size="small" stickyHeader>
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>ID</TableCell>
          <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Disciplina</TableCell>
          <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Turma</TableCell>
          <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Dia/Hora</TableCell>
          <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Depto</TableCell>
          <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Alunos</TableCell>
          <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Cred</TableCell>
          {extraCols.map((c) => (
            <TableCell key={c.key} sx={{ fontSize: "0.7rem", fontWeight: 600 }}>{c.label}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {turmas.map((t) => (
          <TableRow key={String(t._id)}>
            <TableCell sx={{ fontSize: "0.7rem", fontFamily: "monospace" }}>{t.horario_id || t.idTurma}</TableCell>
            <TableCell sx={{ fontSize: "0.7rem", maxWidth: 280 }}>{(t.nomeDisciplina || "").substring(0, 45)}</TableCell>
            <TableCell sx={{ fontSize: "0.7rem" }}>{t.turma}</TableCell>
            <TableCell sx={{ fontSize: "0.7rem" }}>{t.diaDaSemana} {t.horarioInicio}-{t.horarioFim}</TableCell>
            <TableCell sx={{ fontSize: "0.7rem" }}>{t.departamentoTurma || t.departamentoOferta}</TableCell>
            <TableCell sx={{ fontSize: "0.7rem" }}>{t.totalTurma}</TableCell>
            <TableCell sx={{ fontSize: "0.7rem" }}>{t.creditosAula}</TableCell>
            {extraCols.map((c) => (
              <TableCell key={c.key} sx={{ fontSize: "0.7rem" }}>{c.render(t)}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

// Props opcionais: { embedded, ano, semestre, minAlunos }
// Se embedded=true, omite o header e o bloco de parâmetros, e usa ano/semestre dos props
const Analise = ({ embedded = false, ano: anoProp, semestre: semProp, minAlunos: minAlunosProp = 5 } = {}) => {
  const [anoLocal, setAnoLocal] = useState(anoProp || thisYear);
  const [semLocal, setSemLocal] = useState(semProp || 1);
  const [minAlunosLocal, setMinAlunosLocal] = useState(minAlunosProp);
  const ano = embedded ? (anoProp || thisYear) : anoLocal;
  const semestre = embedded ? (semProp || 1) : semLocal;
  const minAlunos = embedded ? minAlunosProp : minAlunosLocal;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const rodar = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await ResultadosDataService.getAnalise(Number(ano), Number(semestre), Number(minAlunos));
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
    setLoading(false);
  };

  return (
    <>
      {!embedded && (
        <PageHeader
          title="Análise do Resultado"
          subtitle="Analisa o resultado do solver sem precisar do Excel manual — lê tudo do banco"
          icon={<AssessmentIcon />}
        />
      )}

      {!embedded && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom fontWeight={500}>
            Parâmetros
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={6} sm={3}>
              <TextField
                select fullWidth size="small" label="Ano"
                value={anoLocal} onChange={(e) => setAnoLocal(Number(e.target.value))}
              >
                {[thisYear - 2, thisYear - 1, thisYear, thisYear + 1].map((y) => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                select fullWidth size="small" label="Semestre"
                value={semLocal} onChange={(e) => setSemLocal(Number(e.target.value))}
              >
                <MenuItem value={1}>1</MenuItem>
                <MenuItem value={2}>2</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth size="small" type="number" label="Mínimo de alunos"
                value={minAlunosLocal} onChange={(e) => setMinAlunosLocal(e.target.value)}
                helperText="Mesma regra do solver"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <Button
                variant="contained" color="secondary" fullWidth size="large"
                startIcon={<PlayArrowIcon />} onClick={rodar} disabled={loading}
              >
                {loading ? "Analisando..." : "Gerar Análise"}
              </Button>
            </Grid>
          </Grid>
          {loading && <LinearProgress sx={{ mt: 2 }} />}
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </Paper>
      )}

      {embedded && (
        <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 2 }}>
          <Button
            variant="contained" color="secondary" size="medium"
            startIcon={<PlayArrowIcon />} onClick={rodar} disabled={loading}
          >
            {loading ? "Analisando..." : data ? "Atualizar Análise" : "Gerar Análise"}
          </Button>
          <Typography variant="caption" color="text.secondary">
            {ano}/{semestre} — minAlunos {minAlunos}
          </Typography>
        </Box>
      )}
      {embedded && loading && <LinearProgress sx={{ mb: 2 }} />}
      {embedded && error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {data && <AnaliseResultado data={data} />}
    </>
  );
};

const AnaliseResultado = ({ data }) => {
  const { totais, scores, categorias, solicitacoes, capacidadeExcedida, predioAux } = data;
  const scoreColor = scores.geral >= 85 ? "success.main" : scores.geral >= 70 ? "warning.main" : "error.main";
  const scoreBg = scores.geral >= 85 ? "success.50" : scores.geral >= 70 ? "warning.50" : "error.50";

  const motivosOrdem = [
    "solverFalhou",
    "horarioAtipico",
    "credZero",
    "poucoAlunos",
    "alocadoChefia",
    "f12Pair",
    "juncaoAbsorvida",
  ];

  return (
    <>
      {/* SCORE */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 3, p: 3,
          borderRadius: 3, bgcolor: scoreBg,
          border: "2px solid", borderColor: scoreColor,
        }}>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h2" fontWeight={800} color={scoreColor}>
              {scores.geral}%
            </Typography>
            <Typography variant="subtitle1" fontWeight={600}>Score Geral</Typography>
          </Box>
          <Box sx={{ maxWidth: 420 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {scores.geral >= 85
                ? "Excelente: alocação e solicitações bem atendidas."
                : scores.geral >= 70
                  ? "Bom: poucas pendências, revise os pontos de atenção."
                  : scores.geral >= 50
                    ? "Moderado: verifique não atendimentos e turmas sem sala."
                    : "Baixo: existem problemas que merecem revisão."}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Alocação: <strong>{scores.alocacao}%</strong> (peso 70%) | Solicitações: <strong>{scores.solicitacoes}%</strong> (peso 30%)
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* CARDS DE RESUMO */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight={500}>Visão Geral</Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={4} md={3}>
            <StatCard label="Turmas no banco" value={totais.turmasNoBanco} color="text.primary" />
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <StatCard label="Alocadas" value={totais.alocadas} color="success.main" pct={totais.turmasNoBanco} />
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <StatCard
              label="Não alocadas"
              value={totais.turmasNoBanco - totais.alocadas}
              color="warning.main"
              pct={totais.turmasNoBanco}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <StatCard
              label="Solver falhou"
              value={totais.naoAlocadasPorMotivo.solverFalhou}
              color="error.main"
              sub="(elegíveis e sem sala)"
            />
          </Grid>
        </Grid>
        {totais.solicitacoes.total > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Solicitações</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4} md={3}>
                <StatCard label="Total c/ solicitação" value={totais.solicitacoes.total} color="text.primary" />
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <StatCard label="Atendidas" value={totais.solicitacoes.atendidas} color="success.main" pct={totais.solicitacoes.total} />
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <StatCard label="NÃO atendidas" value={totais.solicitacoes.naoAtendidas} color="error.main" pct={totais.solicitacoes.total} />
              </Grid>
            </Grid>
          </>
        )}
        {(totais.capacidadeExcedida > 0 || totais.predioAux > 0) && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Pontos de Atenção</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4} md={3}>
                <StatCard label="Capacidade excedida" value={totais.capacidadeExcedida} color="warning.main" />
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <StatCard label="Em prédio auxiliar" value={totais.predioAux} color="warning.main" />
              </Grid>
            </Grid>
          </>
        )}
      </Paper>

      {/* SOLICITAÇÕES */}
      {totais.solicitacoes.total > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={500} gutterBottom>
            🔬 Solicitações
          </Typography>

          {/* Não atendidas — destaque */}
          {solicitacoes.naoAtendidas.length > 0 && (
            <Accordion defaultExpanded sx={{ mb: 1, boxShadow: "none", border: "1px solid #ef5350" }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "#ffebee" }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <ErrorIcon color="error" fontSize="small" />
                  <Typography fontWeight={600}>
                    NÃO atendidas ({solicitacoes.naoAtendidas.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>ID</TableCell>
                        <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Disciplina</TableCell>
                        <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Turma</TableCell>
                        <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Solicitação</TableCell>
                        <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Sala Alocada</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {solicitacoes.naoAtendidas.map((e, i) => {
                        const t = e.alocacao.turma;
                        const s = e.alocacao.sala;
                        return (
                          <TableRow key={"na-" + i}>
                            <TableCell sx={{ fontSize: "0.7rem", fontFamily: "monospace" }}>{t.horario_id}</TableCell>
                            <TableCell sx={{ fontSize: "0.7rem" }}>{(t.nomeDisciplina || "").substring(0, 40)}</TableCell>
                            <TableCell sx={{ fontSize: "0.7rem" }}>{t.turma}</TableCell>
                            <TableCell><Chip label={t.solicitacao} size="small" color="error" sx={{ fontSize: "0.65rem", height: 20 }} /></TableCell>
                            <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>{s.predio} {s.numeroSala}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Atendidas */}
          {solicitacoes.atendidas.length > 0 && (
            <Accordion sx={{ boxShadow: "none", border: "1px solid #66bb6a" }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "#e8f5e9" }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckCircleIcon color="success" fontSize="small" />
                  <Typography fontWeight={600}>
                    Atendidas ({solicitacoes.atendidas.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>ID</TableCell>
                        <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Disciplina</TableCell>
                        <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Turma</TableCell>
                        <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Solicitação</TableCell>
                        <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Sala Alocada</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {solicitacoes.atendidas.map((e, i) => {
                        const t = e.alocacao.turma;
                        const s = e.alocacao.sala;
                        return (
                          <TableRow key={"at-" + i}>
                            <TableCell sx={{ fontSize: "0.7rem", fontFamily: "monospace" }}>{t.horario_id}</TableCell>
                            <TableCell sx={{ fontSize: "0.7rem" }}>{(t.nomeDisciplina || "").substring(0, 40)}</TableCell>
                            <TableCell sx={{ fontSize: "0.7rem" }}>{t.turma}</TableCell>
                            <TableCell><Chip label={t.solicitacao} size="small" color="success" sx={{ fontSize: "0.65rem", height: 20 }} /></TableCell>
                            <TableCell sx={{ fontSize: "0.7rem" }}>{s.predio} {s.numeroSala}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          )}
        </Paper>
      )}

      {/* TURMAS NÃO ALOCADAS POR MOTIVO */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={500} gutterBottom>
          📋 Turmas não alocadas — organizadas por motivo
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Cada categoria explica por que uma turma não tem alocação de sala individual. A
          categoria <strong>"Sem alocação — precisa de atenção"</strong> é a única que merece
          investigação; as demais são comportamentos esperados (turmas de 4h em bloco, turmas em
          junção, estágios sem necessidade de sala, etc.).
        </Typography>

        {motivosOrdem.map((motivo) => {
          const turmas = categorias.naoAlocadas[motivo] || [];
          if (turmas.length === 0) return null;
          const desc = MOTIVO_DESCRICAO[motivo];
          const isCritico = motivo === "solverFalhou";
          return (
            <Accordion
              key={motivo}
              defaultExpanded={isCritico}
              sx={{
                mb: 1,
                boxShadow: "none",
                border: `1px solid ${isCritico ? "#ef5350" : "#bdbdbd"}`,
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{ bgcolor: isCritico ? "#ffebee" : "#f5f5f5" }}
              >
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                  {desc.icon}
                  <Typography fontWeight={600}>
                    {desc.label} ({turmas.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                  {desc.text}
                </Typography>
                <TabelaTurmas
                  turmas={turmas}
                  extraCols={
                    motivo === "f12Pair"
                      ? [{ key: "par", label: "Horário do par alocado", render: (t) => t.pairHorario || "—" }]
                      : []
                  }
                />
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Paper>

      {/* CAPACIDADE EXCEDIDA */}
      {capacidadeExcedida.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={500} gutterBottom>
            ⚠️ Capacidade Excedida ({capacidadeExcedida.length})
          </Typography>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>ID</TableCell>
                  <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Disciplina</TableCell>
                  <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Alunos</TableCell>
                  <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Sala</TableCell>
                  <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Capacidade</TableCell>
                  <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Excesso</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {capacidadeExcedida.map((e, i) => {
                  const t = e.alocacao.turma;
                  const s = e.alocacao.sala;
                  return (
                    <TableRow key={"cap-" + i}>
                      <TableCell sx={{ fontSize: "0.7rem", fontFamily: "monospace" }}>{t.horario_id}</TableCell>
                      <TableCell sx={{ fontSize: "0.7rem" }}>{(t.nomeDisciplina || "").substring(0, 40)}</TableCell>
                      <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600, color: "error.main" }}>{t.totalTurma}</TableCell>
                      <TableCell sx={{ fontSize: "0.7rem" }}>{s.predio} {s.numeroSala}</TableCell>
                      <TableCell sx={{ fontSize: "0.7rem" }}>{s.capacidade}</TableCell>
                      <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600, color: "error.main" }}>+{e.excesso}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* PRÉDIO AUXILIAR */}
      {predioAux.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={500} gutterBottom>
            🏚️ Alocações em Prédio Auxiliar ({predioAux.length})
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            O prédio auxiliar é usado quando o solver não encontra sala real adequada.
            Essas alocações precisam de atenção — provavelmente falta sala física no cadastro.
          </Alert>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>ID</TableCell>
                  <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Disciplina</TableCell>
                  <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Turma</TableCell>
                  <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Dia/Hora</TableCell>
                  <TableCell sx={{ fontSize: "0.7rem", fontWeight: 600 }}>Alunos</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {predioAux.map((e, i) => {
                  const t = e.alocacao.turma;
                  return (
                    <TableRow key={"aux-" + i}>
                      <TableCell sx={{ fontSize: "0.7rem", fontFamily: "monospace" }}>{t.horario_id}</TableCell>
                      <TableCell sx={{ fontSize: "0.7rem" }}>{(t.nomeDisciplina || "").substring(0, 40)}</TableCell>
                      <TableCell sx={{ fontSize: "0.7rem" }}>{t.turma}</TableCell>
                      <TableCell sx={{ fontSize: "0.7rem" }}>{t.diaDaSemana} {t.horarioInicio}-{t.horarioFim}</TableCell>
                      <TableCell sx={{ fontSize: "0.7rem" }}>{t.totalTurma}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </>
  );
};

export default Analise;
