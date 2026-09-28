import { CONDUCT_REPORT_UPDATED_EVENT } from "../conduct-report/conduct-report-model";
import { DISPUTE_CASE_UPDATED_EVENT } from "../dispute/dispute-model";
import { PAYOUT_MOCK_UPDATED_EVENT } from "../payout/payout-mock-state";
import { REPORT_CASE_UPDATED_EVENT } from "../report/report-model";

/** Events that can change the Overview and Admin navigation queue counts. */
export const ADMIN_DATA_UPDATED_EVENTS = [
  CONDUCT_REPORT_UPDATED_EVENT,
  DISPUTE_CASE_UPDATED_EVENT,
  PAYOUT_MOCK_UPDATED_EVENT,
  REPORT_CASE_UPDATED_EVENT,
] as const;

type WindowEventListener = EventListenerOrEventListenerObject;

export function subscribeToAdminDataUpdates(listener: WindowEventListener) {
  ADMIN_DATA_UPDATED_EVENTS.forEach((eventName) => window.addEventListener(eventName, listener));
  return () => {
    ADMIN_DATA_UPDATED_EVENTS.forEach((eventName) => window.removeEventListener(eventName, listener));
  };
}

export function subscribeToStorageUpdates(listener: WindowEventListener) {
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}
