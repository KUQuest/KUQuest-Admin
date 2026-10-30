import { describe, expect, it } from "bun:test";

import {
  moderationActionLabel,
  moderationMemberStatusLabel,
} from "../../src/features/admin/moderation-case/moderation-case-context";
import { translateAdminText } from "../../src/features/admin/language/admin-language";
import { statusBadgeClass } from "../../src/features/admin/status-badge";

describe("Member moderation action labels", () => {
  it("maps API action codes to readable English and Thai labels", () => {
    for (const [action, label] of [
      ["REPORT_CASE_DISMISS", "Report Case dismissed"],
      ["REPORT_CASE_HIDE", "Message hidden"],
      ["REPORT_CASE_RESTORE", "Message restored"],
      ["CONDUCT_REPORT_DISMISS", "Conduct Report dismissed"],
      ["CONDUCT_REPORT_UPHOLD", "Conduct Report upheld"],
    ]) {
      const displayLabel = moderationActionLabel(action);
      expect(displayLabel).toBe(label);
      expect(displayLabel).not.toContain("_");
      expect(translateAdminText("th", displayLabel)).not.toBe(displayLabel);
    }
  });

  it("keeps human labels and makes unknown enum values readable", () => {
    expect(moderationActionLabel("Red Flag")).toBe("Red Flag");
    expect(moderationActionLabel("PENALTY_EXEMPT")).toBe("Penalty Exempt");
  });

  it("maps API Member statuses to the existing colored badge styles", () => {
    for (const [status, label, badgeClass] of [
      ["NORMAL", "Normal", "status-member-normal"],
      ["RED_FLAG", "Flag", "status-member-flag"],
      ["TEMPORARY_BAN", "Temp Ban", "status-member-temp-ban"],
      ["PERMANENT_BAN", "Perm Ban", "status-member-perm-ban"],
    ]) {
      const displayLabel = moderationMemberStatusLabel(status);
      expect(displayLabel).toBe(label);
      expect(statusBadgeClass(displayLabel ?? "")).toBe(badgeClass);
    }

    expect(moderationMemberStatusLabel("UNRECOGNIZED_STATUS")).toBeNull();
    expect(moderationMemberStatusLabel(null)).toBeNull();
  });
});
