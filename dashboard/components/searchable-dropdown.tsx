"use client";

import { useMemo, useState } from "react";

export type SearchableDropdownOption = {
  value: string;
  label: string;
};

type SearchableDropdownProps = {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  options: SearchableDropdownOption[];
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function SearchableDropdown({
  label,
  placeholder,
  searchPlaceholder,
  options,
  value,
  disabled,
  onChange,
}: SearchableDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => options.find((item) => item.value === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return options;
    }
    return options.filter((item) => item.label.toLowerCase().includes(keyword));
  }, [options, query]);

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm disabled:bg-slate-100"
        >
          {selected?.label ?? placeholder}
        </button>
        {open ? (
          <div className="absolute z-20 mt-2 w-full rounded-lg border border-slate-300 bg-white p-2 shadow-lg">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="mb-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
            <div className="max-h-52 overflow-auto rounded-md border border-slate-200">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-500">候補がありません</p>
              ) : (
                filtered.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    {item.label}
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}