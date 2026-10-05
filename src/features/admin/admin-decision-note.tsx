"use client";

import { useEffect, useState } from "react";

type AdminDecisionNoteInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  translateText: (value: string) => string;
};

export function useAdminDecisionNote(open: boolean, choice: string | null) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue("");
  }, [choice, open]);

  return {
    value,
    setValue,
    decisionReasonText: value.trim() || undefined,
  };
}

export function AdminDecisionNoteInput({
  id,
  value,
  onChange,
  translateText,
}: AdminDecisionNoteInputProps) {
  return (
    <label className="grid gap-1 text-[16px] leading-[1.4] font-semibold" htmlFor={id}>
      {translateText("Admin decision note (optional)")}
      <input
        className="w-full rounded-lg border border-admin-border-strong bg-admin-surface px-2.5 py-2 text-lg leading-[1.45] text-admin-text"
        id={id}
        name="decisionReasonText"
        type="text"
        maxLength={200}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
