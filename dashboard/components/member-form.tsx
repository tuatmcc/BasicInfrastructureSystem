"use client";

import { useState } from "react";
import type { Member, MemberCreateRequest, MemberUpdateRequest } from "@/lib/types";

type FormMode = "create" | "update";

interface MemberFormProps {
  mode: FormMode;
  initialValue?: Partial<Member>;
  onSubmit: (payload: MemberCreateRequest | MemberUpdateRequest) => Promise<void>;
  submitLabel: string;
}

type FormState = {
  name: string;
  grade: string;
  emergency_contact: string;
  student_id: string;
  student_email: string;
  insurance: boolean;
  some_allergy: boolean;
};

function toFormState(value?: Partial<Member>): FormState {
  return {
    name: value?.name ?? "",
    grade: value?.grade !== undefined ? String(value.grade) : "",
    emergency_contact: value?.emergency_contact ?? "",
    student_id: value?.student_id ?? "",
    student_email: value?.student_email ?? "",
    insurance: value?.insurance ?? false,
    some_allergy: value?.some_allergy ?? false,
  };
}

export function MemberForm({ mode, initialValue, onSubmit, submitLabel }: MemberFormProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(initialValue));
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const base = {
        name: form.name,
        grade: Number(form.grade),
        emergency_contact: form.emergency_contact,
        student_id: form.student_id,
        student_email: form.student_email,
        insurance: form.insurance,
        some_allergy: form.some_allergy,
      };

      if (mode === "create") {
        await onSubmit(base);
      } else {
        const payload: MemberUpdateRequest = {};
        if (form.name.length > 0) payload.name = form.name;
        if (form.grade.length > 0) payload.grade = Number(form.grade);
        if (form.emergency_contact.length > 0) payload.emergency_contact = form.emergency_contact;
        if (form.student_id.length > 0) payload.student_id = form.student_id;
        if (form.student_email.length > 0) payload.student_email = form.student_email;
        payload.insurance = form.insurance;
        payload.some_allergy = form.some_allergy;
        await onSubmit(payload);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      <input
        className="rounded border border-slate-300 px-3 py-2"
        placeholder="氏名"
        value={form.name}
        onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
      />
      <input
        className="rounded border border-slate-300 px-3 py-2"
        placeholder="学年"
        value={form.grade}
        onChange={(event) => setForm((prev) => ({ ...prev, grade: event.target.value }))}
      />
      <input
        className="rounded border border-slate-300 px-3 py-2"
        placeholder="緊急連絡先"
        value={form.emergency_contact}
        onChange={(event) => setForm((prev) => ({ ...prev, emergency_contact: event.target.value }))}
      />
      <input
        className="rounded border border-slate-300 px-3 py-2"
        placeholder="学籍番号"
        value={form.student_id}
        onChange={(event) => setForm((prev) => ({ ...prev, student_id: event.target.value }))}
      />
      <input
        className="rounded border border-slate-300 px-3 py-2"
        placeholder="学内メール"
        value={form.student_email}
        onChange={(event) => setForm((prev) => ({ ...prev, student_email: event.target.value }))}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.insurance}
          onChange={(event) => setForm((prev) => ({ ...prev, insurance: event.target.checked }))}
        />
        保険加入
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.some_allergy}
          onChange={(event) => setForm((prev) => ({ ...prev, some_allergy: event.target.checked }))}
        />
        アレルギーあり
      </label>
      <button
        type="submit"
        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-blue-300"
        disabled={submitting}
      >
        {submitting ? "送信中..." : submitLabel}
      </button>
    </form>
  );
}
