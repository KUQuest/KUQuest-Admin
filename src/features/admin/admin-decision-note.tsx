"use client";

import { useEffect, useState } from "react";
import { Input } from "../../components/ui/input";

export type AdminDecisionSubmission<Field extends string, ReasonCode extends string | null> =
  Record<Field, ReasonCode> & {
    decisionReasonText?: string;
  };

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
      <Input
        className="text-lg leading-[1.45]"
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
