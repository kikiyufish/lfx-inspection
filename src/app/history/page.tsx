"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRatingInfo } from "@/lib/inspection-data";

interface InspectionRecord {
  id: number;
  store_name: string;
  region: string;
  responsible_person: string;
  inspection_date: string;
  supervisor_name: string;
  total_score: number;
  rating: string;
  status: string;
  created_at: string;
}

export default function HistoryPage() {
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "excellent" | "good" | "poor">("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/inspections");
        const result = await res.json();
        if (result.success) {
          setRecords(result.data);
        }
      } catch (err) {
        console.error("加载历史记录失败:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const filteredRecords = records.filter((r) => {
    if (filter === "all") return true;
    if (filter === "excellent") return r.total_score >= 90;
    if (filter === "good") return r.total_score >= 70 && r.total_score < 90;
    if (filter === "poor") return r.total_score < 70;
    return true;
  });

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecords.map((r) => r.id)));
    }
  };

  const handleBatchExport = async () => {
    if (selectedIds.size === 0) {
      alert("请先选择要导出的检查记录");
      return;
    }
    setExporting(true);
    try {
      const res = await fetch("/api/inspections/batch-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const result = await res.json();
      if (result.success && result.data) {
        const { content, filename } = result.data;
        const byteCharacters = atob(content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        setSelectedIds(new Set());
      } else {
        alert(result.error || "导出失败");
      }
    } catch (err) {
      console.error("导出失败:", err);
      alert("导出失败，请重试");
    } finally {
      setExporting(false);
    }
  };

  const getRatingBadge = (score: number) => {
    const info = getRatingInfo(score);
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
        style={{ backgroundColor: info.color }}
      >
        {info.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1 text-gray-600 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </Link>
          <h1 className="text-base font-semibold text-gray-800">检查记录</h1>
          <Link href="/stats" className="text-sm text-amber-600 font-medium">
            统计
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* 筛选标签 */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {[
            { key: "all", label: "全部", count: records.length },
            { key: "excellent", label: "优秀", count: records.filter((r) => r.total_score >= 90).length },
            { key: "good", label: "良好", count: records.filter((r) => r.total_score >= 70 && r.total_score < 90).length },
            { key: "poor", label: "较差", count: records.filter((r) => r.total_score < 70).length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as typeof filter)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filter === tab.key
                  ? "bg-amber-500 text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* 批量操作栏 */}
        {filteredRecords.length > 0 && (
          <div className="flex items-center justify-between mb-3 bg-white rounded-lg border border-gray-100 px-3 py-2">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.size === filteredRecords.length && filteredRecords.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              全选
            </label>
            {selectedIds.size > 0 && (
              <span className="text-xs text-amber-600 font-medium">
                已选 {selectedIds.size} 项
              </span>
            )}
          </div>
        )}

        {/* 记录列表 */}
        {loading ? (
          <div className="text-center py-12">
            <svg className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-gray-500 text-sm">加载中...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 text-sm">暂无检查记录</p>
            <Link href="/" className="text-amber-600 text-sm mt-2 inline-block">
              去创建第一个检查
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className={`bg-white rounded-xl border p-4 transition-shadow ${
                  selectedIds.has(record.id)
                    ? "border-amber-300 shadow-md shadow-amber-100"
                    : "border-gray-100 hover:shadow-md"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* 选择框 */}
                  <label className="flex items-center pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(record.id)}
                      onChange={() => toggleSelect(record.id)}
                      className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                  </label>
                  
                  {/* 记录内容 */}
                  <Link href={`/result/${record.id}`} className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-800 text-sm">{record.store_name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {record.region && <span>{record.region} | </span>}
                          {record.inspection_date} | {record.supervisor_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-800">{record.total_score}</div>
                        {getRatingBadge(record.total_score)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-50">
                      <span>提交于 {new Date(record.created_at).toLocaleString("zh-CN")}</span>
                      <div className="flex items-center gap-2">
                        {record.status === "edited" && (
                          <span className="text-blue-500">已修改</span>
                        )}
                        <span className="text-amber-600">查看详情 →</span>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 底部操作 */}
        <div className="mt-6 flex gap-3">
          <Link
            href="/"
            className="flex-1 py-3 text-center bg-gradient-to-r from-amber-600 to-amber-500 text-white font-semibold rounded-xl shadow-lg shadow-amber-200"
          >
            新建检查
          </Link>
          <button
            onClick={handleBatchExport}
            disabled={selectedIds.size === 0 || exporting}
            className="flex-1 py-3 text-center border border-amber-200 text-amber-700 font-medium rounded-xl hover:bg-amber-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? "导出中..." : `导出Excel (${selectedIds.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
