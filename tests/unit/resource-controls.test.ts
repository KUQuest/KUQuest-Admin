import { describe, expect, it } from "bun:test";
import { runInNewContext } from "node:vm";

type ResourceView = "disputes" | "quests" | "users" | "payouts" | "reports";
type ResourceRecord = {
  id: string;
  status: string;
  [key: string]: unknown;
};
type TestState = {
  view: string;
  tab: string;
  query: string;
  questFilters: { mode: string; status: string };
  filters: Partial<Record<ResourceView, string[]>>;
  orderBy: Record<ResourceView, string | null>;
  pagination: Record<ResourceView, { page: number; size: number | "all" }>;
};
type TestNode = {
  dataset: Record<string, string>;
  handlers: Record<string, () => void>;
  addEventListener: (type: string, handler: () => void) => void;
};
type ControlsContext = {
  state: TestState;
  matchingRows: (view: ResourceView) => ResourceRecord[];
  renderResource: (view: ResourceView) => void;
  resetResourceState: () => void;
};

const controlsSource = await Bun.file("public/legacy/resource-controls.js").text();

function loadControls(records: Partial<Record<ResourceView, ResourceRecord[]>>) {
  const state: TestState = {
    view: "home",
    tab: "all",
    query: "",
    questFilters: { mode: "all", status: "all" },
    filters: {},
    orderBy: {} as Record<ResourceView, string | null>,
    pagination: {} as Record<ResourceView, { page: number; size: number | "all" }>,
  };
  const pageSizeButtons = ["10", "25", "50", "all"].map((size) => testNode({ pageSize: size })),
    sortButton = testNode({ sortKey: "title" }),
    pageNavButtons = [testNode({ pageNumber: "0" }), testNode({ pageNumber: "2" })],
    main = { innerHTML: "", querySelectorAll: () => [] };
  const context = {
    state,
    data: {
      disputes: records.disputes || [],
      quests: records.quests || [],
      users: records.users || [],
      payouts: records.payouts || [],
      reports: records.reports || [],
    },
    bind() {},
    document: {
      querySelector() {
        return null;
      },
      querySelectorAll(selector: string) {
        if (selector === ".table-sort") return [sortButton];
        if (selector === ".page-size-button") return pageSizeButtons;
        if (selector === ".page-nav") return pageNavButtons;
        return [];
      },
    },
    main,
    renderPolicies() {},
    renderActivity() {},
    pageHead() {
      return "";
    },
    heads: Object.fromEntries(["disputes", "quests", "users", "payouts", "reports"].map((view) => [view, ["", ""]])),
    ico() {
      return "";
    },
    escapeActivityText(value: unknown) {
      return String(value ?? "");
    },
    fmt(value: unknown) {
      return String(value ?? "");
    },
    badge() {
      return "";
    },
    disputeTypeLabel(record: ResourceRecord) {
      return String(record.disputeType ?? "");
    },
    window: {
      addEventListener(_type: string, handler: (event: { persisted: boolean }) => void) {
        context.pageShowHandler = handler;
      },
    },
    setActiveNavigation() {},
    console,
  } as Record<string, unknown>;

  runInNewContext(controlsSource, context);
  const loaded = context as unknown as ControlsContext;
  return {
    state,
    main,
    matchingRows: loaded.matchingRows,
    renderResource: loaded.renderResource,
    resetResourceState: loaded.resetResourceState,
    pageShowHandler: context.pageShowHandler as ((event: { persisted: boolean }) => void) | undefined,
    pageSizeButtons,
    pageNavButtons,
    sortButton,
  };
}

function testNode(dataset: Record<string, string>): TestNode {
  const handlers: Record<string, () => void> = {};
  return {
    dataset,
    handlers,
    addEventListener(type, handler) {
      handlers[type] = handler;
    },
  };
}

function quest(id: string, amount: number | null, title = id): ResourceRecord {
  return { id, amount, title, status: "Open" };
}

