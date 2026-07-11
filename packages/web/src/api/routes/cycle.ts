import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and, gte } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { computePhase, type CycleSettings, type PhaseId } from "../../shared/cycle-core";

const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const today = () => new Date().toISOString().split("T")[0];

// Valida e normaliza as definições do ciclo.
function clean(body: any): { lastPeriodStart: string; cycleLength: number; periodLength: number } | string {
  if (!isDate(body.lastPeriodStart)) return "Data da última menstruação inválida.";
  if (body.lastPeriodStart > today()) return "A data não pode ser no futuro.";
  const cycleLength = Math.round(Number(body.cycleLength));
  if (!Number.isFinite(cycleLength) || cycleLength < 20 || cycleLength > 45) return "Duração do ciclo deve estar entre 20 e 45 dias.";
  const periodLength = Math.round(Number(body.periodLength ?? 5));
  if (!Number.isFinite(periodLength) || periodLength < 2 || periodLength > 10) return "Duração da menstruação deve estar entre 2 e 10 dias.";
  return { lastPeriodStart: body.lastPeriodStart, cycleLength, periodLength };
}

async function upsert(userId: string, data: { lastPeriodStart: string; cycleLength: number; periodLength: number }) {
  const existing = await db.select().from(schema.cycleTracking).where(eq(schema.cycleTracking.userId, userId));
  if (existing.length > 0) {
    const [row] = await db.update(schema.cycleTracking)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.cycleTracking.userId, userId))
      .returning();
    return row;
  }
  const [row] = await db.insert(schema.cycleTracking).values({ userId, ...data }).returning();
  return row;
}

