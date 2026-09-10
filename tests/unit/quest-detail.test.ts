import { describe, expect, it } from "bun:test";
import {
  questBahtLabel,
  questCandidateModeLabel,
  questPercentLabel,
} from "../../src/features/admin/legacy/quest-detail";

describe("Quest financial display labels", () => {
  it("displays integer Satang values as Baht", () => {
    expect(questBahtLabel(50000)).toBe("฿500.00");
    expect(questBahtLabel(1)).toBe("฿0.01");
  });

  it("displays basis points as a percentage", () => {
    expect(questPercentLabel(200)).toBe("2%");
    expect(questPercentLabel(25)).toBe("0.25%");
  });

  it("does not display missing financial values as zero", () => {
    expect(questBahtLabel(null)).toBe("Not provided by the Admin API");
    expect(questPercentLabel(undefined)).toBe("Not provided by the Admin API");
  });

  it("uses readable Candidate mode labels", () => {
    expect(questCandidateModeLabel("FIRST_COME_FIRST_SERVED")).toBe("First come, first served");
    expect(questCandidateModeLabel("CANDIDATE")).toBe("Candidate selection");
  });
});
