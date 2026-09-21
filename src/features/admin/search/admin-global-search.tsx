"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { useAdminShell } from "../../../components/admin/admin-shell-context";
import { Button } from "../../../components/ui";
import {
  overviewSearchResultsFromApi,
  overviewSearchResultsFromMockData,
  sortOverviewSearchResults,
  type OverviewApiSearchData,
  type OverviewSearchResult,
} from "../overview/overview-model";
import { useOverviewSearchQuery } from "../overview/overview-search-query";
import {
  ADMIN_SEARCH_RESULT_DESCRIPTORS,
  isAdminSearchResultKind,
  searchResultDescriptor,
} from "./search-descriptors";

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
  ...ADMIN_SEARCH_RESULT_DESCRIPTORS.map(({ kind, label }) => ({ value: kind, label })),
];

function isSearchFilter(value: string | null): value is SearchFilter {
  return value === "all" || isAdminSearchResultKind(value);
}

function SearchResultIcon({ kind }: { kind: OverviewSearchResult["kind"] }) {
  const iconProps = {
    className: "admin-global-search-icon block size-[17px]",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (searchResultDescriptor(kind).icon) {
    case "member":
      return <svg {...iconProps}><circle cx="9" cy="8" r="3.5" /><path d="M3 20a6 6 0 0 1 12 0M16 11a3 3 0 1 1 3-3M17 15a5 5 0 0 1 4 5" /></svg>;
    case "quest":
      return <svg {...iconProps}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 3V2h6v1M8 9h8M8 13h8M8 17h5" /></svg>;
    case "wallet":
      return <svg {...iconProps}><path d="M3 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Zm0 0 12-3v3" /><path d="M16 12h5v4h-5a2 2 0 0 1 0-4Z" /></svg>;
    case "dispute":
      return <svg {...iconProps}><path d="M12 3v18M5 7h14M5 7l-3 6h6L5 7Zm14 0-3 6h6l-3-6ZM8 21h8" /></svg>;
    case "report":
      return <svg {...iconProps}><path d="M5 21V4m0 0h12l-2 4 2 4H5" /></svg>;
    case "conduct-report":
      return <svg {...iconProps}><path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></svg>;
    case "activity":
      return <svg {...iconProps}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h5M8 17h8" /></svg>;
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
  sortOverviewSearchResults(results).forEach((result) => {
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
  const searchQuery = useOverviewSearchQuery(open, initialData);
  const data = searchQuery.data ?? null;
  const searchError = initialError ?? (searchQuery.error instanceof Error ? searchQuery.error.message : null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get(SEARCH_QUERY_PARAM) ?? "");
    setKind(isSearchFilter(params.get(SEARCH_KIND_PARAM)) ? params.get(SEARCH_KIND_PARAM) as SearchFilter : "all");
    setSavedFilters(readSavedSearchFilters());
    setSaveMessage("");
    window.setTimeout(() => inputRef.current?.focus(), 0);

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

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

  const removeSavedFilter = (filter: SavedSearchFilter) => {
    const nextFilters = savedFilters.filter((savedFilter) => savedFilter.id !== filter.id);
    setSavedFilters(nextFilters);
    saveSearchFilters(nextFilters);
    setSaveMessage(translateText("Saved filter removed."));
  };

  if (!open) return null;

  return (
    <dialog open id="overview-command" className="command fixed inset-0 z-[70] m-0 grid h-full max-h-none !w-full max-w-none place-items-start justify-items-center rounded-none border-0 bg-[var(--scrim-command)] p-0 !pt-[12vh]" aria-modal="true" aria-labelledby="admin-global-search-title" data-global-search="true">
      <button className="command-backdrop absolute inset-0 size-full cursor-default border-0 bg-transparent" type="button" aria-label={translateText("Close search")} onClick={onClose} />
      <div className="command-box admin-global-search-box relative z-[1] max-h-[min(78dvh,760px)] w-[min(760px,calc(100vw-28px))] overflow-auto rounded-[14px] border border-admin-border bg-admin-surface shadow-admin">
        <div className="command-input flex h-[58px] items-center gap-2.5 border-b border-admin-border px-4 focus-within:border-admin-accent [&_input]:h-full [&_input]:min-w-0 [&_input]:flex-1 [&_input]:border-0 [&_input]:bg-transparent [&_input]:text-[17px]">
          <span aria-hidden="true">⌕</span>
          <h2 id="admin-global-search-title" className="visually-hidden">{translateText("Search marketplace records")}</h2>
          <input
            ref={inputRef}
            type="search"
            className="outline-none focus-visible:!outline-none"
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
        <div className="admin-global-search-controls grid grid-cols-[minmax(160px,.7fr)_minmax(0,1.3fr)] items-end gap-3 border-b border-admin-border bg-admin-soft px-4 py-3 max-[600px]:grid-cols-1">
          <label className="grid gap-1 text-[13px] font-bold text-admin-muted" htmlFor="admin-global-search-type">{translateText("Search type")}
              <select className="min-h-9 w-full rounded-md border border-admin-border-strong bg-admin-surface px-2 text-sm text-admin-text" id="admin-global-search-type" value={kind} onChange={(event) => {
                const nextKind = isSearchFilter(event.target.value) ? event.target.value : "all";
                setKind(nextKind);
                syncSearchParams(query, nextKind);
              }}>
              {searchFilterOptions.map((option) => <option key={option.value} value={option.value}>{translateText(option.label)}</option>)}
            </select>
          </label>
          <form className="admin-global-search-save grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2" onSubmit={saveCurrentFilter}>
            <label className="grid gap-1 text-[13px] font-bold text-admin-muted" htmlFor="admin-global-search-save-name">{translateText("Save this filter")}
              <input className="min-h-9 w-full rounded-md border border-admin-border-strong bg-admin-surface px-2 text-sm text-admin-text" id="admin-global-search-save-name" type="text" value={saveName} onChange={(event) => setSaveName(event.target.value)} placeholder={translateText("Filter name")} />
            </label>
            <Button className="min-h-9" variant="outline" type="submit" disabled={!saveName.trim()}>{translateText("Save")}</Button>
          </form>
        </div>
        {savedFilters.length ? <div className="admin-global-search-saved flex items-center gap-1.5 overflow-x-auto border-b border-admin-border px-4 py-2 whitespace-nowrap" aria-label={translateText("Saved filters")}>
          <span className="mr-1 text-[13px] font-bold text-admin-muted">{translateText("Saved filters")}</span>
          {savedFilters.map((filter) => (
            <span className="inline-flex items-center rounded-full bg-admin-accent-soft" key={filter.id}>
              <Button className="min-h-7 rounded-full bg-transparent px-2.5 py-1 text-[13px] whitespace-nowrap" variant="link" size="sm" type="button" onClick={() => applySavedFilter(filter)}>{filter.name}</Button>
              <Button
                className="!size-7 !min-h-7 !rounded-full !p-0 text-admin-muted hover:text-admin-text"
                variant="ghost"
                size="icon"
                type="button"
                aria-label={`${translateText("Remove saved filter")}: ${filter.name}`}
                title={`${translateText("Remove saved filter")}: ${filter.name}`}
                onClick={() => removeSavedFilter(filter)}
              >
                <span className="close-lines scale-[0.7]" aria-hidden="true" />
              </Button>
            </span>
          ))}
        </div> : null}
        {saveMessage ? <output className="admin-global-search-message mx-4 mt-2.5 block text-[13px] text-admin-success">{translateText(saveMessage)}</output> : null}
        <div id="admin-global-search-results" aria-live="polite">
          {searchError && !data ? <p className="p-[60px_24px] text-center text-sm text-admin-muted">{translateText(searchError)}</p> : null}
          {searchQuery.isPending && !data ? <p className="p-[60px_24px] text-center text-sm text-admin-muted">{translateText("Loading search records…")}</p> : null}
          {data?.source === "mock" ? <p className="api-data-notice admin-global-search-notice mx-4 my-3 mb-1 rounded-lg p-[9px_10px] text-[13px]">{translateText("Fixture search is active. Results use local demo records.")}</p> : null}
          {groups.map((group) => (
            <section key={group.kind} className="admin-global-search-group" aria-labelledby={`admin-global-search-group-${group.kind}`}>
              <h3 className="m-0 flex items-center justify-between gap-2 border-b border-admin-border px-4 pb-2 pt-2.5 text-xs font-bold uppercase tracking-[.08em] text-admin-muted" id={`admin-global-search-group-${group.kind}`}>{translateText(searchResultDescriptor(group.kind).label)}<span className="min-w-5 rounded-full bg-admin-soft px-1.5 py-0.5 text-center text-xs tracking-normal text-admin-text">{group.items.length}</span></h3>
              {group.items.map((result) => (
                <Link key={`${result.kind}-${result.id}`} className="result grid w-full grid-cols-[35px_minmax(0,1fr)_auto] items-center gap-2.5 border-0 border-b border-admin-border-subtle bg-admin-surface px-4 py-2.5 text-left !text-admin-text no-underline hover:bg-admin-hover focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-admin-accent max-[600px]:grid-cols-[35px_minmax(0,1fr)]" href={result.href} onClick={onClose}>
                  <span className="admin-global-search-marker grid size-8 place-items-center rounded-lg bg-admin-soft text-admin-accent"><SearchResultIcon kind={result.kind} /></span>
                  <span className="admin-global-search-result-copy min-w-0"><strong className="block text-sm font-semibold [overflow-wrap:anywhere]">{result.title}</strong><small className="block text-sm text-admin-muted [overflow-wrap:anywhere]">{result.id} · {translateText(result.detail)}</small></span>
                  <span className="admin-global-search-result-meta grid min-w-24 justify-items-end gap-0.5 text-right max-[600px]:col-start-2 max-[600px]:min-w-0 max-[600px]:justify-items-start max-[600px]:text-left">
                    <small className="text-xs font-bold uppercase tracking-[.04em] text-admin-muted">{translateText("Status")}</small>
                    <strong className="admin-global-search-status max-w-36 rounded-full border border-admin-border-strong bg-admin-soft px-2 py-1 text-[13px] font-bold leading-[1.2] [overflow-wrap:anywhere]">{translateText(result.status)}</strong>
                  </span>
                </Link>
              ))}
            </section>
          ))}
          {!searchError && !searchQuery.isPending && query && !results.length ? <p className="p-[60px_24px] text-center text-sm text-admin-muted">{translateText("No matching records")}</p> : null}
          {!searchError && !searchQuery.isPending && !query ? <p className="p-[60px_24px] text-center text-sm text-admin-muted">{translateText("Type an ID, name, or status to search all Admin records.")}</p> : null}
        </div>
      </div>
    </dialog>
  );
}
