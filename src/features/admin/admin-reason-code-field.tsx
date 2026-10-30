"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

type AdminReasonCodeOption<Code extends string> = {
  value: Code;
  label: string;
};

type AdminReasonCodeFieldProps<Code extends string> = {
  id: string;
  label: string;
  value: Code | "";
  options: readonly AdminReasonCodeOption<Code>[];
  translateText: (value: string) => string;
  onValueChange: (value: Code) => void;
  placeholder?: string;
  required?: boolean;
  invalid?: boolean;
};

export function AdminReasonCodeField<Code extends string>({
  id,
  label,
  value,
  options,
  translateText,
  onValueChange,
  placeholder = "Select a reason code",
  required = true,
  invalid,
}: AdminReasonCodeFieldProps<Code>) {
  function handleValueChange(nextValue: string) {
    onValueChange(nextValue as Code);
  }
  return (
    <>
      <label htmlFor={id}>
        {translateText(label)}{required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger id={id} aria-required={required} aria-invalid={invalid}>
          <SelectValue placeholder={translateText(placeholder)} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {translateText(option.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