describe("resource table sorting", () => {
  it("keeps the original order until a column is clicked", () => {
    const controls = loadControls({
      quests: [quest("QST-3", 30), quest("QST-1", 10), quest("QST-2", 20)],
    });

    expect(controls.state.orderBy.quests).toBeNull();
    expect(controls.matchingRows("quests").map((record) => record.id)).toEqual([
      "QST-3",
      "QST-1",
      "QST-2",
    ]);
  });

  it("sorts amounts numerically and keeps empty values at the bottom", () => {
    const controls = loadControls({
      quests: [quest("QST-empty", null), quest("QST-20", 20), quest("QST-10", 10)],
    });
    controls.state.orderBy.quests = "amount-asc";

    expect(controls.matchingRows("quests").map((record) => record.id)).toEqual([
      "QST-10",
      "QST-20",
      "QST-empty",
    ]);

    controls.state.orderBy.quests = "amount-desc";
    expect(controls.matchingRows("quests").map((record) => record.id)).toEqual([
      "QST-20",
      "QST-10",
      "QST-empty",
    ]);
  });

  it("sorts dates chronologically and preserves equal-value order", () => {
    const controls = loadControls({
      disputes: [
        { id: "DSP-1", status: "Active", disputeDate: "27 Aug 2026" },
        { id: "DSP-2", status: "Active", disputeDate: "25 Aug 2026" },
        { id: "DSP-3", status: "Active", disputeDate: "27 Aug 2026" },
      ],
    });
    controls.state.orderBy.disputes = "disputeDate-asc";

    expect(controls.matchingRows("disputes").map((record) => record.id)).toEqual([
      "DSP-2",
      "DSP-1",
      "DSP-3",
    ]);
  });

  it("shows ten rows by default and changes pages and page sizes with the controls", () => {
    const controls = loadControls({
      quests: Array.from({ length: 23 }, (_, index) => quest(`QST-${index + 1}`, index + 1)),
    });
    controls.state.view = "quests";

    controls.renderResource("quests");
    expect(controls.main.innerHTML).toContain("Showing 1–10 of 23 results");
    expect(controls.main.innerHTML).toContain("Page 1 of 3");
    expect(controls.main.innerHTML.match(/<tr class=/g)?.length).toBe(10);
    expect(controls.main.innerHTML).toContain("Show 10");
    expect(controls.main.innerHTML).toContain("Show 25");
    expect(controls.main.innerHTML).toContain("Show 50");
    expect(controls.main.innerHTML).toContain("Show all");

    controls.pageNavButtons[1].handlers.click();
    expect(controls.main.innerHTML).toContain("Showing 11–20 of 23 results");
    expect(controls.main.innerHTML).toContain("Page 2 of 3");

    controls.sortButton.handlers.click();
    expect(controls.main.innerHTML).toContain("Showing 1–10 of 23 results");
    expect(controls.main.innerHTML).toContain("Page 1 of 3");

    controls.pageSizeButtons[1].handlers.click();
    expect(controls.main.innerHTML).toContain("Showing 1–23 of 23 results");
    expect(controls.main.innerHTML).toContain("Page 1 of 1");
    expect(controls.main.innerHTML.match(/<tr class=/g)?.length).toBe(23);

    controls.pageSizeButtons[3].handlers.click();
    expect(controls.main.innerHTML).toContain("Showing all 23 results");
  });

  it("hides pagination when there are no matching rows", () => {
    const controls = loadControls({});
    controls.state.view = "quests";

    controls.renderResource("quests");

    expect(controls.main.innerHTML).toContain("Showing 0 of 0 results");
    expect(controls.main.innerHTML).not.toContain("table-pagination");
  });

  it("combines quest status and team or solo filters", () => {
    const controls = loadControls({
      quests: [
        { ...quest("QST-team-approved", 10), status: "Approved", teamQuest: true },
        { ...quest("QST-solo-approved", 20), status: "Approved", teamQuest: false },
        { ...quest("QST-team-open", 30), teamQuest: true },
        { ...quest("QST-solo-open", 40), teamQuest: false },
      ],
    });
    controls.state.view = "quests";
    controls.state.questFilters = { mode: "team", status: "Approved" };

    expect(controls.matchingRows("quests").map((record) => record.id)).toEqual([
      "QST-team-approved",
    ]);

    controls.state.questFilters = { mode: "solo", status: "Approved" };
    expect(controls.matchingRows("quests").map((record) => record.id)).toEqual([
      "QST-solo-approved",
    ]);

    controls.renderResource("quests");
    expect(controls.main.innerHTML).toContain(">Approved<");
    expect(controls.main.innerHTML).toContain(">Solo<");
    expect(controls.main.innerHTML).not.toContain('data-tab="rework"');
  });

  it("resets resource navigation state to the default values", () => {
    const controls = loadControls({});
    controls.state.tab = "flag";
    controls.state.query = "search term";
    controls.state.questFilters = { mode: "team", status: "Approved" };
    controls.state.filters.users = ["Red Flag"];
    controls.state.orderBy.users = "status-desc";
    controls.state.pagination.users = { page: 4, size: "all" };

    controls.resetResourceState();

    expect(controls.state.tab).toBe("all");
    expect(controls.state.query).toBe("");
    expect(controls.state.questFilters).toEqual({ mode: "all", status: "all" });
    expect(controls.state.filters).toEqual({});
    expect(controls.state.orderBy.users).toBeNull();
    expect(controls.state.pagination.users).toEqual({ page: 1, size: 10 });
  });

  it("resets a cached resource list when the page is restored from history", () => {
    const controls = loadControls({
      users: Array.from({ length: 23 }, (_, index) => ({
        id: `USR-${index + 1}`,
        title: `User ${index + 1}`,
        status: "Normal",
      })),
    });
    controls.state.view = "users";
    controls.state.orderBy.users = "title-desc";
    controls.state.pagination.users = { page: 2, size: 25 };
    controls.state.tab = "normal";
    controls.state.query = "user";

    controls.pageShowHandler?.({ persisted: true });

    expect(controls.state.tab).toBe("all");
    expect(controls.state.query).toBe("");
    expect(controls.state.orderBy.users).toBeNull();
    expect(controls.state.pagination.users).toEqual({ page: 1, size: 10 });
    expect(controls.main.innerHTML).toContain("Show 10");
    expect(controls.main.innerHTML).toContain("Page 1 of 3");
    expect(controls.main.innerHTML).not.toContain('class="table-sort is-active"');
  });
});
