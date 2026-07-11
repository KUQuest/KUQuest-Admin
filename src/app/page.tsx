import { getHealth } from "@/features/health/health.service";

export default async function Home() {
  const health = await getHealth();

  const status: "ok" = health.data.status;
  const service: string = health.data.service;
  const timestamp: string = health.data.timestamp;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <section className="space-y-4 rounded-xl border p-8">
        <h1 className="text-3xl font-bold">KUQuest Admin</h1>

        <p>
          Backend status:{" "}
          <strong className="text-green-600">{status}</strong>
        </p>

        <p>Service: {service}</p>
        <p>Checked at: {new Date(timestamp).toLocaleString()}</p>
      </section>
    </div>
  );
}