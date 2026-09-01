import type { DisputeCase as ModerationDisputeCase, ModerationPageContext } from "./dispute-detail";
import type { QuestData, QuestDetailDependencies } from "./quest-detail";
import type { LegacyDisputeCase, LegacyRecord, LegacyRuntimeData } from "./runtime";
import type { UserPageContext, UserRecord } from "./user-page";

export type TypedLegacyPage = "home" | "quest" | "dispute" | "report" | "user";

type InitializeTypedLegacyPageOptions = {
  page: TypedLegacyPage;
  recordId?: string;
  search: string;
};

type SharedRuntimeCore = Pick<
  typeof import("./detail-runtime"),
  | "data"
  | "disputeCases"
  | "main"
  | "drawer"
  | "scrim"
  | "closeActiveLayer"
  | "showDrawerLayer"
  | "showModalLayer"
  | "closeDrawer"
  | "state"
  | "ico"
  | "escapeActivityText"
  | "fmt"
  | "badge"
  | "toneClass"
  | "disputeTypeLabel"
  | "timeline"
  | "confirmAction"
  | "toast"
  | "renderHome"
  | "render"
  | "setActiveNavigation"
  | "applyDemoAction"
  | "payoutQuestId"
  | "penaltyOutcomeFor"
  | "penaltyOutcomeLabel"
  | "redFlagExemptionFor"
  | "confirmedViolationCount"
  | "applyReportDecision"
  | "openDrawer"
  | "openPenaltyDialog"
  | "userQuestRecords"
  | "userReportsFor"
  | "completedPayoutQuests"
  | "payoutEarningForQuest"
  | "payoutTimestamp"
  | "adminDateTime"
  | "currentAdminName"
  | "recordActivity"
>;

function isQuestRecord(record: LegacyRecord): boolean {
  return typeof record.amount === "number";
}

function isQuestData(data: unknown): data is QuestData {
  if (!data || typeof data !== "object") return false;
  const runtimeData = data as LegacyRuntimeData;
  return runtimeData.quests.every(isQuestRecord)
    && runtimeData.disputes.every(isQuestRecord)
    && runtimeData.payouts.every(isQuestRecord);
}

function isModerationData(
  data: unknown,
): data is ModerationPageContext["data"] {
  if (!data || typeof data !== "object") return false;
  return (data as LegacyRuntimeData).disputes.every((record) => Array.isArray(record.evidence));
}

function isUserRecord(record: LegacyRecord): record is UserRecord {
  return !record.reviews || Array.isArray(record.reviews);
}

function isUserData(data: unknown): data is UserPageContext["data"] {
  return isModerationData(data) && data.users.every(isUserRecord);
}

function questDisputeCases(
  disputeCases: Record<string, LegacyDisputeCase>,
): QuestDetailDependencies["disputeCases"] {
  return Object.fromEntries(
    Object.entries(disputeCases).map(([id, record]) => [
      id,
      {
        questId: typeof record.questId === "string" ? record.questId : undefined,
        respondent: typeof record.respondent === "string" ? record.respondent : undefined,
      },
    ]),
  );
}

function createQuestDetailDependencies(
  core: SharedRuntimeCore,
  data: QuestData,
  persistAdminData: () => void,
): QuestDetailDependencies {
  return {
    document,
    data,
    disputeCases: questDisputeCases(core.disputeCases),
    drawer: core.drawer,
    scrim: core.scrim,
    showDrawerLayer: core.showDrawerLayer,
    closeDrawer: core.closeDrawer,
    confirmAction: core.confirmAction,
    applyDemoAction: core.applyDemoAction,
    persistAdminData,
    refresh: core.render,
    badge: core.badge,
    fmt: core.fmt,
    escapeActivityText: core.escapeActivityText,
    ico: core.ico,
    timeline: core.timeline,
    disputeTypeLabel: core.disputeTypeLabel,
    payoutQuestId: core.payoutQuestId,
  };
}

