'use client'

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  FilterFn,
} from '@tanstack/react-table';
import { InferResponseType } from 'hono/client';
import { client } from '@/lib/client';

type MemberListResponse = InferResponseType<typeof client.api.v0.member["by-ids"]["$post"], 200>;
type MemberData = MemberListResponse[number] & {
  reactions?: string[];
};

interface MemberTableProps {
  data: MemberData[];
}

interface ActiveFilter {
  id: string; // カラム名 (accessorKey)
  columnLabel: string;
  operator: 'contains' | 'equals' | 'is';
  operatorLabel: string;
  value: any;
  valueLabel: string;
}

// 演算子に応じたカスタムフィルタ関数
const customFilterFn: FilterFn<MemberData> = (row, columnId, filterValue: { operator: string, value: any }) => {
  const rowValue = row.getValue(columnId);
  const { operator, value } = filterValue;

  if (rowValue === undefined || rowValue === null) return false;

  if (operator === 'contains') {
    if (Array.isArray(rowValue)) {
      return rowValue.some(item => String(item).toLowerCase().includes(String(value).toLowerCase()));
    }
    return String(rowValue).toLowerCase().includes(String(value).toLowerCase());
  }
  if (operator === 'equals') {
    return String(rowValue).toLowerCase() === String(value).toLowerCase();
  }
  if (operator === 'is') {
    const targetBool = value === 'true' || value === true;
    return !!rowValue === targetBool;
  }
  return true;
};

