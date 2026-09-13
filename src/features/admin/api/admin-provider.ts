import {
  adminApiCommandPort,
  adminApiReadPort,
  type AdminCommandPort,
  type AdminReadPort,
} from "./admin-api";

export type AdminProvider = {
  read: AdminReadPort;
  commands: AdminCommandPort;
};

export function isAdminApiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE === "api";
}

// The live provider is defined now so screens can switch providers without
// changing their domain contracts. It is not selected by the demo runtime.
export const adminApiProvider: AdminProvider = {
  read: adminApiReadPort,
  commands: adminApiCommandPort,
};
