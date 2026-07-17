import React from "react";
import { Document, Page, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { AuditPlayerReport, AuditReport, AuditTrendPoint } from "@/lib/auditReportService";

const s = StyleSheet.create({
  page: { padding: 28, paddingBottom: 24, fontFamily: "Helvetica", fontSize: 8, color: "#17211b" },
  cover: { padding: 48, justifyContent: "center", alignItems: "center", backgroundColor: "#f3f8f4" },
  title: { fontSize: 28, fontFamily: "Helvetica-Bold", color: "#14532d" },
  subtitle: { marginTop: 10, fontSize: 18, color: "#374151" },
  meta: { marginTop: 28, width: 330, padding: 16, borderWidth: 1, borderColor: "#86a88f", backgroundColor: "#fff" },
  metaText: { marginBottom: 7, fontSize: 11, textAlign: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: "#166534", paddingBottom: 7, marginBottom: 9 },
  name: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#14532d" },
  muted: { marginTop: 3, color: "#4b5563" },
  flag: { padding: 6, borderWidth: 1, borderColor: "#92400e", backgroundColor: "#fef3c7", fontFamily: "Helvetica-Bold" },
  cards: { flexDirection: "row", gap: 6, marginBottom: 8 },
  card: { flexGrow: 1, flexBasis: 0, padding: 7, borderWidth: 1, borderColor: "#cbd5d1", backgroundColor: "#f8faf9" },
  cardLabel: { fontSize: 7, color: "#52605a", marginBottom: 3 },
  cardValue: { fontSize: 17, fontFamily: "Helvetica-Bold" },
  chart: { height: 145, borderWidth: 1, borderColor: "#cbd5d1", padding: 7, marginBottom: 8 },
  section: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#14532d", marginBottom: 4 },
  row: { flexDirection: "row", minHeight: 15, alignItems: "center", borderBottomWidth: 0.5, borderBottomColor: "#d9e0dc" },
  th: { backgroundColor: "#e8f1eb", fontFamily: "Helvetica-Bold" },
  date: { width: "12%", padding: 3 }, course: { width: "38%", padding: 3 },
  tee: { width: "12%", padding: 3 }, score: { width: "10%", padding: 3, textAlign: "right" },
  diff: { width: "10%", padding: 3, textAlign: "right" }, type: { width: "18%", padding: 3 },
  comp: { color: "#15803d", fontFamily: "Helvetica-Bold" },
  notes: { marginTop: 8, height: 58, borderWidth: 1, borderColor: "#9ca3af", padding: 7 },
  footer: { position: "absolute", bottom: 9, left: 28, right: 28, flexDirection: "row", justifyContent: "space-between", color: "#6b7280", fontSize: 7 },
  summaryPlayer: { width: "35%", padding: 5 }, summaryNum: { width: "13%", padding: 5, textAlign: "right" }, summaryFlag: { width: "13%", padding: 5 },
});

const n = (v: number | null) => v == null ? "-" : v.toFixed(1);
const d = (v: string) => new Date(`${v}T00:00:00`).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" });

function Footer({ generatedAt }: { generatedAt: string }) {
  return <View style={s.footer} fixed>
    <Text>Goodrich Men's Club Handicap Committee Audit</Text>
    <Text>Generated {new Date(generatedAt).toLocaleDateString("en-US")} · Page <Text render={({ pageNumber }) => `${pageNumber}`} /></Text>
  </View>;
}

function path(points: AuditTrendPoint[], minT: number, maxT: number, minV: number, maxV: number) {
  const width = 520, height = 100, xp = 20, yp = 12;
  return points.map((p, i) => {
    const t = new Date(`${p.date}T00:00:00`).getTime();
    const x = xp + ((t - minT) / Math.max(1, maxT - minT)) * (width - xp * 2);
    const y = yp + ((maxV - p.handicapIndex) / Math.max(1, maxV - minV)) * (height - yp * 2);
    return `${i ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

function Chart({ player }: { player: AuditPlayerReport }) {
  const all = [...player.competitionTrend, ...player.generalTrend];
  if (!all.length) return <Text>No trend data available.</Text>;
  const times = all.map((p) => new Date(`${p.date}T00:00:00`).getTime());
  const values = all.map((p) => p.handicapIndex);
  if (player.currentIndex != null) values.push(player.currentIndex);
  const minT = Math.min(...times), maxT = Math.max(...times);
  const minV = Math.floor(Math.min(...values) - 1), maxV = Math.ceil(Math.max(...values) + 1);
  const currentY = player.currentIndex == null ? null : 12 + ((maxV - player.currentIndex) / Math.max(1, maxV - minV)) * 76;

  return <View>
    <View style={{ flexDirection: "row", marginBottom: 3 }}>
      <Text style={{ color: "#15803d", marginRight: 14 }}>Competition HI</Text>
      <Text style={{ color: "#6b7280", marginRight: 14 }}>General Play HI</Text>
      <Text style={{ color: "#2563eb" }}>Current GHIN HI</Text>
    </View>
    <Svg width={520} height={100}>
      {[0,1,2,3,4].map((i) => <Path key={i} d={`M 20 ${12+i*19} L 500 ${12+i*19}`} stroke="#e5e7eb" strokeWidth={0.6} />)}
      {currentY != null && <Path d={`M 20 ${currentY} L 500 ${currentY}`} stroke="#2563eb" strokeWidth={1.2} strokeDasharray="5 4" />}
      {!!player.generalTrend.length && <Path d={path(player.generalTrend,minT,maxT,minV,maxV)} stroke="#6b7280" strokeWidth={2} fill="none" />}
      {!!player.competitionTrend.length && <Path d={path(player.competitionTrend,minT,maxT,minV,maxV)} stroke="#15803d" strokeWidth={2.2} fill="none" />}
    </Svg>
  </View>;
}

function Card({ label, value }: { label: string; value: string }) {
  return <View style={s.card}><Text style={s.cardLabel}>{label}</Text><Text style={s.cardValue}>{value}</Text></View>;
}

function PlayerPage({ player, generatedAt }: { player: AuditPlayerReport; generatedAt: string }) {
  return <Page size="LETTER" style={s.page} wrap={false}>
    <View style={s.header}>
      <View><Text style={s.name}>{player.name}</Text><Text style={s.muted}>GHIN #{player.ghinNumber ?? "-"} · {player.competitionRounds} competition · {player.generalRounds} general play</Text></View>
      <Text style={s.flag}>{player.flag}</Text>
    </View>

    <View style={s.cards}>
      <Card label="CURRENT GHIN HI" value={n(player.currentIndex)} />
      <Card label="COMPETITION HI" value={n(player.competitionIndex)} />
      <Card label="GENERAL PLAY HI" value={n(player.generalIndex)} />
      <Card label="GENERAL − COMPETITION" value={player.difference == null ? "-" : `${player.difference >= 0 ? "+" : ""}${player.difference.toFixed(1)}`} />
    </View>

    <View style={s.chart}><Text style={s.section}>Rolling Category Handicap Index</Text><Chart player={player} /></View>

    <Text style={s.section}>Last 20 Official Handicap Rounds</Text>
    <View style={[s.row, s.th]}><Text style={s.date}>Date</Text><Text style={s.course}>Course</Text><Text style={s.tee}>Tee</Text><Text style={s.score}>Score</Text><Text style={s.diff}>Diff</Text><Text style={s.type}>Category</Text></View>
    {player.rounds.map((r) => <View style={s.row} key={r.id}>
      <Text style={s.date}>{d(r.playedAt)}</Text><Text style={s.course}>{r.courseName}</Text><Text style={s.tee}>{r.teeName}</Text>
      <Text style={[s.score, r.category === "Competition" ? s.comp : {}]}>{r.score ?? "-"}</Text>
      <Text style={s.diff}>{r.differential.toFixed(1)}</Text>
      <Text style={[s.type, r.category === "Competition" ? s.comp : {}]}>{r.category}</Text>
    </View>)}

    <View style={s.notes}><Text style={s.section}>Committee Action</Text><Text>□ No change     □ Monitor     □ Adjust Handicap Index to: __________</Text><Text style={{ marginTop: 8 }}>Reason / notes: ______________________________________________________________</Text><Text style={{ marginTop: 7 }}>____________________________________________________________________________</Text></View>
    <Footer generatedAt={generatedAt} />
  </Page>;
}

function Summary({ report, title }: { report: AuditReport; title: string }) {
  return <Page size="LETTER" style={s.page}>
    <Text style={[s.title, { fontSize: 20, marginBottom: 12 }]}>{title}</Text>
    <View style={[s.row, s.th]}><Text style={s.summaryPlayer}>Player</Text><Text style={s.summaryNum}>Current</Text><Text style={s.summaryNum}>Comp</Text><Text style={s.summaryNum}>General</Text><Text style={s.summaryNum}>Difference</Text><Text style={s.summaryFlag}>Flag</Text></View>
    {report.players.map((p) => <View style={s.row} key={p.id}><Text style={s.summaryPlayer}>{p.name}</Text><Text style={s.summaryNum}>{n(p.currentIndex)}</Text><Text style={s.summaryNum}>{n(p.competitionIndex)}</Text><Text style={s.summaryNum}>{n(p.generalIndex)}</Text><Text style={s.summaryNum}>{n(p.difference)}</Text><Text style={s.summaryFlag}>{p.flag}</Text></View>)}
    <Footer generatedAt={report.generatedAt} />
  </Page>;
}

export function AuditBook({ report }: { report: AuditReport }) {
  return <Document title="Goodrich Men's Club Handicap Committee Audit">
    <Page size="LETTER" style={s.cover}>
      <Text style={s.title}>Goodrich Men's Club</Text><Text style={s.subtitle}>Handicap Committee Audit</Text>
      <View style={s.meta}><Text style={s.metaText}>Generated: {new Date(report.generatedAt).toLocaleString("en-US")}</Text><Text style={s.metaText}>Players reviewed: {report.players.length}</Text><Text style={s.metaText}>Ranked by general-play minus competition-only Handicap Index.</Text></View>
    </Page>
    <Summary report={report} title="Players Requiring Review" />
    {report.players.map((player) => <PlayerPage key={player.id} player={player} generatedAt={report.generatedAt} />)}
    <Summary report={report} title="Final Committee Summary" />
  </Document>;
}
