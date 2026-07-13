import { apiClient } from "@/lib/api/client";

export interface HealthData {
  status: "ok";
  service: string;
  timestamp: string;
}

export interface HealthResponse {
  success: boolean;
  data: HealthData;
}

export function getHealth(): Promise<HealthResponse> {
  return apiClient<HealthResponse>("/health", {
    cache: "no-store",
  });
}