"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { loadDashboardData } from "./dashboard-bootstrap";
import { hardNavigate } from "../navigation";
import {
  dashboardModel,
  type DashboardActivity,
  type DashboardModel,
  type DashboardTone,
} from "./dashboard-model";

const ACTIVITY_STORAGE_KEY = "kuquest-admin-activity-v2";

function activityEvents(): DashboardActivity[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(ACTIVITY_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry): DashboardActivity[] => {
      if (!entry || typeof entry !== "object") return [];
      const record = entry as Record<string, unknown>;
      return [{
        actor: typeof record.actor === "string" ? record.actor : "NP",
        title: typeof record.title === "string" ? record.title : "Administrative activity",
        detail: typeof record.detail === "string" ? record.detail : "",
        timestamp: typeof record.timestamp === "number" ? record.timestamp : 0,
      }];
    });
  } catch {
    return [];
  }
}

function relativeTime(timestamp: number): string {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function Badge({ status, tone }: { status: string; tone: DashboardTone }) {
  const slug = status.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return <span className={`badge ${tone} quest-status-${slug}`}>{status}</span>;
}

function dashboardHref(view: "disputes" | "reports", id: string): string {
  return `/${view}/${encodeURIComponent(id)}`;
}

export function AdminDashboard() {
  const [model, setModel] = useState<DashboardModel | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadDashboard = async () => {
      const data = loadDashboardData(localStorage);
      if (!cancelled) setModel(dashboardModel(data, activityEvents()));
      await import("../legacy/language");
    };
    void loadDashboard().catch((error: unknown) => console.error(error));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!model) {
    return <main id="dashboard-main" tabIndex={-1}><section className="panel"><p>Loading marketplace overview…</p></section></main>;
  }

  return (
    <main id="dashboard-main" tabIndex={-1}>
      <div className="page-head">
        <div><h1>Overview</h1></div>
        <Link className="btn primary" href="/?view=disputes">Open review queue</Link>
      </div>
      <section className="dashboard-stats" aria-label="Marketplace overview">
            <div className="stat"><span>Active disputes</span><strong>{model.activeDisputes}</strong></div>
            <div className="stat"><span>Payouts needing review</span><strong>{model.payoutsNeedingReview}</strong></div>
            <div className="stat"><span>Open report</span><strong>{model.openReports}</strong></div>
            <div className="stat dashboard-stat-work-left"><span>Total work left</span><strong>{model.totalWorkLeft}</strong></div>
          </section>
          <div className="grid dashboard-grid">
            <section className="panel">
              <div className="panel-head">
                <div><h2>Latest dispute/report</h2><p>Showing {model.decisions.length} latest dispute/report records</p></div>
                <Link className="link" href="/?view=activity">View activity</Link>
              </div>
              {model.decisions.length ? model.decisions.map((decision) => (
                <Link className="attention" href={dashboardHref(decision.view, decision.id)} onClick={hardNavigate} key={`${decision.view}-${decision.id}`}>
                  <span className={`att-icon ${decision.tone}`} aria-hidden="true">{decision.view === "disputes" ? "⚖" : "⚑"}</span>
                  <span><strong>{decision.title}</strong><small>{decision.detail}</small></span>
                  <span><strong>{decision.metric}</strong><small>{decision.age}</small></span>
                </Link>
              )) : <div className="empty"><h3>No decisions waiting</h3><p>All current records are clear or processing normally.</p></div>}
            </section>
            <aside>
              <section className="panel">
                <div className="panel-head">
                  <div><h2>Quest flow</h2><p>Current marketplace distribution</p></div>
                  <Link className="link" href="/?view=quests">Open quests</Link>
                </div>
                <div className="dashboard-status-list">
                  {model.questStatusCounts.map((entry) => <div key={entry.status}><Badge status={entry.status} tone={entry.tone} /><strong>{entry.count}</strong></div>)}
                </div>
              </section>
            </aside>
          </div>
          <div className="dashboard-lower">
            <section className="panel">
              <div className="panel-head">
                <div><h2>Recent Payout Request</h2><p>Money movement requiring a closer look</p></div>
                <Link className="link" href="/?view=payouts">Open payouts</Link>
              </div>
              {model.payouts.length ? model.payouts.map((record) => (
                <Link className="dashboard-row" href="/?view=payouts" key={record.id}>
                  <span><strong>{record.id}</strong><small>{record.title} · {record.detail}</small></span>
                  <strong>฿{new Intl.NumberFormat("en-US").format(record.amount ?? 0)}</strong>
                  <Badge status={record.status} tone={record.tone} />
                </Link>
              )) : <div className="empty"><h3>No payouts need review</h3><p>Processing and completed payouts are moving normally.</p></div>}
            </section>
            <section className="panel">
              <div className="panel-head">
                <div><h2>Recent User penalty</h2><p>Accounts that may need a moderator</p></div>
                <Link className="link" href="/?view=users">Open users</Link>
              </div>
              {model.users.length ? model.users.map((record) => (
                <Link className="dashboard-row" href={`/?view=users&user=${encodeURIComponent(record.id)}`} key={record.id}>
                  <span><strong>{record.title}</strong><small>{record.id} · {record.detail}</small></span>
                  <Badge status={record.status} tone={record.tone} />
                </Link>
              )) : <div className="empty"><h3>No user reviews</h3><p>All accounts are currently in good standing.</p></div>}
            </section>
          </div>
      <section className="panel dashboard-activity">
            <div className="panel-head"><div><h2>Recent activity</h2><p>Latest administrative trail</p></div></div>
            {model.activity.length ? model.activity.map((entry) => (
              <ul className="activity" key={`${entry.timestamp}-${entry.actor}-${entry.title}`}>
                <li><span className="avatar">{entry.actor}</span><span><strong>{entry.title}</strong><p>{entry.detail}</p><time>{relativeTime(entry.timestamp)}</time></span></li>
              </ul>
            )) : <div className="empty"><h3>No activity recorded</h3><p>Administrative activity will appear here as actions are taken.</p></div>}
      </section>
    </main>
  );
}
