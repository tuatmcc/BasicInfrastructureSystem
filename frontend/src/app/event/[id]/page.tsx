import Link from 'next/link';
import ExportReactionsButton from './ExportReactionsButton';
import MemberTable from './MemberTable';
import { cookies } from 'next/headers';
import { client } from '@/lib/client';

interface PageProps {
  params: Promise<{ id: string }>;
}

// メンバーID (UUID) の定義
const MOCK_MEMBER_IDS = {
  taro: "d1a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  misaki: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  ichiro: "b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e",
  kenta: "c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f",
  yusuke: "e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b",
  sho: "f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
  naoki: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
  yufox: "ZyIJpEjfJSawzQlx84OopP0IMwBtVTQW",
  yuka: "f2a3b4c5-d6e7-8a9b-0c1d-2e3f4a5b6c7d",
  daiki: "b3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e",
  haruto: "c4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f",
  sakura: "d5e6f7a8-b90c-1d2e-3f4a-5b6c7d8e9f0a",
  shouta: "e6f7a8b9-0c1d-2e3f-4a5b-6c7d8e9f0a1b",
  aoi: "f7a8b90c-1d2e-3f4a-5b6c-7d8e9f0a1b2c",
  ren: "a8b90c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
  mei: "b90c1d2e-3f4a-5b6c-7d8e-9f0a1b2c3d4e",
  ryo: "0c1d2e3f-4a5b-6c7d-8e9f-0a1b2c3d4e5f",
  kana: "1d2e3f4a-5b6c-7d8e-9f0a-1b2c3d4e5f6a",
  yuto: "2e3f4a5b-6c7d-8e9f-0a1b-2c3d4e5f6a7b",
  hina: "3f4a5b6c-7d8e-9f0a-1b2c-3d4e5f6a7b8c",
  sota: "4a5b6c7d-8e9f-0a1b-2c3d-4e5f6a7b8c9d",
  yuna: "5b6c7d8e-9f0a-1b2c-3d4e-5f6a7b8c9d0e",
  koki: "6c7d8e9f-0a1b-2c3d-4e5f-6a7b8c9d0e1f"
};

