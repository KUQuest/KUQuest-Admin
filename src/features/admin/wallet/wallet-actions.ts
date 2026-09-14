"use server";

import { getAdminSession } from "../../../lib/auth/admin-session";
import {
  loadWalletDrawerData,
  loadWalletRouteContext,
  verifyWalletProjection,
  type WalletDrawerData,
} from "./wallet-service";
import type { WalletVerificationView } from "./wallet-model";

async function loadAuthenticatedWalletContext() {
  const session = await getAdminSession();
  if (session.kind !== "authenticated") throw new Error("Admin session is not available.");
  return loadWalletRouteContext();
}

export async function loadWalletDrawerDataAction(walletId: string): Promise<WalletDrawerData> {
  if (!walletId.trim()) throw new Error("Wallet ID is required.");

  const { dataSource, cookieHeader } = await loadAuthenticatedWalletContext();
  return loadWalletDrawerData(walletId, cookieHeader, dataSource);
}

export async function verifyWalletProjectionAction(walletId: string): Promise<WalletVerificationView> {
  if (!walletId.trim()) throw new Error("Wallet ID is required.");

  const { dataSource, cookieHeader } = await loadAuthenticatedWalletContext();
  return verifyWalletProjection(walletId, cookieHeader, dataSource);
}