async function initializeHomePage(
  core: SharedRuntimeCore,
  mockData: typeof import("./fresh-mock-data"),
): Promise<void> {
  const common = {
    document,
    main: core.main,
    drawer: core.drawer,
    scrim: core.scrim,
    closeActiveLayer: core.closeActiveLayer,
    showDrawerLayer: core.showDrawerLayer,
    showModalLayer: core.showModalLayer,
    closeDrawer: core.closeDrawer,
    state: core.state,
    icon: core.ico,
    escapeActivityText: core.escapeActivityText,
    fmt: core.fmt,
    badge: core.badge,
    toneClass: core.toneClass,
    disputeTypeLabel: core.disputeTypeLabel,
    timeline: core.timeline,
    confirmAction: core.confirmAction,
    persistAdminData: mockData.persistAdminData,
    toast: core.toast,
    renderHome: core.renderHome,
    render: core.render,
    setActiveNavigation: core.setActiveNavigation,
  };

  await import("./resource-controls");
  const runtimeData = core.data;
  if (isQuestData(runtimeData)) {
    const questData = runtimeData;
    const { createQuestDetailModule } = await import("./quest-detail");
    const detail = createQuestDetailModule(createQuestDetailDependencies(core, questData, mockData.persistAdminData));
    window.openQuestDrawer = detail.openQuestDrawer;
  }
  if (isModerationData(runtimeData)) {
    const moderationData = runtimeData;
    const { initializeDisputeDetail } = await import("./dispute-detail");
    const detail = initializeDisputeDetail({
      ...common,
      data: moderationData,
      disputeCases: moderationDisputeCases(core.disputeCases),
      renderDisputePage: core.render,
    });
    window.openDisputeDrawer = detail.openDisputeDrawer;
  }
  core.render();
}

function moderationDisputeCases(
  disputeCases: Record<string, LegacyDisputeCase>,
): Record<string, ModerationDisputeCase> {
  return Object.fromEntries(
    Object.entries(disputeCases).map(([id, record]) => [
      id,
      {
        questId: typeof record.questId === "string" ? record.questId : "",
        category: typeof record.category === "string" ? record.category : "Other",
        openedBy: typeof record.openedBy === "string" ? record.openedBy : "Hirer",
        respondent: typeof record.respondent === "string" ? record.respondent : "Worker",
        requested: typeof record.requested === "string" ? record.requested : "Review requested",
        claim: typeof record.claim === "string" ? record.claim : "No claim recorded.",
        response: typeof record.response === "string" ? record.response : "No response recorded.",
        policy: Array.isArray(record.policy) ? record.policy.filter((item): item is string => typeof item === "string") : [],
        signals: Array.isArray(record.signals)
          ? record.signals.filter(
              (item): item is [string, string, string] => Array.isArray(item)
                && item.length === 3
                && item.every((value) => typeof value === "string"),
            )
          : [],
        recommended: typeof record.recommended === "string" ? record.recommended : "Review the available evidence.",
      },
    ]),
  );
}

