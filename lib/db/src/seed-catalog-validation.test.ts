import { describe, it, expect } from "vitest";
import {
  DIMENSION_SEED_DATA,
  PESSOAS_KEY_PROCESSES,
  RE_KEY_PROCESSES,
  PESSOAS_INITIATIVES,
  RE_INITIATIVES,
  EXPECTED_DIMENSION_COUNT,
  EXPECTED_PESSOAS_KP_COUNT,
  EXPECTED_RE_KP_COUNT,
  EXPECTED_PESSOAS_INIT_COUNT,
  EXPECTED_RE_INIT_COUNT,
  EXPECTED_TOTAL_INIT_COUNT,
} from "./seed-catalog-config.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function duplicates<T>(items: T[]): T[] {
  const seen = new Set<T>();
  const dupes: T[] = [];
  for (const item of items) {
    if (seen.has(item)) dupes.push(item);
    else seen.add(item);
  }
  return dupes;
}

// ── Dimensions ───────────────────────────────────────────────────────────────

describe("DIMENSION_SEED_DATA", () => {
  it(`has exactly ${EXPECTED_DIMENSION_COUNT} dimensions`, () => {
    expect(DIMENSION_SEED_DATA).toHaveLength(EXPECTED_DIMENSION_COUNT);
  });

  it("every dimension has a non-empty name", () => {
    for (const d of DIMENSION_SEED_DATA) {
      expect(d.name.trim(), `dimension name must not be blank`).not.toBe("");
    }
  });

  it("every dimension has a non-empty description", () => {
    for (const d of DIMENSION_SEED_DATA) {
      expect(d.description.trim(), `description for dimension "${d.name}" must not be blank`).not.toBe("");
    }
  });

  it("every dimension is active", () => {
    const inactive = DIMENSION_SEED_DATA.filter(d => !d.active).map(d => d.name);
    expect(inactive, `inactive dimensions: ${inactive.join(", ")}`).toHaveLength(0);
  });

  it("dimension names are unique", () => {
    const dupes = duplicates(DIMENSION_SEED_DATA.map(d => d.name));
    expect(dupes, `duplicate dimension names: ${dupes.join(", ")}`).toHaveLength(0);
  });

  it('includes "Pessoas" and "Real Estate"', () => {
    const names = DIMENSION_SEED_DATA.map(d => d.name);
    expect(names).toContain("Pessoas");
    expect(names).toContain("Real Estate");
  });
});

// ── Key Processes ─────────────────────────────────────────────────────────────

describe("PESSOAS_KEY_PROCESSES", () => {
  it(`has exactly ${EXPECTED_PESSOAS_KP_COUNT} key processes`, () => {
    expect(PESSOAS_KEY_PROCESSES).toHaveLength(EXPECTED_PESSOAS_KP_COUNT);
  });

  it("every key process has a non-empty name", () => {
    for (const kp of PESSOAS_KEY_PROCESSES) {
      expect(kp.name.trim(), `key process name must not be blank`).not.toBe("");
    }
  });

  it("every key process has a non-empty description", () => {
    for (const kp of PESSOAS_KEY_PROCESSES) {
      expect(kp.description.trim(), `description for "${kp.name}" must not be blank`).not.toBe("");
    }
  });

  it("names are unique within the dimension", () => {
    const dupes = duplicates(PESSOAS_KEY_PROCESSES.map(kp => kp.name));
    expect(dupes, `duplicate key process names: ${dupes.join(", ")}`).toHaveLength(0);
  });

  it("orderIndex values are sequential starting at 1", () => {
    const indices = PESSOAS_KEY_PROCESSES.map(kp => kp.orderIndex);
    const expected = PESSOAS_KEY_PROCESSES.map((_, i) => i + 1);
    expect(indices).toEqual(expected);
  });
});

describe("RE_KEY_PROCESSES", () => {
  it(`has exactly ${EXPECTED_RE_KP_COUNT} key processes`, () => {
    expect(RE_KEY_PROCESSES).toHaveLength(EXPECTED_RE_KP_COUNT);
  });

  it("every key process has a non-empty name", () => {
    for (const kp of RE_KEY_PROCESSES) {
      expect(kp.name.trim(), `key process name must not be blank`).not.toBe("");
    }
  });

  it("every key process has a non-empty description", () => {
    for (const kp of RE_KEY_PROCESSES) {
      expect(kp.description.trim(), `description for "${kp.name}" must not be blank`).not.toBe("");
    }
  });

  it("names are unique within the dimension", () => {
    const dupes = duplicates(RE_KEY_PROCESSES.map(kp => kp.name));
    expect(dupes, `duplicate key process names: ${dupes.join(", ")}`).toHaveLength(0);
  });

  it("orderIndex values are sequential starting at 1", () => {
    const indices = RE_KEY_PROCESSES.map(kp => kp.orderIndex);
    const expected = RE_KEY_PROCESSES.map((_, i) => i + 1);
    expect(indices).toEqual(expected);
  });
});

