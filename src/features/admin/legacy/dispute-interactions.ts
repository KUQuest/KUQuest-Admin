import type { LegacyAdminRuntime, LegacyRecord } from "./runtime";

type DisputeRecord = LegacyRecord & {
  other: string;
  person: string;
};

function isDisputeRecord(record: LegacyRecord | undefined): record is DisputeRecord {
  return Boolean(
    record
    && typeof record.other === "string"
    && typeof record.person === "string",
  );
}

export function initializeDisputeInteractions(
  _document: Document,
  runtime: LegacyAdminRuntime,
  openDisputeDrawer: (index: number) => void,
): (index: number) => void {
  return (index) => {
    openDisputeDrawer(index);
    const record = runtime.data.disputes[index];
    if (!isDisputeRecord(record)) return;
    runtime.drawer.querySelectorAll<HTMLElement>(".position").forEach((position) => {
      position.tabIndex = 0;
      position.setAttribute("role", "button");
      position.setAttribute("aria-label", "View participant statement details");
      position.addEventListener("click", () => runtime.toast(`Participant statement opened for ${record.id}`));
      position.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        position.click();
      });
    });
  };
}
