import { describe, expect, it } from "bun:test";

import {
  formatWalletStatementDateInput,
  parseWalletStatementDateInput,
} from "../../src/features/admin/member/member-wallet-model";

describe("Member Wallet Statement date input", () => {
  it("uses day/month/year in the UI and ISO dates in the filter model", () => {
    expect(parseWalletStatementDateInput("15/08/2026")).toBe("2026-08-15");
    expect(formatWalletStatementDateInput("2026-08-15")).toBe("15/08/2026");
    expect(parseWalletStatementDateInput("")).toBe("");
  });

  it("rejects dates that do not exist", () => {
    expect(parseWalletStatementDateInput("31/02/2026")).toBeNull();
    expect(parseWalletStatementDateInput("1/8/2026")).toBeNull();
  });
});