// 開発環境用のフォールバックデータ定義 (DBが空の時用)
const MOCK_MEMBER_DETAILS: Record<string, any> = {
  [MOCK_MEMBER_IDS.taro]: { name: "田中 太郎", displayGrade: "B4", studentId: "20241001", studentEmail: "taro@example.com", emergencyContact: "090-1111-2222", insurance: true, someAllergy: false, memberId: MOCK_MEMBER_IDS.taro },
  [MOCK_MEMBER_IDS.misaki]: { name: "佐藤 美咲", displayGrade: "M1", studentId: "20241002", studentEmail: "misaki@example.com", emergencyContact: "090-3333-4444", insurance: true, someAllergy: true, memberId: MOCK_MEMBER_IDS.misaki },
  [MOCK_MEMBER_IDS.ichiro]: { name: "鈴木 一郎", displayGrade: "M2", studentId: "20241003", studentEmail: "ichiro@example.com", emergencyContact: "090-5555-6666", insurance: false, someAllergy: false, memberId: MOCK_MEMBER_IDS.ichiro },
  [MOCK_MEMBER_IDS.kenta]: { name: "高橋 健太", displayGrade: "B3", studentId: "20241004", studentEmail: "kenta@example.com", emergencyContact: "090-7777-8888", insurance: true, someAllergy: false, memberId: MOCK_MEMBER_IDS.kenta },
  [MOCK_MEMBER_IDS.yusuke]: { name: "渡辺 裕介", displayGrade: "B4", studentId: "20241005", studentEmail: "yusuke@example.com", emergencyContact: "090-9999-0000", insurance: true, someAllergy: false, memberId: MOCK_MEMBER_IDS.yusuke },
  [MOCK_MEMBER_IDS.sho]: { name: "中村 翔", displayGrade: "B1", studentId: "20241006", studentEmail: "sho@example.com", emergencyContact: "090-1234-5678", insurance: true, someAllergy: false, memberId: MOCK_MEMBER_IDS.sho },
  [MOCK_MEMBER_IDS.naoki]: { name: "小林 直樹", displayGrade: "B2", studentId: "20241007", studentEmail: "naoki@example.com", emergencyContact: "090-8765-4321", insurance: false, someAllergy: false, memberId: MOCK_MEMBER_IDS.naoki },
  [MOCK_MEMBER_IDS.yufox]: { name: "yufox (管理者)", displayGrade: "D1", studentId: "20241000", studentEmail: "yufox@example.com", emergencyContact: "090-0000-0000", insurance: true, someAllergy: false, memberId: MOCK_MEMBER_IDS.yufox },
  [MOCK_MEMBER_IDS.yuka]: { name: "佐藤 結衣", displayGrade: "B3", studentId: "20241008", studentEmail: "yuka@example.com", emergencyContact: "090-1111-3333", insurance: true, someAllergy: true, memberId: MOCK_MEMBER_IDS.yuka },
  [MOCK_MEMBER_IDS.daiki]: { name: "渡辺 大輝", displayGrade: "M2", studentId: "20241009", studentEmail: "daiki@example.com", emergencyContact: "090-2222-4444", insurance: false, someAllergy: false, memberId: MOCK_MEMBER_IDS.daiki },
  [MOCK_MEMBER_IDS.haruto]: { name: "伊藤 陽翔", displayGrade: "B1", studentId: "20241010", studentEmail: "haruto@example.com", emergencyContact: "090-3333-5555", insurance: true, someAllergy: false, memberId: MOCK_MEMBER_IDS.haruto },
  [MOCK_MEMBER_IDS.sakura]: { name: "山本 さくら", displayGrade: "B2", studentId: "20241011", studentEmail: "sakura@example.com", emergencyContact: "090-4444-6666", insurance: true, someAllergy: true, memberId: MOCK_MEMBER_IDS.sakura },
  [MOCK_MEMBER_IDS.shouta]: { name: "中村 翔太", displayGrade: "B4", studentId: "20241012", studentEmail: "shouta@example.com", emergencyContact: "090-5555-7777", insurance: false, someAllergy: true, memberId: MOCK_MEMBER_IDS.shouta },
  [MOCK_MEMBER_IDS.aoi]: { name: "小林 葵", displayGrade: "M1", studentId: "20241013", studentEmail: "aoi@example.com", emergencyContact: "090-6666-8888", insurance: true, someAllergy: false, memberId: MOCK_MEMBER_IDS.aoi },
  [MOCK_MEMBER_IDS.ren]: { name: "加藤 蓮", displayGrade: "D2", studentId: "20241014", studentEmail: "ren@example.com", emergencyContact: "090-7777-9999", insurance: true, someAllergy: false, memberId: MOCK_MEMBER_IDS.ren },
  [MOCK_MEMBER_IDS.mei]: { name: "木村 芽依", displayGrade: "B3", studentId: "20241015", studentEmail: "mei@example.com", emergencyContact: "090-8888-0000", insurance: false, someAllergy: false, memberId: MOCK_MEMBER_IDS.mei },
  [MOCK_MEMBER_IDS.ryo]: { name: "斎藤 凌", displayGrade: "B4", studentId: "20241016", studentEmail: "ryo@example.com", emergencyContact: "090-9999-1111", insurance: true, someAllergy: false, memberId: MOCK_MEMBER_IDS.ryo },
  [MOCK_MEMBER_IDS.kana]: { name: "清水 佳奈", displayGrade: "M2", studentId: "20241017", studentEmail: "kana@example.com", emergencyContact: "090-1234-9876", insurance: true, someAllergy: true, memberId: MOCK_MEMBER_IDS.kana },
  [MOCK_MEMBER_IDS.yuto]: { name: "山崎 悠人", displayGrade: "B2", studentId: "20241018", studentEmail: "yuto@example.com", emergencyContact: "090-2345-8765", insurance: false, someAllergy: false, memberId: MOCK_MEMBER_IDS.yuto },
  [MOCK_MEMBER_IDS.hina]: { name: "阿部 陽菜", displayGrade: "B1", studentId: "20241019", studentEmail: "hina@example.com", emergencyContact: "090-3456-7654", insurance: true, someAllergy: false, memberId: MOCK_MEMBER_IDS.hina },
  [MOCK_MEMBER_IDS.sota]: { name: "池田 颯太", displayGrade: "D3", studentId: "20241020", studentEmail: "sota@example.com", emergencyContact: "090-4567-6543", insurance: true, someAllergy: false, memberId: MOCK_MEMBER_IDS.sota },
  [MOCK_MEMBER_IDS.yuna]: { name: "橋本 結菜", displayGrade: "M1", studentId: "20241021", studentEmail: "yuna@example.com", emergencyContact: "090-5678-5432", insurance: false, someAllergy: true, memberId: MOCK_MEMBER_IDS.yuna },
  [MOCK_MEMBER_IDS.koki]: { name: "石川 航希", displayGrade: "B4", studentId: "20241022", studentEmail: "koki@example.com", emergencyContact: "090-6789-4321", insurance: true, someAllergy: false, memberId: MOCK_MEMBER_IDS.koki }
};

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
      { emoji: "👍", count: 18, members: [
        MOCK_MEMBER_IDS.taro, MOCK_MEMBER_IDS.misaki, MOCK_MEMBER_IDS.ichiro, MOCK_MEMBER_IDS.kenta, MOCK_MEMBER_IDS.yusuke,
        MOCK_MEMBER_IDS.yuka, MOCK_MEMBER_IDS.daiki, MOCK_MEMBER_IDS.haruto, MOCK_MEMBER_IDS.sakura, MOCK_MEMBER_IDS.aoi,
        MOCK_MEMBER_IDS.ren, MOCK_MEMBER_IDS.ryo, MOCK_MEMBER_IDS.kana, MOCK_MEMBER_IDS.hina, MOCK_MEMBER_IDS.sota,
        MOCK_MEMBER_IDS.koki, MOCK_MEMBER_IDS.yufox, MOCK_MEMBER_IDS.sho
      ] },
      { emoji: "🎉", count: 12, members: [
        MOCK_MEMBER_IDS.misaki, MOCK_MEMBER_IDS.sho, MOCK_MEMBER_IDS.naoki, MOCK_MEMBER_IDS.yuka, MOCK_MEMBER_IDS.sakura,
        MOCK_MEMBER_IDS.shouta, MOCK_MEMBER_IDS.mei, MOCK_MEMBER_IDS.yuto, MOCK_MEMBER_IDS.hina, MOCK_MEMBER_IDS.yuna,
        MOCK_MEMBER_IDS.koki, MOCK_MEMBER_IDS.kana
      ] },
      { emoji: "🔥", count: 8, members: [
        MOCK_MEMBER_IDS.taro, MOCK_MEMBER_IDS.yusuke, MOCK_MEMBER_IDS.daiki, MOCK_MEMBER_IDS.haruto, MOCK_MEMBER_IDS.ren,
        MOCK_MEMBER_IDS.ryo, MOCK_MEMBER_IDS.sota, MOCK_MEMBER_IDS.yufox
      ] }
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
      { emoji: "🔥", count: 12, members: [
        MOCK_MEMBER_IDS.taro, MOCK_MEMBER_IDS.misaki, MOCK_MEMBER_IDS.sho, MOCK_MEMBER_IDS.naoki, MOCK_MEMBER_IDS.yuka,
        MOCK_MEMBER_IDS.haruto, MOCK_MEMBER_IDS.shouta, MOCK_MEMBER_IDS.ryo, MOCK_MEMBER_IDS.kana, MOCK_MEMBER_IDS.sota,
        MOCK_MEMBER_IDS.yuna, MOCK_MEMBER_IDS.koki
      ] },
      { emoji: "👀", count: 11, members: [
        MOCK_MEMBER_IDS.ichiro, MOCK_MEMBER_IDS.kenta, MOCK_MEMBER_IDS.yusuke, MOCK_MEMBER_IDS.daiki, MOCK_MEMBER_IDS.sakura,
        MOCK_MEMBER_IDS.aoi, MOCK_MEMBER_IDS.ren, MOCK_MEMBER_IDS.mei, MOCK_MEMBER_IDS.yuto, MOCK_MEMBER_IDS.hina,
        MOCK_MEMBER_IDS.yufox
      ] }
    ]
  }
};