describe("key process names are unique across all dimensions", () => {
  it("no key process name appears in both Pessoas and Real Estate", () => {
    const pessoasNames = new Set(PESSOAS_KEY_PROCESSES.map(kp => kp.name));
    const crossDimDupes = RE_KEY_PROCESSES.map(kp => kp.name).filter(n => pessoasNames.has(n));
    expect(crossDimDupes, `names shared across dimensions: ${crossDimDupes.join(", ")}`).toHaveLength(0);
  });
});

// ── Strategic Initiatives: Pessoas ───────────────────────────────────────────

describe("PESSOAS_INITIATIVES", () => {
  it(`has exactly ${EXPECTED_PESSOAS_INIT_COUNT} initiatives`, () => {
    expect(PESSOAS_INITIATIVES).toHaveLength(EXPECTED_PESSOAS_INIT_COUNT);
  });

  it("every kpIndex references a valid PESSOAS_KEY_PROCESSES index", () => {
    const outOfRange = PESSOAS_INITIATIVES.filter(
      ([kpIdx]) => kpIdx < 0 || kpIdx >= PESSOAS_KEY_PROCESSES.length,
    );
    const details = outOfRange.map(([kpIdx, name]) => `"${name}" → kpIndex ${kpIdx}`);
    expect(outOfRange, `out-of-range kpIndex: ${details.join(", ")}`).toHaveLength(0);
  });

  it("every initiative has a non-empty name", () => {
    const blank = PESSOAS_INITIATIVES.filter(([, name]) => name.trim() === "");
    expect(blank, "blank initiative names found").toHaveLength(0);
  });

  it("every initiative has a non-empty KRI", () => {
    const blank = PESSOAS_INITIATIVES.filter(([, , kri]) => kri.trim() === "");
    expect(blank, "blank KRI strings found").toHaveLength(0);
  });

  it("every initiative has a non-empty KPI", () => {
    const blank = PESSOAS_INITIATIVES.filter(([, , , kpi]) => kpi.trim() === "");
    expect(blank, "blank KPI strings found").toHaveLength(0);
  });

  it("no duplicate initiative names within the same key process", () => {
    const seen = new Map<number, Set<string>>();
    const dupes: string[] = [];
    for (const [kpIdx, name] of PESSOAS_INITIATIVES) {
      if (!seen.has(kpIdx)) seen.set(kpIdx, new Set());
      const bucket = seen.get(kpIdx)!;
      if (bucket.has(name)) dupes.push(`kp[${kpIdx}] "${name}"`);
      else bucket.add(name);
    }
    expect(dupes, `duplicate initiatives: ${dupes.join(", ")}`).toHaveLength(0);
  });

  it("initiative names are globally unique within the dimension", () => {
    const dupes = duplicates(PESSOAS_INITIATIVES.map(([, name]) => name));
    expect(dupes, `duplicate initiative names: ${dupes.join(", ")}`).toHaveLength(0);
  });

  it("each key process index that appears covers only the expected KP name", () => {
    const kpIndicesUsed = new Set(PESSOAS_INITIATIVES.map(([kpIdx]) => kpIdx));
    for (const idx of kpIndicesUsed) {
      const kp = PESSOAS_KEY_PROCESSES[idx];
      expect(kp, `kpIndex ${idx} has no corresponding key process`).toBeDefined();
    }
  });
});

// ── Strategic Initiatives: Real Estate ───────────────────────────────────────

