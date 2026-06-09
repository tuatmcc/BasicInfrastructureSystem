import Link from 'next/link';
import ExportReactionsButton from './ExportReactionsButton';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface MockEvent {
  title: string;
  content: string;
  date: string;
  author: {
    name: string;
    avatar: string;
    role: string;
  };
  reactions: Array<{
    emoji: string;
    count: number;
    members: string[];
  }>;
}

const MOCK_EVENTS: Record<string, MockEvent> = {
  "1": {
    title: "【重要】新歓バーベキュー開催のお知らせ 🍖",
    content: "みなさんお疲れ様です！今週末の土曜日（6月13日）に、多摩川緑地バーベキュー広場にて新歓BBQを開催します！\n新しいメンバーとの親睦を深める絶好の機会ですので、ぜひご参加ください。\n費用は現役生1,500円、新入生は無料です！準備の都合上、参加できる方はこのメッセージに 👍 または 🎉 のリアクションをお願いします！",
    date: "2026-06-09 10:15",
    author: {
      name: "yufox (管理者)",
      avatar: "YF",
      role: "Admin"
    },
    reactions: [
      { emoji: "👍", count: 5, members: ["田中 太郎", "佐藤 美咲", "鈴木 一郎", "高橋 健太", "渡辺 裕介"] },
      { emoji: "🎉", count: 3, members: ["佐藤 美咲", "中村 翔", "小林 直樹"] },
      { emoji: "🔥", count: 2, members: ["田中 太郎", "渡辺 裕介"] }
    ]
  },
  "2": {
    title: "中間発表対策・スライド相互レビュー会 💻",
    content: "研究室の皆様、中間発表の準備はお進みでしょうか？\n来週の水曜日（6月17日）の18:00から、大セミナー室にて発表スライドの相互レビュー会を行います。\n各自、未完成でも構いませんのでスライドの下書きを持参してください。\nフィードバックし合って発表のクオリティを上げましょう！参加・レビュー協力いただける方は 🔥 または 👀 のリアクションをお願いします。",
    date: "2026-06-08 15:30",
    author: {
      name: "鈴木 一郎 (副代表)",
      avatar: "SI",
      role: "Sub-leader"
    },
    reactions: [
      { emoji: "🔥", count: 4, members: ["田中 太郎", "佐藤 美咲", "中村 翔", "小林 直樹"] },
      { emoji: "👀", count: 3, members: ["鈴木 一郎", "高橋 健太", "渡辺 裕介"] }
    ]
  }
};

const defaultEvent = (id: string): MockEvent => ({
  title: `イベントメッセージ (ID: ${id})`,
  content: `メッセージ ID: ${id} の詳細内容です。このメッセージは動的にルーティングされ、表示されています。個別メッセージの具体的なコンテンツやリアクションデータは、データベースとの統合後に動的に取得されるようになります。`,
  date: "2026-06-09 12:00",
  author: {
    name: "システム自動生成",
    avatar: "SYS",
    role: "System"
  },
  reactions: [
    { emoji: "👍", count: 1, members: ["テストユーザー"] }
  ]
});

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const event = MOCK_EVENTS[id] || defaultEvent(id);

  // 全リアクションメンバーの重複排除リストを作成
  const allReactionMembers = Array.from(
    new Set(event.reactions.flatMap(r => r.members))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-zinc-900 text-slate-800 dark:text-zinc-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-slate-500 dark:text-zinc-400">
          <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-400 dark:text-zinc-600">Events</span>
          <span>/</span>
          <span className="font-medium text-slate-900 dark:text-zinc-200 truncate max-w-[200px] md:max-w-none">
            {event.title}
          </span>
        </nav>

        {/* Main Content Card */}
        <main className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl shadow-slate-100/50 dark:shadow-none border border-slate-200/60 dark:border-zinc-800 overflow-hidden">
          
          {/* Accent Header Line */}
          <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          
          <div className="p-6 md:p-8 space-y-8">
            
            {/* Header section with Title & Author info */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                  Event Details
                </span>
                <span className="text-xs text-slate-400 dark:text-zinc-500">
                  ID: {id}
                </span>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                {event.title}
              </h1>

              {/* Author profile */}
              <div className="flex items-center space-x-3 pt-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-zinc-700 dark:to-zinc-600 flex items-center justify-center font-bold text-slate-700 dark:text-zinc-200 shadow-inner">
                  {event.author.avatar}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-800 dark:text-zinc-200 text-sm">
                      {event.author.name}
                    </span>
                    <span className="text-[10px] bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 px-2 py-0.5 rounded-md font-medium">
                      {event.author.role}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-zinc-500">
                    Posted on {event.date}
                  </span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <hr className="border-slate-100 dark:border-zinc-800" />

            {/* Message Body */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                Message Content
              </h3>
              <div className="p-5 bg-slate-50 dark:bg-zinc-950/60 rounded-xl border border-slate-100 dark:border-zinc-900/50">
                <p className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-zinc-300 text-base md:text-lg">
                  {event.content}
                </p>
              </div>
            </div>

            {/* Divider */}
            <hr className="border-slate-100 dark:border-zinc-800" />

            {/* Reaction Members List */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                  Reactions & Participants ({allReactionMembers.length})
                </h3>
                {allReactionMembers.length > 0 && (
                  <ExportReactionsButton eventTitle={event.title} reactions={event.reactions} />
                )}
              </div>

              {/* Badges summarizing reactions */}
              <div className="flex flex-wrap gap-2">
                {event.reactions.map((react, i) => (
                  <div 
                    key={i} 
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full border border-slate-200/40 dark:border-zinc-700/50 hover:bg-slate-200 dark:hover:bg-zinc-700/80 transition-colors cursor-help"
                    title={react.members.join(', ')}
                  >
                    <span className="text-lg">{react.emoji}</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">{react.count}</span>
                  </div>
                ))}
              </div>

              {/* Detailed Members grid */}
              {allReactionMembers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {allReactionMembers.map((member, i) => {
                    const memberReactions = event.reactions
                      .filter(r => r.members.includes(member))
                      .map(r => r.emoji);

                    return (
                      <div 
                        key={i} 
                        className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-zinc-900/30 rounded-xl border border-slate-100 dark:border-zinc-800/40 hover:border-blue-200 dark:hover:border-zinc-700 transition-all duration-200"
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                            {member.substring(0, 2)}
                          </div>
                          <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                            {member}
                          </span>
                        </div>
                        <div className="flex space-x-0.5">
                          {memberReactions.map((emoji, idx) => (
                            <span key={idx} className="text-sm">{emoji}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 dark:text-zinc-500 italic text-sm">
                  No reactions yet.
                </div>
              )}
            </div>

          </div>
        </main>

        {/* Footer actions */}
        <div className="flex justify-between items-center px-4">
          <Link 
            href="/" 
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center font-medium"
          >
            ← Back to Dashboard
          </Link>
          <span className="text-xs text-slate-400 dark:text-zinc-600">
            Basic Infrastructure System V2
          </span>
        </div>

      </div>
    </div>
  );
}