const defaultEvent = (id: string): MockEvent => {
  const allIds = Object.values(MOCK_MEMBER_IDS);
  return {
    title: `イベントメッセージ (ID: ${id})`,
    content: `メッセージ ID: ${id} の詳細内容です。このメッセージは動的にルーティングされ、表示されています。個別メッセージの具体的なコンテンツやリアクションデータは、データベースとの統合後に動的に取得されるようになります。`,
    date: "2026-06-09 12:00",
    author: {
      name: "システム自動生成",
      avatar: "SYS",
      role: "System"
    },
    reactions: [
      { emoji: "👍", count: Math.ceil(allIds.length * 0.8), members: allIds.slice(0, Math.ceil(allIds.length * 0.8)) },
      { emoji: "🎉", count: Math.ceil(allIds.length * 0.5), members: allIds.slice(3, 3 + Math.ceil(allIds.length * 0.5)) },
      { emoji: "🔥", count: Math.ceil(allIds.length * 0.4), members: allIds.slice(6, 6 + Math.ceil(allIds.length * 0.4)) }
    ]
  };
};

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const event = MOCK_EVENTS[id] || defaultEvent(id);

  // 全リアクションメンバーの重複排除リスト（UUID配列）
  const allReactionMembers = Array.from(
    new Set(event.reactions.flatMap(r => r.members))
  );

  // DBのUUID型カラムへの問い合わせエラー(500)を防ぐため、UUID形式のIDのみをAPI送信対象にする
  const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  const validUuidMembers = allReactionMembers.filter(isUuid);

  // サーバーサイドでのメンバーデータフェッチ
  const cookieStore = await cookies();
  const token = cookieStore.get('app-authorization')?.value;

  let membersData: any[] = [];
  let fetchError: string | null = null;

  try {
    const res = await client.api.v0.member["by-ids"].$post({
      json: { ids: validUuidMembers } // 有効なUUIDのみをフェッチに回す
    }, {
      headers: {
        Cookie: `app-authorization=${token || ''}`
      }
    });

    if (res.status === 403) {
      fetchError = "管理者権限がないため、メンバー名簿データベースは非表示です。";
    } else if (!res.ok) {
      fetchError = `名簿データの取得に失敗しました: ${res.status}`;
    } else {
      membersData = await res.json();
      // DBから取得できたメンバーのIDリスト
      const fetchedIds = new Set(membersData.map((m: any) => m.memberId));
      
      // DBになかったリアクションメンバーについて、MOCK_MEMBER_DETAILS から補完する
      const missingMembers = allReactionMembers
        .filter(id => !fetchedIds.has(id))
        .map(id => MOCK_MEMBER_DETAILS[id])
        .filter(Boolean);
      
      membersData = [...membersData, ...missingMembers];
    }
  } catch (err) {
    console.error("Error fetching members in Server Component:", err);
    fetchError = "名簿データの取得中にサーバーエラーが発生しました。";
  }

  // 各メンバーに対し、リアクション絵文字の配列をマージする
  const membersWithReactions = membersData.map(m => {
    const reactedEmojis = event.reactions
      .filter(r => r.members.includes(m.memberId))
      .map(r => r.emoji);
    return {
      ...m,
      reactions: reactedEmojis
    };
  });

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
        <main className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl shadow-slate-100/50 dark:shadow-none border border-slate-200/60 dark:border-zinc-800">
          
          {/* Accent Header Line */}
          <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-t-2xl" />
          
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
                  Reactions & Participants ({membersData.length})
                </h3>
                {membersData.length > 0 && (
                  <ExportReactionsButton eventTitle={event.title} reactions={event.reactions} />
                )}
              </div>

              {/* Badges summarizing reactions */}
              <div className="flex flex-wrap gap-2">
                {event.reactions.map((react, i) => (
                  <div 
                    key={i} 
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full border border-slate-200/40 dark:border-zinc-700/50 hover:bg-slate-200 dark:hover:bg-zinc-700/80 transition-colors cursor-help"
                    title={
                      membersData
                        .filter(m => react.members.includes(m.memberId))
                        .map(m => m.name)
                        .join(', ') || 'No info'
                    }
                  >
                    <span className="text-lg">{react.emoji}</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">{react.count}</span>
                  </div>
                ))}
              </div>


            </div>

            {/* Divider */}
            <hr className="border-slate-100 dark:border-zinc-800" />

            {/* Member Database Section (TanStack Table) */}
            <div className="space-y-6 pt-2">
              {fetchError ? (
                <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 rounded-xl text-center text-red-700 dark:text-red-400">
                  <span className="text-2xl block mb-2">⚠️</span>
                  <p className="font-semibold text-sm">{fetchError}</p>
                </div>
              ) : (
                <MemberTable data={membersWithReactions} />
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