describe("RE_INITIATIVES", () => {
  it(`has exactly ${EXPECTED_RE_INIT_COUNT} initiatives`, () => {
    expect(RE_INITIATIVES).toHaveLength(EXPECTED_RE_INIT_COUNT);
  });

  it("every kpIndex references a valid RE_KEY_PROCESSES index", () => {
    const outOfRange = RE_INITIATIVES.filter(
      ([kpIdx]) => kpIdx < 0 || kpIdx >= RE_KEY_PROCESSES.length,
    );
    const details = outOfRange.map(([kpIdx, name]) => `"${name}" → kpIndex ${kpIdx}`);
    expect(outOfRange, `out-of-range kpIndex: ${details.join(", ")}`).toHaveLength(0);
  });

  it("every initiative has a non-empty name", () => {
    const blank = RE_INITIATIVES.filter(([, name]) => name.trim() === "");
    expect(blank, "blank initiative names found").toHaveLength(0);
  });

  it("every initiative has a non-empty KRI", () => {
    const blank = RE_INITIATIVES.filter(([, , kri]) => kri.trim() === "");
    expect(blank, "blank KRI strings found").toHaveLength(0);
  });

  it("every initiative has a non-empty KPI", () => {
    const blank = RE_INITIATIVES.filter(([, , , kpi]) => kpi.trim() === "");
    expect(blank, "blank KPI strings found").toHaveLength(0);
  });

  it("no duplicate initiative names within the same key process", () => {
    const seen = new Map<number, Set<string>>();
    const dupes: string[] = [];
    for (const [kpIdx, name] of RE_INITIATIVES) {
      if (!seen.has(kpIdx)) seen.set(kpIdx, new Set());
      const bucket = seen.get(kpIdx)!;
      if (bucket.has(name)) dupes.push(`kp[${kpIdx}] "${name}"`);
      else bucket.add(name);
    }
    expect(dupes, `duplicate initiatives: ${dupes.join(", ")}`).toHaveLength(0);
  });

  it("initiative names are globally unique within the dimension", () => {
    const dupes = duplicates(RE_INITIATIVES.map(([, name]) => name));
    expect(dupes, `duplicate initiative names: ${dupes.join(", ")}`).toHaveLength(0);
  });

  it("each key process index that appears covers only the expected KP name", () => {
    const kpIndicesUsed = new Set(RE_INITIATIVES.map(([kpIdx]) => kpIdx));
    for (const idx of kpIndicesUsed) {
      const kp = RE_KEY_PROCESSES[idx];
      expect(kp, `kpIndex ${idx} has no corresponding key process`).toBeDefined();
    }
  });
});

// ── Cross-dimension ───────────────────────────────────────────────────────────

describe("cross-dimension initiative integrity", () => {
  it(`total initiative count is ${EXPECTED_TOTAL_INIT_COUNT}`, () => {
    expect(PESSOAS_INITIATIVES.length + RE_INITIATIVES.length).toBe(EXPECTED_TOTAL_INIT_COUNT);
  });

  it("no initiative name is duplicated across both dimensions", () => {
    const pessoasNames = new Set(PESSOAS_INITIATIVES.map(([, name]) => name));
    const crossDupes = RE_INITIATIVES.map(([, name]) => name).filter(n => pessoasNames.has(n));
    expect(crossDupes, `names shared across dimensions: ${crossDupes.join(", ")}`).toHaveLength(0);
  });

  it("all kpIndexes used in PESSOAS_INITIATIVES are covered by PESSOAS_KEY_PROCESSES", () => {
    const usedIndices = [...new Set(PESSOAS_INITIATIVES.map(([kpIdx]) => kpIdx))].sort((a, b) => a - b);
    const validIndices = PESSOAS_KEY_PROCESSES.map((_, i) => i);
    for (const idx of usedIndices) {
      expect(validIndices, `kpIndex ${idx} is used but PESSOAS_KEY_PROCESSES only has ${PESSOAS_KEY_PROCESSES.length} entries`).toContain(idx);
    }
  });

  it("all kpIndexes used in RE_INITIATIVES are covered by RE_KEY_PROCESSES", () => {
    const usedIndices = [...new Set(RE_INITIATIVES.map(([kpIdx]) => kpIdx))].sort((a, b) => a - b);
    const validIndices = RE_KEY_PROCESSES.map((_, i) => i);
    for (const idx of usedIndices) {
      expect(validIndices, `kpIndex ${idx} is used but RE_KEY_PROCESSES only has ${RE_KEY_PROCESSES.length} entries`).toContain(idx);
    }
  });
});

// ── Per-KP coverage ──────────────────────────────────────────────────────────

describe("key process coverage — every key process has at least one initiative", () => {
  it("every PESSOAS key process has at least one initiative assigned", () => {
    const usedIndices = new Set(PESSOAS_INITIATIVES.map(([kpIdx]) => kpIdx));
    for (let i = 0; i < PESSOAS_KEY_PROCESSES.length; i++) {
      expect(
        usedIndices.has(i),
        `PESSOAS key process [${i}] "${PESSOAS_KEY_PROCESSES[i].name}" has no initiatives`,
      ).toBe(true);
    }
  });

  it("every RE key process has at least one initiative assigned", () => {
    const usedIndices = new Set(RE_INITIATIVES.map(([kpIdx]) => kpIdx));
    for (let i = 0; i < RE_KEY_PROCESSES.length; i++) {
      expect(
        usedIndices.has(i),
        `RE key process [${i}] "${RE_KEY_PROCESSES[i].name}" has no initiatives`,
      ).toBe(true);
    }
  });
});
