/**
 * Shared Tailwind recipes for Admin record surfaces.
 *
 * These recipes keep detail pages on the same type scale and spacing without
 * adding another feature-specific CSS selector for each record type.
 */
export const adminRecordSection = "p-5";

export const adminRecordHeader = "mb-[14px] flex items-start justify-between gap-3";

export const adminRecordHeading = "m-0 text-base font-semibold leading-[1.4] text-admin-text";

export const adminRecordDescription = "m-0 max-w-[74ch] text-base leading-[1.5] text-admin-muted";

export const adminRecordFacts = "grid grid-cols-2 gap-[13px] max-[700px]:grid-cols-1";

export const adminRecordFact = "min-w-0 [&>span]:block [&>span]:text-xs [&>span]:font-semibold [&>span]:leading-[1.4] [&>span]:text-admin-muted [&>strong]:mt-1 [&>strong]:block [&>strong]:text-sm [&>strong]:font-semibold [&>strong]:leading-[1.4] [&>small]:mt-0.5 [&>small]:block [&>small]:text-xs [&>small]:leading-[1.45] [&>small]:text-admin-muted";

export const adminRecordGroup = "mt-4 min-w-0 [&>span]:mb-1.5 [&>span]:block [&>span]:text-xs [&>span]:font-semibold [&>span]:leading-[1.4] [&>span]:text-admin-muted [&>p]:m-0 [&>p]:max-w-[74ch] [&>p]:text-base [&>p]:leading-[1.5] [&>p]:text-admin-text";

export const adminRecordPartyGrid = "grid grid-cols-2 gap-3 max-[700px]:grid-cols-1 [&>div]:min-w-0 [&>div>span]:block [&>div>span]:text-xs [&>div>span]:font-semibold [&>div>span]:leading-[1.4] [&>div>span]:text-admin-muted [&>div>strong]:mt-1 [&>div>strong]:block [&>div>strong]:text-sm [&>div>strong]:font-semibold [&>div>strong]:leading-[1.4] [&>div>small]:mt-0.5 [&>div>small]:block [&>div>small]:text-xs [&>div>small]:leading-[1.45] [&>div>small]:text-admin-muted";

export const adminRecordSideFacts = "grid gap-[14px] [&_span]:block [&_span]:text-xs [&_span]:leading-[1.4] [&_span]:text-admin-muted [&_strong]:mt-1 [&_strong]:block [&_strong]:text-sm [&_strong]:font-semibold [&_strong]:leading-[1.4] [&_small]:mt-0.5 [&_small]:block [&_small]:text-xs [&_small]:leading-[1.45] [&_small]:text-admin-muted";

export const adminRecordCount = "inline-flex min-w-[22px] items-center justify-center rounded-full bg-admin-soft px-2 py-0.5 text-xs font-semibold leading-[1.35] text-admin-muted";

