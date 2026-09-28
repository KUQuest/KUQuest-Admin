import { describe, expect, it } from "bun:test";

import { formatAdminTimestamp } from "../../src/features/admin/date-format";

describe("Admin timestamp formatting", () => {
  it("formats ISO timestamps as readable UTC date and time", () => {
    expect(formatAdminTimestamp("2026-08-27T08:30:00.000Z")).toBe("27 Aug 2026 08:30");
  });

  it("normalises legacy display values to the Admin timestamp pattern", () => {
    expect(formatAdminTimestamp("27 Aug 2026 · 15:30 ICT")).toBe("27 Aug 2026 15:30");
    expect(formatAdminTimestamp("27 Aug 2026, 15:30 ICT")).toBe("27 Aug 2026 15:30");
    expect(formatAdminTimestamp("27 Aug 2026 15:30")).toBe("27 Aug 2026 15:30");
    expect(formatAdminTimestamp("19 Sept 2026 · 19:00 ICT")).toBe("19 Sep 2026 19:00");
  });

  it("keeps the selected local timezone for domain timestamps", () => {
    expect(formatAdminTimestamp("2026-08-27T08:30:00.000Z", "Asia/Bangkok")).toBe("27 Aug 2026 15:30");
  });
});
