'use client'

import { useState } from 'react';
import { communityClient } from '@/lib/client';
import { buildEventDetailHref } from './eventUtils';

export default function CreateEventMessageForm() {
  const [channelId, setChannelId] = useState('');
  const [content, setContent] = useState('');
  const [mentionRoleIds, setMentionRoleIds] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const roleIds = mentionRoleIds
        .split(',')
        .map(value => value.trim())
        .filter(Boolean);
      const res = await communityClient.api.v0.message.$post({
        json: {
          channelId,
          content,
          mentionRoleIds: roleIds.length > 0 ? roleIds : undefined,
        },
      });

      if (res.status === 403) {
        throw new Error('管理者権限がありません。');
      }
      if (!res.ok) {
        throw new Error(`送信に失敗しました: ${res.status}`);
      }

      const eventMessage = await res.json();
      window.location.href = buildEventDetailHref(eventMessage.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '送信に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 space-y-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">イベント通知を送信</h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Discord に通知を投稿し、集計対象のイベントとして保存します。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="space-y-1">
          <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">Channel ID</span>
          <input
            value={channelId}
            onChange={event => setChannelId(event.target.value)}
            required
            pattern="\d{17,20}"
            className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">Mention Role IDs</span>
          <input
            value={mentionRoleIds}
            onChange={event => setMentionRoleIds(event.target.value)}
            placeholder="comma separated"
            className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm"
          />
        </label>
      </div>

      <label className="space-y-1 block">
        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">Message</span>
        <textarea
          value={content}
          onChange={event => setContent(event.target.value)}
          required
          maxLength={2000}
          rows={5}
          className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm"
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {error ? <p className="text-sm text-red-600 dark:text-red-300 font-medium">{error}</p> : <span />}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-md text-sm font-semibold transition-colors"
        >
          {isSubmitting ? 'Sending...' : 'Send message'}
        </button>
      </div>
    </form>
  );
}
