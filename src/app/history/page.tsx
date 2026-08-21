"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRatingInfo } from "@/lib/inspection-data";

interface InspectionRecord {
  id: number;
  store_name: string;
  inspection_date: string;
  supervisor_name: string;
  total_score: number;
  rating: string;
  created_at: string;
}

export default function HistoryPage() {
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "excellent" | "good" | "poor">("all");

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
              <Link
                key={record.id}
                href={`/result/${record.id}`}
                className="block bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm">{record.store_name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
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
                  <span className="text-amber-600">查看详情 →</span>
                </div>
              </Link>
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
          <Link
            href="/stats"
            className="flex-1 py-3 text-center border border-amber-200 text-amber-700 font-medium rounded-xl hover:bg-amber-50 transition-colors"
          >
            统计报告
          </Link>
        </div>
      </div>
    </div>
  );
}
