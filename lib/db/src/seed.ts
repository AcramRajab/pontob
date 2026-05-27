import { db } from "./index.js";
import { sql, notInArray, inArray } from "drizzle-orm";
import {
  franchisesTable,
  usersTable,
  dimensionsTable,
  keyProcessesTable,
  strategicInitiativesTable,
} from "./schema/index.js";
import bcrypt from "bcryptjs";
import { validateSeedData } from "./seed-validation.js";
import { USER_SEED_CONFIG, PERMANENTLY_DEACTIVATED_EMAILS } from "./seed-config.js";
import {
  DIMENSION_SEED_DATA,
  PESSOAS_KEY_PROCESSES,
  RE_KEY_PROCESSES,
  PESSOAS_INITIATIVES,
  RE_INITIATIVES,
} from "./seed-catalog-config.js";

const RESET = process.argv.includes("--reset");

const SEED_FRANCHISE_NAMES = ["RE/MAX Franquia Teste", "RE/MAX Capital", "RE/MAX Excellence"];
const SEED_USER_EMAILS = USER_SEED_CONFIG.map(u => u.email);

async function seed() {
  console.log(`Seeding database${RESET ? " (reset mode — tables will be cleared first)" : ""}...`);

  if (RESET) {
    console.log("Clearing catalog tables with cascade...");
    await db.execute(
      sql`TRUNCATE TABLE strategic_initiatives, key_processes, dimensions RESTART IDENTITY CASCADE`
    );
    await db.delete(usersTable).where(
      sql`email = ANY(${SEED_USER_EMAILS})`
    );
    await db.delete(franchisesTable).where(
      sql`name = ANY(${SEED_FRANCHISE_NAMES})`
    );
    console.log("Tables cleared.");
  }

  // ── Franchises ─────────────────────────────────────────────────────────────
  const franchiseData = [
    { name: "RE/MAX Franquia Teste", city: "Florianópolis", state: "SC", brokerOwnerName: "Carlos Mendes", active: true },
    { name: "RE/MAX Capital",        city: "Joinville",    state: "SC", brokerOwnerName: "Ana Souza",    active: true },
    { name: "RE/MAX Excellence",     city: "Blumenau",     state: "SC", brokerOwnerName: "Roberto Lima", active: true },
  ];

  for (const f of franchiseData) {
    await db
      .insert(franchisesTable)
      .values(f)
      .onConflictDoUpdate({
        target: franchisesTable.name,
        set: {
          city:            f.city,
          state:           f.state,
          brokerOwnerName: f.brokerOwnerName,
          active:          f.active,
        },
      });
  }

  const franchises = await db.select().from(franchisesTable).orderBy(franchisesTable.id);
  console.log("Franchises seeded:", franchises.length);

  // ── Users ───────────────────────────────────────────────────────────────────
  // Hash unique passwords only once.
  const uniquePasswords = [...new Set(USER_SEED_CONFIG.map(u => u.password))];
  const hashMap = new Map<string, string>();
  for (const pw of uniquePasswords) {
    hashMap.set(pw, await bcrypt.hash(pw, 10));
  }

  // Build the exact rows that will be written to the users table.
  const userData = USER_SEED_CONFIG.map(u => ({
    name:         u.name,
    email:        u.email,
    passwordHash: hashMap.get(u.password)!,
    role:         u.role,
    franchiseId:  u.franchiseName
      ? franchises.find(f => f.name === u.franchiseName)!.id
      : null,
    active:       u.active,
  }));

  // Validate against the actual insert rows — not a separate copy — so there
  // is no way for the validated data to diverge from what reaches the DB.
  validateSeedData(userData, PERMANENTLY_DEACTIVATED_EMAILS);

  for (const u of userData) {
    await db
      .insert(usersTable)
      .values(u)
      .onConflictDoUpdate({
        target: usersTable.email,
        set: {
          name:         u.name,
          passwordHash: u.passwordHash,
          role:         u.role,
          franchiseId:  u.franchiseId,
          active:       u.active,
        },
      });
  }
  console.log("Users seeded");

  // Guard: ensure permanently-deactivated placeholder accounts can never be
  // re-activated by a future seed run, regardless of what userData contains.
  await db
    .update(usersTable)
    .set({ active: false })
    .where(inArray(usersTable.email, PERMANENTLY_DEACTIVATED_EMAILS));
  console.log("Placeholder accounts enforced as inactive");

  // ── Dimensions ──────────────────────────────────────────────────────────────
  const dimensionData = DIMENSION_SEED_DATA;

  for (const d of dimensionData) {
    await db
      .insert(dimensionsTable)
      .values(d)
      .onConflictDoUpdate({
        target: dimensionsTable.name,
        set: {
          description: d.description,
          active:      d.active,
        },
      });
  }

  const dims = await db.select().from(dimensionsTable).orderBy(dimensionsTable.id);
  const dimPessoas = dims.find(d => d.name === "Pessoas")!;
  const dimRE      = dims.find(d => d.name === "Real Estate")!;

  // Deactivate any dimension no longer present in the seed data
  const seedDimNames = new Set(dimensionData.map(d => d.name));
  const activeDimIds = dims.filter(d => seedDimNames.has(d.name)).map(d => d.id);
  if (activeDimIds.length > 0) {
    await db.update(dimensionsTable).set({ active: false }).where(notInArray(dimensionsTable.id, activeDimIds));
  } else {
    await db.update(dimensionsTable).set({ active: false });
  }
  console.log("Dimensions seeded");

  // ── Key Processes ───────────────────────────────────────────────────────────
  type KPRow = { dimensionId: number; name: string; description: string; orderIndex: number };

  async function upsertKeyProcess(row: KPRow) {
    await db
      .insert(keyProcessesTable)
      .values(row)
      .onConflictDoUpdate({
        target: [keyProcessesTable.dimensionId, keyProcessesTable.name],
        set: {
          description: row.description,
          orderIndex:  row.orderIndex,
          active:      true,
        },
      });
  }

  const pessoasKPs: KPRow[] = PESSOAS_KEY_PROCESSES.map(kp => ({
    dimensionId: dimPessoas.id,
    name:        kp.name,
    description: kp.description,
    orderIndex:  kp.orderIndex,
  }));

  const reKPs: KPRow[] = RE_KEY_PROCESSES.map(kp => ({
    dimensionId: dimRE.id,
    name:        kp.name,
    description: kp.description,
    orderIndex:  kp.orderIndex,
  }));

  for (const row of [...pessoasKPs, ...reKPs]) {
    await upsertKeyProcess(row);
  }

  const allKPs = await db
    .select()
    .from(keyProcessesTable)
    .orderBy(keyProcessesTable.dimensionId, keyProcessesTable.orderIndex);

  // Build a name-keyed map so initiative lookups are always stable regardless
  // of what stale rows may exist in the DB alongside the seeded ones.
  const kpByDimAndName = new Map<string, typeof allKPs[0]>();
  for (const kp of allKPs) {
    kpByDimAndName.set(`${kp.dimensionId}:${kp.name}`, kp);
  }

  // Resolve seeded key processes by name — never by position in the DB result set
  const pKPs = pessoasKPs.map(r => kpByDimAndName.get(`${dimPessoas.id}:${r.name}`)!);
  const rKPs = reKPs.map(r => kpByDimAndName.get(`${dimRE.id}:${r.name}`)!);

  // Deactivate any key process no longer present in the seed data
  const seedKPSet = new Set([...pessoasKPs, ...reKPs].map(kp => `${kp.dimensionId}:${kp.name}`));
  const activeKPIds = allKPs.filter(kp => seedKPSet.has(`${kp.dimensionId}:${kp.name}`)).map(kp => kp.id);
  if (activeKPIds.length > 0) {
    await db.update(keyProcessesTable).set({ active: false }).where(notInArray(keyProcessesTable.id, activeKPIds));
  } else {
    await db.update(keyProcessesTable).set({ active: false });
  }
  console.log("Key processes seeded:", allKPs.length);

  // ── Strategic Initiatives ───────────────────────────────────────────────────
  type InitRow = { dimensionId: number; keyProcessId: number; name: string; kri: string; kpi: string; description: string; active: boolean };

  async function upsertInitiative(row: InitRow) {
    await db
      .insert(strategicInitiativesTable)
      .values(row)
      .onConflictDoUpdate({
        target: [strategicInitiativesTable.keyProcessId, strategicInitiativesTable.name],
        set: {
          dimensionId:  row.dimensionId,
          kri:          row.kri,
          kpi:          row.kpi,
          description:  row.description,
          active:       true,
        },
      });
  }

  const pessoasInits = PESSOAS_INITIATIVES;

  for (const [kpIdx, name, kri, kpi] of pessoasInits) {
    const kp = pKPs[kpIdx];
    if (!kp) continue;
    await upsertInitiative({
      dimensionId:  dimPessoas.id,
      keyProcessId: kp.id,
      name, kri, kpi,
      description: `Iniciativa estratégica: ${name}`,
      active: true,
    });
  }

  const reInits = RE_INITIATIVES;

  for (const [kpIdx, name, kri, kpi] of reInits) {
    const kp = rKPs[kpIdx];
    if (!kp) continue;
    await upsertInitiative({
      dimensionId:  dimRE.id,
      keyProcessId: kp.id,
      name, kri, kpi,
      description: `Iniciativa estratégica: ${name}`,
      active: true,
    });
  }

  const allInits = await db.select().from(strategicInitiativesTable);

  // Deactivate any initiative no longer present in the seed data
  const seedInitSet = new Set([
    ...pessoasInits.map(([kpIdx, name]) => `${pKPs[kpIdx]?.id}:${name}`),
    ...reInits.map(([kpIdx, name]) => `${rKPs[kpIdx]?.id}:${name}`),
  ]);
  const activeInitIds = allInits.filter(i => seedInitSet.has(`${i.keyProcessId}:${i.name}`)).map(i => i.id);
  if (activeInitIds.length > 0) {
    await db.update(strategicInitiativesTable).set({ active: false }).where(notInArray(strategicInitiativesTable.id, activeInitIds));
  } else {
    await db.update(strategicInitiativesTable).set({ active: false });
  }
  console.log("Strategic initiatives seeded:", allInits.length);
  console.log("\nSeed completed successfully!");
  console.log("\nTest credentials:");
  console.log("  acramrajab@remax.com.br         / admin123       (master_admin)");
  console.log("  claudiaroncolatto@remax.com.br  / remax2026      (staff_regional)");
  console.log("  marinasandri@remax.com.br       / remax2026      (staff_regional)");
  console.log("  franqueado@remaxsc.com.br       / franqueado123  (franqueado)");
  console.log("  responsavel@remaxsc.com.br      / responsavel123 (responsavel_interno)");
  console.log("  regional@remaxsc.com.br         (staff_regional, DEACTIVATED — legacy account)");
}

seed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Seed error:", err);
    process.exit(1);
  });
