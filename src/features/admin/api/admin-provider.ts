import {
  adminApi,
  adminApiCommandPort,
  adminApiReadPort,
  type AdminCommandPort,
  type AdminReadPort,
} from "./admin-api";

export type AdminProvider = {
  auth: AdminAuthPort;
  read: AdminReadPort;
  commands: AdminCommandPort;
};

export type AdminAuthPort = Pick<
  typeof adminApi,
  "signInEmail" | "getSession" | "signOut"
>;

// All Admin reads and commands use the Admin API provider.
export const adminApiProvider: AdminProvider = {
  auth: adminApi,
  read: adminApiReadPort,
  commands: adminApiCommandPort,
};