export const cycleRoute = new Hono()
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const [row] = await db.select().from(schema.cycleTracking).where(eq(schema.cycleTracking.userId, user.id));
    return c.json({ cycle: row ?? null }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const parsed = clean(await c.req.json());
    if (typeof parsed === "string") return c.json({ message: parsed }, 400);
    const row = await upsert(user.id, parsed);
    return c.json({ cycle: row }, 200);
  })
  // Check-in de hoje (como se sente) — null se ainda não registou hoje.
  .get("/checkin", requireAuth, async (c) => {
    const user = c.get("user")!;
    const [row] = await db.select().from(schema.cycleCheckins)
      .where(and(eq(schema.cycleCheckins.userId, user.id), eq(schema.cycleCheckins.checkinDate, today())));
    return c.json({ checkin: row ?? null }, 200);
  })
  // Regista/atualiza o check-in de hoje (estado e/ou sintomas).
  .post("/checkin", requireAuth, async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json();
    const allowedFeelings = ["otima", "bem", "media", "sem-energia"];
    const allowedSymptoms = ["colicas", "inchaco", "humor", "sono", "desejos", "humor-bom", "motivada", "energia-boa", "pele-boa", "libido", "sono-bom"];
    const allowedContext = ["trabalho", "escola", "ansiedade", "sono-mau", "treino", "relax"];

    const feeling = allowedFeelings.includes(body.feeling) ? body.feeling : undefined;
    const symptoms = Array.isArray(body.symptoms)
      ? body.symptoms.filter((s: any) => allowedSymptoms.includes(s))
      : undefined;
    const context = Array.isArray(body.context)
      ? body.context.filter((s: any) => allowedContext.includes(s))
      : undefined;
    const hungerEmotional = ["sim", "nao"].includes(body.hungerEmotional) ? body.hungerEmotional : undefined;
    const hungerControl = ["descontrolo", "controlo"].includes(body.hungerControl) ? body.hungerControl : undefined;
    if (feeling === undefined && symptoms === undefined && context === undefined && hungerEmotional === undefined && hungerControl === undefined) {
      return c.json({ message: "Nada para registar." }, 400);
    }

    const [existing] = await db.select().from(schema.cycleCheckins)
      .where(and(eq(schema.cycleCheckins.userId, user.id), eq(schema.cycleCheckins.checkinDate, today())));
    if (existing) {
      const set: any = {};
      if (feeling !== undefined) set.feeling = feeling;
      if (symptoms !== undefined) set.symptoms = JSON.stringify(symptoms);
      if (context !== undefined) set.context = JSON.stringify(context);
      if (hungerEmotional !== undefined) set.hungerEmotional = hungerEmotional;
      if (hungerControl !== undefined) set.hungerControl = hungerControl;
      const [row] = await db.update(schema.cycleCheckins).set(set)
        .where(eq(schema.cycleCheckins.id, existing.id)).returning();
      return c.json({ checkin: row }, 200);
    }
    // Novo registo precisa de um estado (o resto só aparece depois no UI).
    if (feeling === undefined) return c.json({ message: "Escolhe primeiro como te sentes." }, 400);
    const [row] = await db.insert(schema.cycleCheckins)
      .values({
        userId: user.id, checkinDate: today(), feeling,
        symptoms: JSON.stringify(symptoms ?? []),
        context: JSON.stringify(context ?? []),
        hungerEmotional: hungerEmotional ?? null,
        hungerControl: hungerControl ?? null,
      }).returning();
    return c.json({ checkin: row }, 201);
  })
  // Padrões: agrega os check-ins por fase para mostrar tendências à aluna.
  .get("/insights", requireAuth, async (c) => {
    const user = c.get("user")!;
    const [cycleRow] = await db.select().from(schema.cycleTracking).where(eq(schema.cycleTracking.userId, user.id));
    if (!cycleRow) return c.json({ insights: null }, 200);
    const settings: CycleSettings = { lastPeriodStart: cycleRow.lastPeriodStart, cycleLength: cycleRow.cycleLength, periodLength: cycleRow.periodLength };

    const since = new Date(); since.setDate(since.getDate() - 90);
    const rows = await db.select().from(schema.cycleCheckins)
      .where(and(eq(schema.cycleCheckins.userId, user.id), gte(schema.cycleCheckins.checkinDate, since.toISOString().split("T")[0])));

    const energyScore: Record<string, number> = { otima: 4, bem: 3, media: 2, "sem-energia": 1 };
    type PhaseAgg = { count: number; energySum: number; symptoms: Record<string, number>; hungerAnswered: number; emotional: number; descontrolo: number };
    const mk = (): PhaseAgg => ({ count: 0, energySum: 0, symptoms: {}, hungerAnswered: 0, emotional: 0, descontrolo: 0 });
    const byPhase: Record<PhaseId, PhaseAgg> = {
      menstrual: mk(), folicular: mk(), ovulacao: mk(), lutea: mk(),
    };
    const symptomTotals: Record<string, number> = {};
    const contextTotals: Record<string, number> = {};

    for (const r of rows) {
      const ph = computePhase(settings, r.checkinDate).phaseId;
      const b = byPhase[ph];
      b.count++;
      b.energySum += energyScore[r.feeling] ?? 2;
      let syms: string[] = [];
      try { syms = JSON.parse(r.symptoms || "[]"); } catch { /* ignore */ }
      for (const s of syms) {
        b.symptoms[s] = (b.symptoms[s] ?? 0) + 1;
        symptomTotals[s] = (symptomTotals[s] ?? 0) + 1;
      }
      let ctx: string[] = [];
      try { ctx = JSON.parse((r as any).context || "[]"); } catch { /* ignore */ }
      for (const s of ctx) contextTotals[s] = (contextTotals[s] ?? 0) + 1;
      // Fome: conta respostas e ocorrências de fome emocional / descontrolo.
      if (r.hungerEmotional || r.hungerControl) b.hungerAnswered++;
      if (r.hungerEmotional === "sim") b.emotional++;
      if (r.hungerControl === "descontrolo") b.descontrolo++;
    }

    // Fase com menor energia média (só fases com registos)
    let lowestEnergyPhase: PhaseId | null = null;
    let lowestAvg = Infinity;
    (Object.keys(byPhase) as PhaseId[]).forEach((ph) => {
      const b = byPhase[ph];
      if (b.count >= 2) {
        const avg = b.energySum / b.count;
        if (avg < lowestAvg) { lowestAvg = avg; lowestEnergyPhase = ph; }
      }
    });

    // Fase onde a fome emocional / o descontrolo acontecem mais (por taxa),
    // com um mínimo de dados para não tirar conclusões precipitadas.
    const topRatePhase = (pick: (b: PhaseAgg) => number): { phase: PhaseId; rate: number; occurrences: number } | null => {
      let best: { phase: PhaseId; rate: number; occurrences: number } | null = null;
      (Object.keys(byPhase) as PhaseId[]).forEach((ph) => {
        const b = byPhase[ph];
        const occ = pick(b);
        if (b.hungerAnswered >= 3 && occ >= 2) {
          const rate = occ / b.hungerAnswered;
          if (!best || rate > best.rate) best = { phase: ph, rate, occurrences: occ };
        }
      });
      return best;
    };
    const emotionalHungerPhase = topRatePhase((b) => b.emotional);
    const descontroloPhase = topRatePhase((b) => b.descontrolo);

    const topSymptoms = Object.entries(symptomTotals).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, count]) => ({ id, count }));
    const topContexts = Object.entries(contextTotals).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, count]) => ({ id, count }));

    // Antecipação para a fase de HOJE: se costuma haver descontrolo/fome
    // emocional na fase atual, avisamos com antecedência.
    const currentPhase = computePhase(settings).phaseId;
    const headsUp = {
      descontroloNow: !!descontroloPhase && (descontroloPhase as any).phase === currentPhase,
      emotionalNow: !!emotionalHungerPhase && (emotionalHungerPhase as any).phase === currentPhase,
    };

    return c.json({
      insights: {
        totalCheckins: rows.length,
        byPhase,
        lowestEnergyPhase,
        topSymptoms,
        topContexts,
        emotionalHungerPhase,
        descontroloPhase,
        headsUp,
      },
    }, 200);
  })
  // Atalho: "o período começou hoje" — atualiza só a data, mantém as durações.
  .post("/period-started", requireAuth, async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json().catch(() => ({}));
    const date = isDate(body.date) && body.date <= today() ? body.date : today();
    const [existing] = await db.select().from(schema.cycleTracking).where(eq(schema.cycleTracking.userId, user.id));
    const row = await upsert(user.id, {
      lastPeriodStart: date,
      cycleLength: existing?.cycleLength ?? 28,
      periodLength: existing?.periodLength ?? 5,
    });
    return c.json({ cycle: row }, 200);
  });
