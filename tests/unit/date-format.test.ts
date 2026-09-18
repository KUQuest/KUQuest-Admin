import { describe, expect, it } from "bun:test";

import { formatAdminTimestamp } from "../../src/features/admin/date-format";

describe("Admin timestamp formatting", () => {
  it("formats ISO timestamps as readable UTC date and time", () => {
    expect(formatAdminTimestamp("2026-08-27T08:30:00.000Z")).toBe("27 Aug 2026 08:30");
  });

  it("keeps an already formatted value unchanged", () => {
    expect(formatAdminTimestamp("27 Aug 2026 · 15:30 ICT")).toBe("27 Aug 2026 · 15:30 ICT");
  });
});
