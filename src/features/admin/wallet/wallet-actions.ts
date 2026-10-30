"use server";

import { cookies } from "next/headers";

import { getAdminSession } from "../../../lib/auth/admin-session";
import { adminSessionCookieHeader } from "../../../lib/auth/admin-session-policy";
import { adminApiRequestOptions } from "../api/admin-api-request-options";
import { adminApiProvider } from "../api/admin-provider";
import {
  loadWalletDrawerData,
  verifyWalletProjection,
  type WalletDrawerData,
} from "./wallet-service";
import type { WalletVerificationView } from "./wallet-model";

async function loadAuthenticatedWalletContext() {
  const session = await getAdminSession();
  if (session.kind !== "authenticated") throw new Error("Admin session is not available.");
  const cookieStore = await cookies();
  return adminSessionCookieHeader(cookieStore.getAll());
}

export async function loadWalletDrawerDataAction(walletId: string): Promise<WalletDrawerData> {
  if (!walletId.trim()) throw new Error("Wallet ID is required.");

  const cookieHeader = await loadAuthenticatedWalletContext();
  return loadWalletDrawerData(walletId, cookieHeader);
}

export async function verifyWalletProjectionAction(walletId: string): Promise<WalletVerificationView> {
  if (!walletId.trim()) throw new Error("Wallet ID is required.");

  const cookieHeader = await loadAuthenticatedWalletContext();
  return verifyWalletProjection(walletId, cookieHeader);
}

export async function rebuildWalletProjectionAction(walletId: string): Promise<void> {
  if (!walletId.trim()) throw new Error("Wallet ID is required.");

  const cookieHeader = await loadAuthenticatedWalletContext();
  await adminApiProvider.commands.rebuildWalletProjection(walletId, adminApiRequestOptions(cookieHeader));
}
