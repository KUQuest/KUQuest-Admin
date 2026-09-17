"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { isAdminMockEnabled } from "../../../lib/auth/admin-auth-mode";
import {
  loadOverviewMockData,
} from "../overview/overview-adapter";
import {
  overviewSearchResultLabel,
  overviewSearchResultsFromApi,
  overviewSearchResultsFromMockData,
  type OverviewApiSearchData,
  type OverviewSearchResult,
} from "../overview/overview-model";

type AdminGlobalSearchProps = {
  open: boolean;
  onClose: () => void;
  initialData?: OverviewApiSearchData | null;
  initialError?: string | null;
};

type SearchFilter = "all" | OverviewSearchResult["kind"];

type SavedSearchFilter = {
  id: string;
  name: string;
  query: string;
  kind: SearchFilter;
};

const SEARCH_FILTER_STORAGE_KEY = "kuquest-admin-saved-search-filters-v1";
const SEARCH_QUERY_PARAM = "adminSearch";
const SEARCH_KIND_PARAM = "adminSearchType";

const searchFilterOptions: Array<{ value: SearchFilter; label: string }> = [
  { value: "all", label: "All records" },
  { value: "member", label: "Member" },
  { value: "quest", label: "Quest" },
  { value: "payout", label: "Payout" },
  { value: "dispute", label: "Dispute Case" },
  { value: "report", label: "Report Case" },
  { value: "conduct-report", label: "Conduct Report" },
  { value: "wallet", label: "Wallet" },
  { value: "activity", label: "Activity Log" },
];

function isSearchFilter(value: string | null): value is SearchFilter {
  return value === "all" || searchFilterOptions.some((option) => option.value === value);
}

function searchResultMarker(kind: OverviewSearchResult["kind"]): string {
  switch (kind) {
    case "member": return "M";
    case "quest": return "Q";
    case "payout": return "P";
    case "dispute": return "D";
    case "report": return "R";
    case "conduct-report": return "C";
    case "wallet": return "W";
    case "activity": return "A";
  }
}

function readSavedSearchFilters(): SavedSearchFilter[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SEARCH_FILTER_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((value): SavedSearchFilter[] => {
      if (!value || typeof value !== "object") return [];
      const record = value as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id : "";
      const name = typeof record.name === "string" ? record.name : "";
      const query = typeof record.query === "string" ? record.query : "";
      const kind = typeof record.kind === "string" && isSearchFilter(record.kind) ? record.kind : "all";
      return id && name ? [{ id, name, query, kind }] : [];
    });
  } catch {
    return [];
  }
}