export async function initializeTypedLegacyPage(
  options: InitializeTypedLegacyPageOptions,
): Promise<void> {
  if (options.page === "home") {
    const core = await import("./script");
    const mockData = await import("./fresh-mock-data");
    await initializeHomePage(core, mockData);
    return;
  }

  const core = await import("./detail-runtime");
  const mockData = await import("./fresh-mock-data");
  window.__KUQUEST_LEGACY_RUNTIME__ = core.legacyRuntime;
  core.initializeDetailRuntime();
  core.initializeDetailSearch();
  const common = {
    document,
    main: core.main,
    drawer: core.drawer,
    scrim: core.scrim,
    closeActiveLayer: core.closeActiveLayer,
    showDrawerLayer: core.showDrawerLayer,
    showModalLayer: core.showModalLayer,
    closeDrawer: core.closeDrawer,
    state: core.state,
    icon: core.ico,
    escapeActivityText: core.escapeActivityText,
    fmt: core.fmt,
    badge: core.badge,
    toneClass: core.toneClass,
    disputeTypeLabel: core.disputeTypeLabel,
    timeline: core.timeline,
    confirmAction: core.confirmAction,
    persistAdminData: mockData.persistAdminData,
    toast: core.toast,
    renderHome: core.renderHome,
    render: core.render,
    setActiveNavigation: core.setActiveNavigation,
  };

  if (options.page === "quest") {
    const runtimeData = core.data;
    if (!isQuestData(runtimeData)) throw new Error("Quest data did not match the typed runtime contract.");
    const questData = runtimeData;
    const [{ createQuestDetailModule }, { createQuestPageModule }, { createQuestChangeReviewModule }] = await Promise.all([
      import("./quest-detail"),
      import("./quest-page"),
      import("./quest-change-review"),
    ]);
    const detail = createQuestDetailModule(createQuestDetailDependencies(core, questData, mockData.persistAdminData));
    window.openQuestDrawer = detail.openQuestDrawer;
    const questPage = createQuestPageModule({
      document,
      data: questData,
      disputeCases: questDisputeCases(core.disputeCases),
      drawer: core.drawer,
      scrim: core.scrim,
      showDrawerLayer: core.showDrawerLayer,
      closeDrawer: core.closeDrawer,
      confirmAction: core.confirmAction,
      badge: core.badge,
      fmt: core.fmt,
      escapeActivityText: core.escapeActivityText,
      ico: core.ico,
      timeline: core.timeline,
      disputeTypeLabel: core.disputeTypeLabel,
      payoutQuestId: core.payoutQuestId,
      main: core.main,
      recordId: options.recordId,
      locationSearch: options.search,
      detail,
      applyDemoAction: core.applyDemoAction,
      persistAdminData: mockData.persistAdminData,
      refresh: core.render,
      setActiveNavigation: core.setActiveNavigation,
    });
    questPage.renderQuestPage();
    createQuestChangeReviewModule({
      document,
      main: core.main,
      questRecord: questPage.questRecord,
      detail,
      badge: core.badge,
      ico: core.ico,
    }).renderQuestChangeReview();
    return;
  }

  const runtimeData = core.data;
  if (!isModerationData(runtimeData)) throw new Error("Moderation data did not match the typed runtime contract.");
  const moderationData = runtimeData;
  const moderationContext: ModerationPageContext = {
    ...common,
    data: moderationData,
    disputeCases: moderationDisputeCases(core.disputeCases),
  };

  if (options.page === "dispute") {
    const [{ initializeDisputeDetail }, { initializeDisputePage }] = await Promise.all([
      import("./dispute-detail"),
      import("./dispute-page"),
    ]);
    let renderDisputePage = (): void => undefined;
    const detail = initializeDisputeDetail({
      ...moderationContext,
      renderDisputePage: () => renderDisputePage(),
    });
    window.openDisputeDrawer = detail.openDisputeDrawer;
    renderDisputePage = initializeDisputePage(
      { ...moderationContext, recordId: options.recordId, search: options.search, setActiveNavigation: core.setActiveNavigation },
      detail,
    );
    renderDisputePage();
    return;
  }

  if (options.page === "report") {
    const { initializeReportPage } = await import("./report-page");
    initializeReportPage({
      ...moderationContext,
      recordId: options.recordId,
      search: options.search,
      setActiveNavigation: core.setActiveNavigation,
      penaltyOutcomeFor: (user) => {
        const outcome = core.penaltyOutcomeFor(user);
        return outcome.key ? { key: outcome.key, label: outcome.label } : null;
      },
      penaltyOutcomeLabel: (outcome) => outcome?.label ?? "No penalty determined",
      redFlagExemptionFor: (user) => {
        const exemption = core.redFlagExemptionFor(user);
        return exemption ? { key: exemption.field, remaining: exemption.remaining } : null;
      },
      confirmedViolationCount: core.confirmedViolationCount,
      applyReportDecision: core.applyReportDecision,
    })();
    return;
  }

  if (!isUserData(runtimeData)) throw new Error("User data did not match the typed runtime contract.");
  const userData = runtimeData;
  const { initializeUserPage } = await import("./user-page");
  const userPage = initializeUserPage({
    ...moderationContext,
    data: userData,
    recordId: options.recordId,
    search: options.search,
    setActiveNavigation: core.setActiveNavigation,
    openDrawer: core.openDrawer,
    openPenaltyDialog: core.openPenaltyDialog,
    userQuestRecords: core.userQuestRecords,
    userReportsFor: core.userReportsFor,
    completedPayoutQuests: core.completedPayoutQuests,
    payoutEarningForQuest: core.payoutEarningForQuest,
    payoutTimestamp: core.payoutTimestamp,
    penaltyOutcomeFor: (user) => {
      const outcome = core.penaltyOutcomeFor(user);
      return outcome.key ? { key: outcome.key, label: outcome.label } : null;
    },
    penaltyOutcomeLabel: (outcome) => outcome?.label ?? "No penalty determined",
    redFlagExemptionFor: (user) => {
      const exemption = core.redFlagExemptionFor(user);
      return exemption ? { key: exemption.field, remaining: exemption.remaining } : null;
    },
    confirmedViolationCount: core.confirmedViolationCount,
    adminDateTime: core.adminDateTime,
    currentAdminName: core.currentAdminName,
    recordActivity: core.recordActivity,
  });
  window.__KUQUEST_USER_DETAIL__ = { user: null, render: userPage.renderUserPage };
  userPage.renderUserPage();
}
