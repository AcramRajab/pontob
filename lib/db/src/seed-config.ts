/**
 * Seed configuration — no database imports, safe to import anywhere including tests.
 *
 * This is the single source of truth for which users are seeded and whether they
 * are active. `seed.ts` derives full DB insert rows from these entries (adding
 * passwordHash and franchiseId at runtime). `seed-validation.ts` validates this
 * same list, so there is no way for the validated data to diverge from what is
 * actually written.
 */

export const PERMANENTLY_DEACTIVATED_EMAILS: string[] = [
  "admin@remaxsc.com.br",
  "regional@remaxsc.com.br",
];

export interface UserSeedEntry {
  name: string;
  email: string;
  role: string;
  franchiseName: string | null;
  password: string;
  active: boolean;
}

export const USER_SEED_CONFIG: UserSeedEntry[] = [
  { name: "Acram Rajab",        email: "acramrajab@remax.com.br",        role: "master_admin",        franchiseName: null,                   password: "admin123",       active: true  },
  { name: "Claudia Roncolatto", email: "claudiaroncolatto@remax.com.br", role: "staff_regional",      franchiseName: null,                   password: "remax2026",      active: true  },
  { name: "Marina Sandri",      email: "marinasandri@remax.com.br",      role: "staff_regional",      franchiseName: null,                   password: "remax2026",      active: true  },
  { name: "Carlos Mendes",      email: "franqueado@remaxsc.com.br",      role: "franqueado",          franchiseName: "RE/MAX Franquia Teste", password: "franqueado123",  active: true  },
  { name: "Maria Costa",        email: "responsavel@remaxsc.com.br",     role: "responsavel_interno", franchiseName: "RE/MAX Franquia Teste", password: "responsavel123", active: true  },
  { name: "Regional (legacy)",  email: "regional@remaxsc.com.br",        role: "staff_regional",      franchiseName: null,                   password: "remax2026",      active: false },
];
