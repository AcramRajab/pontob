/**
 * One-time script: create the "RE/MAX Franquia DEMO" franchise and demo users.
 * Run: pnpm --filter @workspace/scripts run create-demo-franchise
 */
import { db } from "@workspace/db";
import { franchisesTable, usersTable } from "@workspace/db/schema";
import bcrypt from "bcryptjs";

const FRANCHISE_NAME = "RE/MAX Franquia DEMO";

async function main() {
  // ── Franchise ──────────────────────────────────────────────────────────────
  const [franchise] = await db
    .insert(franchisesTable)
    .values({
      name: FRANCHISE_NAME,
      city: "Florianópolis",
      state: "SC",
      brokerOwnerName: "Demo Franqueado",
      contactEmail: "demo@remaxsc.com.br",
      active: true,
    })
    .onConflictDoUpdate({
      target: franchisesTable.name,
      set: { active: true },
    })
    .returning();

  console.log(`Franquia: ${franchise.name} (id ${franchise.id})`);

  // ── Demo users ─────────────────────────────────────────────────────────────
  const demoPassword = "demo2026";
  const hash = await bcrypt.hash(demoPassword, 10);

  const users = [
    {
      name: "Demo Franqueado",
      email: "demo@remaxsc.com.br",
      passwordHash: hash,
      role: "franqueado" as const,
      franchiseId: franchise.id,
      active: true,
    },
    {
      name: "Demo Responsável",
      email: "demo.resp@remaxsc.com.br",
      passwordHash: hash,
      role: "responsavel_interno" as const,
      franchiseId: franchise.id,
      active: true,
    },
  ];

  for (const u of users) {
    const [inserted] = await db
      .insert(usersTable)
      .values(u)
      .onConflictDoUpdate({
        target: usersTable.email,
        set: {
          passwordHash: hash,
          franchiseId: franchise.id,
          active: true,
          name: u.name,
          role: u.role,
        },
      })
      .returning({ id: usersTable.id, email: usersTable.email, role: usersTable.role });

    console.log(`Usuário criado: ${inserted.email} (${inserted.role}) — senha: ${demoPassword}`);
  }

  console.log("\nPronto! Credenciais de demo:");
  console.log(`  Franqueado    → demo@remaxsc.com.br     / ${demoPassword}`);
  console.log(`  Responsável   → demo.resp@remaxsc.com.br / ${demoPassword}`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
