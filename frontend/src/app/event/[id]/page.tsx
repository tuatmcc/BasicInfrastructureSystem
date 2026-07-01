import Link from 'next/link';
import { cookies } from 'next/headers';
import { communityClient } from '@/lib/client';
import MemberTable, { ReactionMemberRow } from './MemberTable';
import { buildEventDetailViewModel } from './detailUtils';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('app-authorization')?.value;

  let eventTitle = 'イベント通知メッセージ';
  let eventContent = '';
  let eventDate = '';
  let reactionBadges: Array<{ emoji: string; count: number; names: string[] }> = [];
  let membersWithReactions: ReactionMemberRow[] = [];
  let fetchError: string | null = null;

  try {
    const res = await communityClient.api.v0.message[':id'].reactions.$get({
      param: { id },
    }, {
      headers: {
        Cookie: `app-authorization=${token || ''}`,
      },
    });

    if (res.status === 403) {
      fetchError = '管理者権限がないため、リアクション集計は表示できません。';
    } else if (res.status === 404) {
      fetchError = 'イベント通知メッセージが見つかりません。';
    } else if (!res.ok) {
      fetchError = `リアクション集計の取得に失敗しました: ${res.status}`;
    } else {
      const summary = await res.json();
      const viewModel = buildEventDetailViewModel(summary);
      eventTitle = viewModel.eventTitle;
      eventContent = viewModel.eventContent;
      eventDate = viewModel.eventDate;
      reactionBadges = viewModel.reactionBadges;
      membersWithReactions = viewModel.membersWithReactions;
    }
  } catch (err) {
    console.error('Error fetching event reactions:', err);
    fetchError = 'リアクション集計の取得中にサーバーエラーが発生しました。';
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400">
          <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <Link href="/event" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Events
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-900 dark:text-zinc-200 truncate">
            {id}
          </span>
        </nav>

        <main className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-6 md:p-8 space-y-8">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30">
                  Discord Event Message
                </span>
                <span className="text-xs text-slate-400 dark:text-zinc-500">ID: {id}</span>
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-slate-950 dark:text-white leading-tight">
                {eventTitle}
              </h1>
              {eventDate && (
                <p className="text-sm text-slate-500 dark:text-zinc-400">
                  Posted on {eventDate}
                </p>
              )}
            </div>

            {fetchError ? (
              <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-lg text-red-700 dark:text-red-300">
                <p className="font-semibold">{fetchError}</p>
              </div>
            ) : (
              <>
                <section className="space-y-3">
                  <h2 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase">
                    Message Content
                  </h2>
                  <div className="p-5 bg-slate-50 dark:bg-zinc-950/60 rounded-lg border border-slate-100 dark:border-zinc-800">
                    <p className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-zinc-300">
                      {eventContent}
                    </p>
                  </div>
                </section>

                <section className="space-y-3">
                  <h2 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase">
                    Reaction Summary
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {reactionBadges.length > 0 ? reactionBadges.map((reaction) => (
                      <div
                        key={reaction.emoji}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 rounded-md border border-slate-200 dark:border-zinc-700"
                        title={reaction.names.join(', ') || 'No linked members'}
                      >
                        <span className="text-lg">{reaction.emoji}</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">{reaction.count}</span>
                      </div>
                    )) : (
                      <p className="text-sm text-slate-500 dark:text-zinc-400">リアクションはまだありません。</p>
                    )}
                  </div>
                </section>

                <section className="pt-2">
                  <MemberTable eventTitle={eventTitle} data={membersWithReactions} />
                </section>
              </>
            )}
          </div>
        </main>

        <div className="px-1">
          <Link href="/event" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
            Back to events
          </Link>
        </div>
      </div>
    </div>
  );
}
