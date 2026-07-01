'use client'

import { useMemo, useState } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  buildReactionMembersCsv,
  matchesMemberTableFilter,
  ReactionMemberRow,
} from './memberTableUtils';

export type { ReactionMemberRow } from './memberTableUtils';

type MemberTableProps = {
  eventTitle: string;
  data: ReactionMemberRow[];
};

type ActiveFilter = {
  id: string;
  columnLabel: string;
  operator: 'contains' | 'equals' | 'is';
  operatorLabel: string;
  value: string;
  valueLabel: string;
};

const customFilterFn: FilterFn<ReactionMemberRow> = (row, columnId, filterValue: { operator: 'contains' | 'equals' | 'is', value: string }) => {
  const rowValue = row.getValue(columnId);
  return matchesMemberTableFilter(rowValue, filterValue);
};

export default function MemberTable({ eventTitle, data }: MemberTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState('name');
  const [selectedOperator, setSelectedOperator] = useState<'contains' | 'equals' | 'is'>('contains');
  const [filterValue, setFilterValue] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const filterableColumns = useMemo(() => [
    { id: 'name', label: '名前', operators: [{ value: 'contains', label: 'を含む' }, { value: 'equals', label: 'と一致する' }], type: 'text' },
    { id: 'displayGrade', label: '学年', operators: [{ value: 'contains', label: 'を含む' }, { value: 'equals', label: 'と一致する' }], type: 'text' },
    { id: 'studentId', label: '学籍番号', operators: [{ value: 'contains', label: 'を含む' }, { value: 'equals', label: 'と一致する' }], type: 'text' },
    { id: 'studentEmail', label: 'メール', operators: [{ value: 'contains', label: 'を含む' }, { value: 'equals', label: 'と一致する' }], type: 'text' },
    { id: 'discordUsername', label: 'Discord', operators: [{ value: 'contains', label: 'を含む' }, { value: 'equals', label: 'と一致する' }], type: 'text' },
    { id: 'insurance', label: '保険加入', operators: [{ value: 'is', label: 'である' }], type: 'boolean' },
    { id: 'someAllergy', label: 'アレルギー', operators: [{ value: 'is', label: 'である' }], type: 'boolean' },
    { id: 'reactions', label: 'リアクション', operators: [{ value: 'contains', label: 'を含む' }], type: 'text' },
  ], []);

  const currentColumnMeta = useMemo(
    () => filterableColumns.find(column => column.id === selectedColumnId) || filterableColumns[0],
    [filterableColumns, selectedColumnId]
  );

  const handleColumnChange = (columnId: string) => {
    setSelectedColumnId(columnId);
    const column = filterableColumns.find(item => item.id === columnId);
    if (!column) return;
    setSelectedOperator(column.operators[0].value as 'contains' | 'equals' | 'is');
    setFilterValue(column.type === 'boolean' ? 'true' : '');
  };

  const handleAddFilter = () => {
    const column = filterableColumns.find(item => item.id === selectedColumnId);
    if (!column) return;

    const operator = column.operators.find(item => item.value === selectedOperator);
    const valueLabel = column.type === 'boolean'
      ? filterValue === 'true' ? 'はい' : 'いいえ'
      : filterValue;

    setActiveFilters([
      ...activeFilters.filter(item => item.id !== selectedColumnId),
      {
        id: selectedColumnId,
        columnLabel: column.label,
        operator: selectedOperator,
        operatorLabel: operator?.label || '',
        value: filterValue,
        valueLabel,
      },
    ]);
    setShowFilterMenu(false);
    setFilterValue(column.type === 'boolean' ? 'true' : '');
  };

  const columnFilters = useMemo<ColumnFiltersState>(() => (
    activeFilters.map(filter => ({
      id: filter.id,
      value: {
        operator: filter.operator,
        value: filter.value,
      },
    }))
  ), [activeFilters]);

  const columns = useMemo<ColumnDef<ReactionMemberRow>[]>(() => [
    {
      accessorKey: 'name',
      header: '名前',
      cell: info => <span className="font-semibold text-slate-950 dark:text-white">{info.getValue() as string}</span>,
      filterFn: customFilterFn,
    },
    {
      accessorKey: 'displayGrade',
      header: '学年',
      cell: info => (info.getValue() as string | null) || '-',
      filterFn: customFilterFn,
    },
    {
      accessorKey: 'studentId',
      header: '学籍番号',
      cell: info => (info.getValue() as string | null) || '-',
      filterFn: customFilterFn,
    },
    {
      accessorKey: 'studentEmail',
      header: '学生メール',
      cell: info => <span className="text-xs text-slate-500 dark:text-zinc-400">{(info.getValue() as string | null) || '-'}</span>,
      filterFn: customFilterFn,
    },
    {
      accessorKey: 'discordUsername',
      header: 'Discord',
      cell: info => <span className="text-xs text-slate-600 dark:text-zinc-300">{info.getValue() as string}</span>,
      filterFn: customFilterFn,
    },
    {
      accessorKey: 'insurance',
      header: '保険',
      filterFn: customFilterFn,
      cell: info => {
        const value = info.getValue() as boolean | null;
        if (value === null) return <span className="text-slate-400 dark:text-zinc-600">-</span>;
        return <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${value ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'}`}>{value ? '加入' : '未加入'}</span>;
      },
    },
    {
      accessorKey: 'someAllergy',
      header: 'アレルギー',
      filterFn: customFilterFn,
      cell: info => {
        const value = info.getValue() as boolean | null;
        if (value === null) return <span className="text-slate-400 dark:text-zinc-600">-</span>;
        return <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${value ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300' : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>{value ? 'あり' : 'なし'}</span>;
      },
    },
    {
      accessorKey: 'reactions',
      header: 'リアクション',
      filterFn: customFilterFn,
      cell: info => {
        const value = info.getValue() as string[];
        if (!value || value.length === 0) return <span className="text-slate-400 dark:text-zinc-600">-</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((reaction) => (
              <span key={reaction} className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700 text-xs">
                {reaction}
              </span>
            ))}
          </div>
        );
      },
    },
  ], []);

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

  const visibleRows = table.getRowModel().rows.map(row => row.original);

  const handleExport = () => {
    setIsExporting(true);
    try {
      const csvContent = buildReactionMembersCsv(visibleRows);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `reactions_${eventTitle.replace(/[\s/:*?"<>|]/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase">
          リアクションメンバー詳細一覧 ({visibleRows.length}/{data.length}名)
        </h2>
        <button
          onClick={handleExport}
          disabled={isExporting || visibleRows.length === 0}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-md text-xs font-semibold transition-colors"
        >
          {isExporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-zinc-900/60 p-3 rounded-lg border border-slate-200 dark:border-zinc-800">
        <div className="relative">
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="px-3 py-2 bg-white dark:bg-zinc-950 hover:bg-slate-50 dark:hover:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-colors"
          >
            フィルター{activeFilters.length > 0 ? ` ${activeFilters.length}` : ''}
          </button>

          {showFilterMenu && (
            <>
              <div className="fixed inset-0 z-30 md:bg-transparent" onClick={() => setShowFilterMenu(false)} />
              <div className="fixed bottom-0 left-0 right-0 md:absolute md:bottom-auto md:left-0 md:right-auto md:mt-2 w-full md:w-80 bg-white dark:bg-zinc-950 border-t md:border border-slate-200 dark:border-zinc-800 rounded-t-xl md:rounded-lg shadow-xl p-4 z-40 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase">列</label>
                  <select
                    value={selectedColumnId}
                    onChange={event => handleColumnChange(event.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md text-xs"
                  >
                    {filterableColumns.map(column => (
                      <option key={column.id} value={column.id}>{column.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase">条件</label>
                  <select
                    value={selectedOperator}
                    onChange={event => setSelectedOperator(event.target.value as 'contains' | 'equals' | 'is')}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md text-xs"
                  >
                    {currentColumnMeta.operators.map(operator => (
                      <option key={operator.value} value={operator.value}>{operator.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase">値</label>
                  {currentColumnMeta.type === 'boolean' ? (
                    <select
                      value={filterValue}
                      onChange={event => setFilterValue(event.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md text-xs"
                    >
                      <option value="true">はい</option>
                      <option value="false">いいえ</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={filterValue}
                      onChange={event => setFilterValue(event.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md text-xs"
                    />
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowFilterMenu(false)}
                    className="px-3 py-2 bg-slate-100 dark:bg-zinc-900 rounded-md text-xs font-semibold"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleAddFilter}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md text-xs font-semibold"
                  >
                    適用
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {activeFilters.map(filter => (
          <button
            key={filter.id}
            onClick={() => setActiveFilters(activeFilters.filter(item => item.id !== filter.id))}
            className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40 rounded-full text-xs"
          >
            {filter.columnLabel} {filter.operatorLabel} {filter.valueLabel} x
          </button>
        ))}

        {activeFilters.length > 0 && (
          <button
            onClick={() => setActiveFilters([])}
            className="text-xs font-semibold text-slate-500 dark:text-zinc-400 underline"
          >
            すべてクリア
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800">
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="p-3 font-semibold text-slate-600 dark:text-zinc-400 select-none cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                    <span className="ml-1 text-xs text-slate-400">
                      {{ asc: '↑', desc: '↓' }[header.column.getIsSorted() as string] ?? '↕'}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? table.getRowModel().rows.map(row => (
              <tr key={row.id} className="border-b border-slate-100 dark:border-zinc-800/60 last:border-0 hover:bg-slate-50 dark:hover:bg-zinc-800/30">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="p-3 text-slate-700 dark:text-zinc-300">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-slate-400 dark:text-zinc-500">
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