export default function MemberTable({ data }: MemberTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  
  // 動的フィルターの状態管理
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // フィルターポップオーバー内の一時選択状態
  const [selectedColumnId, setSelectedColumnId] = useState<string>('name');
  const [selectedOperator, setSelectedOperator] = useState<'contains' | 'equals' | 'is'>('contains');
  const [filterValue, setFilterValue] = useState<string>('');

  // フィルター設定のメタデータ定義 (ここに定義を増やすだけで自動的にUIが対応する)
  const filterableColumns = [
    { id: 'name', label: '名前', operators: [{ value: 'contains', label: 'を含む' }, { value: 'equals', label: 'と一致する' }], type: 'text' },
    { id: 'displayGrade', label: '学年', operators: [{ value: 'contains', label: 'を含む' }, { value: 'equals', label: 'と一致する' }], type: 'text' },
    { id: 'studentId', label: '学籍番号', operators: [{ value: 'contains', label: 'を含む' }, { value: 'equals', label: 'と一致する' }], type: 'text' },
    { id: 'insurance', label: '保険加入', operators: [{ value: 'is', label: 'である' }], type: 'boolean' },
    { id: 'someAllergy', label: 'アレルギー', operators: [{ value: 'is', label: 'である' }], type: 'boolean' },
    { id: 'reactions', label: 'リアクション', operators: [{ value: 'contains', label: 'を含む' }], type: 'text' },
  ];

  const currentColumnMeta = useMemo(() => {
    return filterableColumns.find(c => c.id === selectedColumnId) || filterableColumns[0];
  }, [selectedColumnId]);

  // 選択列が変わった時に、演算子と入力タイプをリセットする
  const handleColumnChange = (columnId: string) => {
    setSelectedColumnId(columnId);
    const col = filterableColumns.find(c => c.id === columnId);
    if (col) {
      setSelectedOperator(col.operators[0].value as any);
      setFilterValue(col.type === 'boolean' ? 'true' : '');
    }
  };

  // フィルター条件を適用する
  const handleAddFilter = () => {
    const col = filterableColumns.find(c => c.id === selectedColumnId);
    if (!col) return;

    // 同一カラムに対する既存のフィルターがあれば上書き（削除）する
    const newFilters = activeFilters.filter(f => f.id !== selectedColumnId);

    const opLabel = col.operators.find(o => o.value === selectedOperator)?.label || '';
    
    let valLabel = filterValue;
    if (col.type === 'boolean') {
      valLabel = filterValue === 'true' ? 'はい (あり/加入)' : 'いいえ (なし/未加入)';
    }

    newFilters.push({
      id: selectedColumnId,
      columnLabel: col.label,
      operator: selectedOperator,
      operatorLabel: opLabel,
      value: filterValue,
      valueLabel: valLabel,
    });

    setActiveFilters(newFilters);
    setShowFilterMenu(false);
    // 入力値を初期化
    setFilterValue(col.type === 'boolean' ? 'true' : '');
  };

  // アクティブなフィルターを TanStack Table の形式に変換
  const columnFilters = useMemo<ColumnFiltersState>(() => {
    return activeFilters.map(f => ({
      id: f.id,
      value: {
        operator: f.operator,
        value: f.value
      }
    }));
  }, [activeFilters]);

  // カラムの定義
  const columns = useMemo<ColumnDef<MemberData>[]>(
    () => [
      {
        accessorKey: 'name',
        header: '名前',
        cell: info => <span className="font-semibold text-slate-900 dark:text-white">{info.getValue() as string}</span>,
        filterFn: customFilterFn,
      },
      {
        accessorKey: 'displayGrade',
        header: '学年',
        cell: info => (info.getValue() as string) || '-',
        filterFn: customFilterFn,
      },
      {
        accessorKey: 'studentId',
        header: '学籍番号',
        filterFn: customFilterFn,
      },
      {
        accessorKey: 'studentEmail',
        header: 'メールアドレス',
        cell: info => <span className="text-slate-500 dark:text-zinc-400 text-xs">{info.getValue() as string}</span>,
        filterFn: customFilterFn,
      },
      {
        accessorKey: 'emergencyContact',
        header: '緊急連絡先',
        filterFn: customFilterFn,
      },
      {
        accessorKey: 'insurance',
        header: '保険加入',
        filterFn: customFilterFn,
        cell: info => {
          const val = info.getValue() as boolean;
          return (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${val ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'}`}>
              {val ? '加入' : '未加入'}
            </span>
          );
        },
      },
      {
        accessorKey: 'someAllergy',
        header: 'アレルギー',
        filterFn: customFilterFn,
        cell: info => {
          const val = info.getValue() as boolean;
          return (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${val ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400' : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
              {val ? 'あり' : 'なし'}
            </span>
          );
        },
      },
      {
        accessorKey: 'reactions',
        header: 'リアクション',
        filterFn: customFilterFn,
        cell: info => {
          const val = info.getValue() as string[];
          if (!val || val.length === 0) return <span className="text-slate-400 dark:text-zinc-600">-</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {val.map((emoji, idx) => (
                <span 
                  key={idx} 
                  className="px-1.5 py-0.5 rounded bg-slate-50 dark:bg-zinc-850 border border-slate-200/50 dark:border-zinc-800 text-xs shadow-3xs"
                >
                  {emoji}
                </span>
              ))}
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      {/* Title */}
      <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
        リアクションメンバー詳細一覧 ({data.length}名)
      </h3>

      {/* Filter Toolbar (Supabase / Modern SaaS style) */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-50/50 dark:bg-zinc-900/40 p-3.5 md:p-3 rounded-2xl border border-slate-200/50 dark:border-zinc-800/60 shadow-inner">
        
        {/* Filter Button & Popover */}
        <div className="relative">
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="px-3 py-1.8 bg-white dark:bg-zinc-950 hover:bg-slate-50 dark:hover:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-slate-755 dark:text-zinc-300 flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
          >
            <span>➕</span>
            <span>フィルター</span>
            {activeFilters.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-indigo-600 text-white rounded-full text-[10px] font-bold">
                {activeFilters.length}
              </span>
            )}
          </button>

          {/* Filter Popover Menu */}
          {showFilterMenu && (
            <>
              {/* Backdrop: Dark blur overlay on mobile, transparent on desktop */}
              <div 
                className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs md:bg-transparent md:backdrop-blur-none transition-all duration-150" 
                onClick={() => setShowFilterMenu(false)} 
              />
              
              {/* 
                Filter Dialog:
                - Mobile: Renders as a bottom sheet (bottom-0 left-0 right-0 w-full rounded-t-2xl)
                - Desktop: Renders as a popover (absolute left-0 mt-2 w-80 rounded-xl)
              */}
              <div className="fixed bottom-0 left-0 right-0 md:absolute md:bottom-auto md:left-0 md:right-auto md:mt-2 w-full md:w-80 bg-white dark:bg-zinc-950 border-t md:border border-slate-200 dark:border-zinc-800 rounded-t-2xl md:rounded-xl shadow-2xl md:shadow-xl p-5 md:p-4 z-40 space-y-4 max-h-[80vh] md:max-h-[480px] overflow-y-auto overscroll-behavior-contain animate-in slide-in-from-bottom md:slide-in-from-top-2 duration-200">
                
                {/* Mobile drag-bar indicator */}
                <div className="w-12 h-1 bg-slate-200 dark:bg-zinc-800 rounded-full mx-auto mb-2 md:hidden" />

                <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-200 border-b border-slate-100 dark:border-zinc-850 pb-2">
                  フィルター条件の追加
                </h4>
                
                {/* Column selection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">列</label>
                  <select
                    value={selectedColumnId}
                    onChange={e => handleColumnChange(e.target.value)}
                    className="w-full px-3 py-2 md:px-2.5 md:py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-700 dark:text-zinc-300 cursor-pointer focus:border-indigo-500"
                  >
                    {filterableColumns.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {/* Operator selection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">条件</label>
                  <select
                    value={selectedOperator}
                    onChange={e => setSelectedOperator(e.target.value as any)}
                    className="w-full px-3 py-2 md:px-2.5 md:py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-700 dark:text-zinc-300 cursor-pointer focus:border-indigo-500"
                  >
                    {currentColumnMeta.operators.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Value input / toggle */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">値</label>
                  {currentColumnMeta.type === 'boolean' ? (
                    <select
                      value={filterValue}
                      onChange={e => setFilterValue(e.target.value)}
                      className="w-full px-3 py-2 md:px-2.5 md:py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-700 dark:text-zinc-300 cursor-pointer focus:border-indigo-500"
                    >
                      <option value="true">はい (あり / 加入済)</option>
                      <option value="false">いいえ (なし / 未加入)</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={filterValue}
                      onChange={e => setFilterValue(e.target.value)}
                      placeholder="キーワードを入力..."
                      className="w-full px-3 py-2 md:px-2.5 md:py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-755 dark:text-zinc-300 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  )}
                </div>

                {/* Submit / Cancel Actions */}
                <div className="flex justify-end space-x-2 pt-3 md:pt-2 border-t border-slate-100 dark:border-zinc-850">
                  <button
                    onClick={() => setShowFilterMenu(false)}
                    className="px-3.5 py-2 md:px-2.5 md:py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-lg text-xs font-semibold text-slate-500 dark:text-zinc-400 transition-colors cursor-pointer"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleAddFilter}
                    className="px-3.5 py-2 md:px-2.5 md:py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer"
                  >
                    適用する
                  </button>
                </div>

              </div>
            </>
          )}
        </div>

        {/* Active Filter Badges - Integrated Inside Toolbar */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 animate-in fade-in duration-200">
            <span className="h-4 w-px bg-slate-200 dark:bg-zinc-800 mx-1 hidden sm:inline-block" />
            {activeFilters.map((f, i) => (
              <div
                key={i}
                className="flex items-center space-x-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100/60 dark:border-indigo-900/30 rounded-full text-xs font-medium shadow-2xs"
              >
                <span className="font-semibold">{f.columnLabel}</span>
                <span className="text-slate-400 dark:text-zinc-500 font-normal">{f.operatorLabel}</span>
                <span className="underline decoration-indigo-200 dark:decoration-indigo-900 font-semibold">{f.valueLabel}</span>
                <button
                  onClick={() => setActiveFilters(activeFilters.filter(item => item.id !== f.id))}
                  className="text-slate-400 hover:text-indigo-950 dark:hover:text-indigo-200 transition-colors font-bold pl-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => setActiveFilters([])}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 underline transition-colors cursor-pointer ml-1"
            >
              すべてクリア
            </button>
          </div>
        )}

      </div>

      {/* TanStack Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="bg-slate-50/70 dark:bg-zinc-800/40 border-b border-slate-200 dark:border-zinc-800">
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="p-3 font-semibold text-slate-600 dark:text-zinc-400 select-none cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                      <span className="text-xs text-slate-400">
                        {{
                          asc: ' 🔼',
                          desc: ' 🔽',
                        }[header.column.getIsSorted() as string] ?? ' ↕️'}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 dark:border-zinc-800/50 last:border-0 odd:bg-slate-50/20 dark:odd:bg-zinc-900/10 hover:bg-slate-50/60 dark:hover:bg-zinc-800/20 transition-all duration-150"
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="p-3 text-slate-700 dark:text-zinc-300">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-slate-400 dark:text-zinc-500 italic">
                  条件に該当するメンバーが見つかりません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
