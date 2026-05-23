import { describe, it, expect } from "vitest";
import { validateSeedData } from "./seed-validation.js";
import { USER_SEED_CONFIG, PERMANENTLY_DEACTIVATED_EMAILS } from "./seed-config.js";

const DEACTIVATED = ["admin@remaxsc.com.br", "regional@remaxsc.com.br"];

describe("validateSeedData", () => {
  it("passes when no permanently-deactivated email appears in userData", () => {
    expect(() =>
      validateSeedData(
        [
          { email: "acramrajab@remax.com.br",        active: true  },
          { email: "claudiaroncolatto@remax.com.br", active: true  },
          { email: "regional@remaxsc.com.br",        active: false },
        ],
        DEACTIVATED,
      ),
    ).not.toThrow();
  });

  it("passes when userData is empty", () => {
    expect(() => validateSeedData([], DEACTIVATED)).not.toThrow();
  });

  it("passes when permanentlyDeactivatedEmails is empty", () => {
    expect(() =>
      validateSeedData(
        [{ email: "admin@remaxsc.com.br", active: true }],
        [],
      ),
    ).not.toThrow();
  });

  it("throws when a deactivated email appears as active: true", () => {
    expect(() =>
      validateSeedData(
        [
          { email: "acramrajab@remax.com.br", active: true  },
          { email: "admin@remaxsc.com.br",    active: true  },
        ],
        DEACTIVATED,
      ),
    ).toThrow(/admin@remaxsc\.com\.br/);
  });

  it("throws when regional@remaxsc.com.br is accidentally marked active", () => {
    expect(() =>
      validateSeedData(
        [
          { email: "regional@remaxsc.com.br", active: true },
        ],
        DEACTIVATED,
      ),
    ).toThrow(/regional@remaxsc\.com\.br/);
  });

  it("throws listing all violating accounts when multiple violations exist", () => {
    expect(() =>
      validateSeedData(
        [
          { email: "admin@remaxsc.com.br",    active: true },
          { email: "regional@remaxsc.com.br", active: true },
        ],
        DEACTIVATED,
      ),
    ).toThrow(/admin@remaxsc\.com\.br[\s\S]*regional@remaxsc\.com\.br/);
  });

  it("does not throw when a deactivated email appears as active: false", () => {
    expect(() =>
      validateSeedData(
        [
          { email: "admin@remaxsc.com.br",    active: false },
          { email: "regional@remaxsc.com.br", active: false },
        ],
        DEACTIVATED,
      ),
    ).not.toThrow();
  });

  it("error message contains guidance about setting active: false", () => {
    let error: Error | null = null;
    try {
      validateSeedData(
        [{ email: "admin@remaxsc.com.br", active: true }],
        DEACTIVATED,
      );
    } catch (e) {
      error = e as Error;
    }
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/active: false/);
    expect(error!.message).toMatch(/Seed validation failed/);
  });
});

describe("USER_SEED_CONFIG regression — actual seed data must never violate deactivation rules", () => {
  it("USER_SEED_CONFIG passes validation against PERMANENTLY_DEACTIVATED_EMAILS", () => {
    expect(() =>
      validateSeedData(USER_SEED_CONFIG, PERMANENTLY_DEACTIVATED_EMAILS),
    ).not.toThrow();
  });

  it("every PERMANENTLY_DEACTIVATED_EMAIL present in USER_SEED_CONFIG has active: false", () => {
    const deactivatedSet = new Set(PERMANENTLY_DEACTIVATED_EMAILS);
    const violations = USER_SEED_CONFIG.filter(
      u => deactivatedSet.has(u.email) && u.active,
    );
    expect(violations).toHaveLength(0);
  });
});
