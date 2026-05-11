import app from "./app";
import { logger } from "./lib/logger";
import cron from "node-cron";
import { db, weeklyPlannerWeeksTable, usersTable, franchisesTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { sendPlannerReminder } from "./services/email";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  schedulePlannerReminders();
});

function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function formatWeekLabel(weekStartDate: string): string {
  const [y, m, d] = weekStartDate.split("-");
  const start = new Date(Number(y), Number(m) - 1, Number(d));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (dt: Date) => `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
  return `${fmt(start)}–${fmt(end)}/${y}`;
}

async function sendPlannerReminders(type: "end_of_week" | "start_of_week") {
  try {
    const weekStartDate = type === "end_of_week"
      ? getMondayOfWeek(new Date())
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          return getMondayOfWeek(d);
        })();

    // Find franchises that have NOT submitted this week yet
    const submitted = await db.select({ franchiseId: weeklyPlannerWeeksTable.franchiseId })
      .from(weeklyPlannerWeeksTable)
      .where(and(
        eq(weeklyPlannerWeeksTable.weekStartDate, weekStartDate),
        // submittedAt IS NOT NULL
      ));
    const submittedSet = new Set(submitted.map(r => r.franchiseId));

    // Get all active franchise users (franqueado/responsavel_interno)
    const users = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      franchiseId: usersTable.franchiseId,
      franchiseName: franchisesTable.name,
    })
      .from(usersTable)
      .leftJoin(franchisesTable, eq(usersTable.franchiseId, franchisesTable.id))
      .where(
        eq(usersTable.active, true),
      );

    const targets = users.filter(u =>
      u.franchiseId &&
      (u as any).role !== "master_admin" &&
      (u as any).role !== "staff_regional" &&
      !submittedSet.has(u.franchiseId)
    );

    const weekLabel = formatWeekLabel(weekStartDate);
    logger.info({ type, weekStartDate, targets: targets.length }, "Sending planner reminders");

    for (const u of targets) {
      if (!u.email) continue;
      await sendPlannerReminder({
        toEmail: u.email,
        toName: u.name,
        franchiseName: u.franchiseName ?? "Franquia",
        weekLabel,
        type,
      }).catch(err => logger.warn({ err, email: u.email }, "Failed to send planner reminder"));
    }
  } catch (err) {
    logger.error({ err }, "Error in sendPlannerReminders");
  }
}

function schedulePlannerReminders() {
  // Every Friday at 18:00 Brasília time (UTC-3 = 21:00 UTC)
  cron.schedule("0 21 * * 5", () => {
    logger.info("Cron: sending end-of-week planner reminders (Friday 18h BRT)");
    sendPlannerReminders("end_of_week");
  }, { timezone: "America/Sao_Paulo" });

  // Every Monday at 08:00 Brasília time
  cron.schedule("0 8 * * 1", () => {
    logger.info("Cron: sending start-of-week planner reminders (Monday 08h BRT)");
    sendPlannerReminders("start_of_week");
  }, { timezone: "America/Sao_Paulo" });

  logger.info("Planner reminder cron jobs scheduled (Fri 18h + Mon 08h BRT)");
}
