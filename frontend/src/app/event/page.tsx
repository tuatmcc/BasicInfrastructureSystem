import Link from 'next/link';
import { cookies } from 'next/headers';
import { communityClient } from '@/lib/client';
import CreateEventMessageForm from './CreateEventMessageForm';
import { buildEventDetailHref, getEventMessageTitle } from './eventUtils';

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
};

export default async function EventPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('app-authorization')?.value;
  let messages: Array<{
    id: string;
    channelId: string;
    messageId: string;
    content: string;
    createdAt: string;
  }> = [];
  let error: string | null = null;

  try {
    const res = await communityClient.api.v0.message.$get({}, {
      headers: {
        Cookie: `app-authorization=${token || ''}`,
      },
    });

    const status = res.status as number;
    if (status === 403) {
      error = '管理者権限がないため、イベント通知一覧は表示できません。';
    } else if (!res.ok) {
      error = `イベント通知一覧の取得に失敗しました: ${status}`;
    } else {
      messages = await res.json();
    }
  } catch (err) {
    console.error('Error fetching event messages:', err);
    error = 'イベント通知一覧の取得中にサーバーエラーが発生しました。';
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase">Events</p>
            <h1 className="text-3xl font-bold text-slate-950 dark:text-white">イベント通知一覧</h1>
          </div>
          <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
            Dashboard
          </Link>
        </header>

        <CreateEventMessageForm />

        {error ? (
          <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-lg text-red-700 dark:text-red-300">
            <p className="font-semibold">{error}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
            {messages.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                {messages.map((message) => (
                  <Link
                    key={message.id}
                    href={buildEventDetailHref(message.id)}
                    className="block p-5 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-950 dark:text-white truncate">
                          {getEventMessageTitle(message.content)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                          Message: {message.messageId} / Channel: {message.channelId}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400 dark:text-zinc-500">
                        {formatDate(message.createdAt)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 dark:text-zinc-400">
                保存済みのイベント通知メッセージはありません。
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