function saveSearchFilters(filters: SavedSearchFilter[]): void {
  try {
    localStorage.setItem(SEARCH_FILTER_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // The saved view is a convenience. The current search remains usable when storage is unavailable.
  }
}

function syncSearchParams(query: string, kind: SearchFilter): void {
  const url = new URL(window.location.href);
  if (query.trim()) url.searchParams.set(SEARCH_QUERY_PARAM, query.trim());
  else url.searchParams.delete(SEARCH_QUERY_PARAM);
  if (kind !== "all") url.searchParams.set(SEARCH_KIND_PARAM, kind);
  else url.searchParams.delete(SEARCH_KIND_PARAM);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function groupResults(results: OverviewSearchResult[]): Array<{ kind: OverviewSearchResult["kind"]; items: OverviewSearchResult[] }> {
  const groups = new Map<OverviewSearchResult["kind"], OverviewSearchResult[]>();
  results.forEach((result) => {
    const current = groups.get(result.kind) ?? [];
    current.push(result);
    groups.set(result.kind, current);
  });
  return Array.from(groups.entries()).map(([kind, items]) => ({ kind, items }));
}

export function AdminGlobalSearch({ open, onClose, initialData, initialError }: AdminGlobalSearchProps) {
  const { translateText } = useAdminShell();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<SearchFilter>("all");
  const [savedFilters, setSavedFilters] = useState<SavedSearchFilter[]>([]);
  const [saveName, setSaveName] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [data, setData] = useState<{ source: "mock"; data: ReturnType<typeof loadOverviewMockData> } | { source: "api"; data: OverviewApiSearchData } | null>(
    initialData ? { source: "api", data: initialData } : null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get(SEARCH_QUERY_PARAM) ?? "");
    setKind(isSearchFilter(params.get(SEARCH_KIND_PARAM)) ? params.get(SEARCH_KIND_PARAM) as SearchFilter : "all");
    setSavedFilters(readSavedSearchFilters());
    setSaveMessage("");
    setData(initialData
      ? { source: "api", data: initialData }
      : isAdminMockEnabled()
        ? { source: "mock", data: loadOverviewMockData(localStorage) }
        : null);
    window.setTimeout(() => inputRef.current?.focus(), 0);

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [initialData, onClose, open]);

  const allResults = useMemo(() => {
    if (data?.source === "mock") return overviewSearchResultsFromMockData(data.data, query);
    if (data?.source === "api") return overviewSearchResultsFromApi(data.data, query);
    return [];
  }, [data, query]);
  const results = useMemo(
    () => kind === "all" ? allResults : allResults.filter((result) => result.kind === kind),
    [allResults, kind],
  );
  const groups = useMemo(() => groupResults(results), [results]);

  const applySavedFilter = (filter: SavedSearchFilter) => {
    setQuery(filter.query);
    setKind(filter.kind);
    syncSearchParams(filter.query, filter.kind);
    setSaveMessage(translateText(`Loaded saved filter: ${filter.name}`));
  };

  const saveCurrentFilter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = saveName.trim();
    if (!name) return;
    const nextFilter: SavedSearchFilter = {
      id: `saved-${Date.now()}`,
      name,
      query: query.trim(),
      kind,
    };
    const nextFilters = [nextFilter, ...savedFilters.filter((filter) => filter.name.toLowerCase() !== name.toLowerCase())].slice(0, 12);
    setSavedFilters(nextFilters);
    saveSearchFilters(nextFilters);
    setSaveName("");
    setSaveMessage(translateText(`Saved filter: ${name}`));
  };

  if (!open) return null;

  return (
    <dialog open id="overview-command" className="command" aria-modal="true" aria-labelledby="admin-global-search-title" data-global-search="true">
      <button className="command-backdrop" type="button" aria-label={translateText("Close search")} onClick={onClose} />
      <div className="command-box admin-global-search-box">
        <div className="command-input">
          <span aria-hidden="true">⌕</span>
          <h2 id="admin-global-search-title" className="visually-hidden">{translateText("Search marketplace records")}</h2>
          <input
            ref={inputRef}
            type="search"
            aria-label={translateText("Search marketplace records")}
            placeholder={translateText("Search Member, Quest, Report Case, Wallet, or Payout…")}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              syncSearchParams(event.target.value, kind);
            }}
          />
          <button className="icon" type="button" aria-label={translateText("Close search")} onClick={onClose}>
            <span className="close-lines" />
          </button>
        </div>
        <div className="admin-global-search-controls">
          <label htmlFor="admin-global-search-type">{translateText("Search type")}
              <select id="admin-global-search-type" value={kind} onChange={(event) => {
                const nextKind = isSearchFilter(event.target.value) ? event.target.value : "all";
                setKind(nextKind);
                syncSearchParams(query, nextKind);
              }}>
              {searchFilterOptions.map((option) => <option key={option.value} value={option.value}>{translateText(option.label)}</option>)}
            </select>
          </label>
          <form className="admin-global-search-save" onSubmit={saveCurrentFilter}>
            <label htmlFor="admin-global-search-save-name">{translateText("Save this filter")}
              <input id="admin-global-search-save-name" type="text" value={saveName} onChange={(event) => setSaveName(event.target.value)} placeholder={translateText("Filter name")} />
            </label>
            <button className="btn" type="submit" disabled={!saveName.trim()}>{translateText("Save")}</button>
          </form>
        </div>
        {savedFilters.length ? <div className="admin-global-search-saved" aria-label={translateText("Saved filters")}>
          <span>{translateText("Saved filters")}</span>
          {savedFilters.map((filter) => <button key={filter.id} className="link" type="button" onClick={() => applySavedFilter(filter)}>{filter.name}</button>)}
        </div> : null}
        {saveMessage ? <output className="admin-global-search-message">{saveMessage}</output> : null}
        <div id="admin-global-search-results" aria-live="polite">
          {initialError && !data ? <p className="empty">{translateText(initialError)}</p> : null}
          {data?.source === "mock" ? <p className="api-data-notice admin-global-search-notice">{translateText("Fixture search is active. Results use local demo records.")}</p> : null}
          {groups.map((group) => (
            <section key={group.kind} className="admin-global-search-group" aria-labelledby={`admin-global-search-group-${group.kind}`}>
              <h3 id={`admin-global-search-group-${group.kind}`}>{translateText(overviewSearchResultLabel(group.kind))}<span>{group.items.length}</span></h3>
              {group.items.map((result) => (
                <Link key={`${result.kind}-${result.id}`} className="result" href={result.href} onClick={onClose}>
                  <span className="admin-global-search-marker" aria-hidden="true">{searchResultMarker(result.kind)}</span>
                  <span><strong>{result.title}</strong><small>{result.id} · {translateText(result.detail)}</small></span>
                  <small>{translateText(overviewSearchResultLabel(result.kind))}</small>
                </Link>
              ))}
            </section>
          ))}
          {!initialError && query && !results.length ? <p className="empty">{translateText("No matching records")}</p> : null}
          {!initialError && !query ? <p className="empty">{translateText("Type an ID, name, or status to search all Admin records.")}</p> : null}
        </div>
      </div>
    </dialog>
  );
}
