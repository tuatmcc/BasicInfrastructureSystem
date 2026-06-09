'use client'

import { useState } from 'react';

interface ExportReactionsButtonProps {
  eventTitle: string;
  reactions: Array<{
    emoji: string;
    members: string[];
  }>;
}

export default function ExportReactionsButton({ eventTitle, reactions }: ExportReactionsButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    try {
      // メンバーごとのリアクションを集計
      const memberReactionsMap: Record<string, string[]> = {};
      
      reactions.forEach(r => {
        r.members.forEach(member => {
          if (!memberReactionsMap[member]) {
            memberReactionsMap[member] = [];
          }
          memberReactionsMap[member].push(r.emoji);
        });
      });

      const headers = ["メンバー名", "リアクション"];
      const csvRows = [headers.map(h => `"${h}"`).join(",")];

      Object.entries(memberReactionsMap).forEach(([member, emojis]) => {
        const row = [
          member,
          emojis.join(" ")
        ];
        csvRows.push(row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","));
      });

      const csvContent = "\ufeff" + csvRows.join("\n"); // Excel対応BOM付きUTF-8
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `reactions_${eventTitle.replace(/[\s\/:*?"<>|]/g, "_")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to export reactions CSV:", error);
      alert("CSVのエクスポートに失敗しました。");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow transition-all duration-200 flex items-center space-x-1.5 cursor-pointer"
    >
      <span>📥</span>
      <span>{isExporting ? 'Exporting...' : 'Export reactions (CSV)'}</span>
    </button>
  );
}
