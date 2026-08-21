"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// 动态导入xlsx，确保只在客户端加载
let XLSX: typeof import("xlsx") | null = null;
const loadXLSX = async () => {
  if (!XLSX) {
    const mod = await import("xlsx");
    XLSX = mod;
  }
  return XLSX;
};

interface StatsData {
  summary: {
    totalInspections: number;
    avgScore: number;
    ratingDistribution: {
      excellent: number;
      good: number;
      poor: number;
    };
  };
  storeStats: {
    name: string;
    count: number;
    avgScore: number;
    scores: number[];
  }[];
  trendData: {
    date: string;
    count: number;
    avgScore: number;
  }[];
  recentRecords: {
    id: number;
    store_name: string;
    inspection_date: string;
    supervisor_name: string;
    total_score: number;
    rating: string;
    created_at: string;
  }[];
}

export default function StatsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stats?days=${days}`);
        const result = await res.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (err) {
        console.error("加载统计数据失败:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [days]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-500 text-sm">加载统计数据...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-4">数据加载失败</p>
          <Link href="/" className="text-amber-600 underline">返回首页</Link>
        </div>
      </div>
    );
  }

  const { summary, storeStats, trendData, recentRecords } = data;
  const total = summary.ratingDistribution.excellent + summary.ratingDistribution.good + summary.ratingDistribution.poor;

  // 导出Excel（含详细检查项）
  const exportToExcel = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const xlsx = await loadXLSX();
      const wb = xlsx.utils.book_new();

    // Sheet 1: 概览统计
    const overviewData = [
      ["老凤祥督导巡店统计报告"],
      [`统计周期: 近${days}天`],
      [`导出时间: ${new Date().toLocaleString("zh-CN")}`],
      [],
      ["概览数据"],
      ["检查次数", summary.totalInspections],
      ["平均得分", summary.avgScore],
      ["优秀次数", summary.ratingDistribution.excellent],
      ["良好次数", summary.ratingDistribution.good],
      ["较差次数", summary.ratingDistribution.poor],
      ["优秀率", total > 0 ? `${Math.round((summary.ratingDistribution.excellent / total) * 100)}%` : "0%"],
    ];
    const ws1 = xlsx.utils.aoa_to_sheet(overviewData);
    ws1["!cols"] = [{ wch: 15 }, { wch: 15 }];
    xlsx.utils.book_append_sheet(wb, ws1, "概览统计");

    // Sheet 2: 门店排名
    const storeData = [
      ["门店排名"],
      ["排名", "门店名称", "检查次数", "平均得分", "最高分", "最低分"],
      ...storeStats.map((s, i) => [
        i + 1,
        s.name,
        s.count,
        s.avgScore,
        s.scores.length > 0 ? Math.max(...s.scores) : 0,
        s.scores.length > 0 ? Math.min(...s.scores) : 0,
      ]),
    ];
    const ws2 = xlsx.utils.aoa_to_sheet(storeData);
    ws2["!cols"] = [{ wch: 6 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
    xlsx.utils.book_append_sheet(wb, ws2, "门店排名");

    // Sheet 3: 评分趋势
    const trendSheetData = [
      ["评分趋势"],
      ["日期", "检查次数", "平均得分"],
      ...trendData.map((t) => [t.date, t.count, t.avgScore]),
    ];
    const ws3 = xlsx.utils.aoa_to_sheet(trendSheetData);
    ws3["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 10 }];
    xlsx.utils.book_append_sheet(wb, ws3, "评分趋势");

    // Sheet 4: 检查记录汇总
    const recordData = [
      ["检查记录汇总"],
      ["序号", "门店名称", "检查日期", "督导", "总分", "评级"],
      ...recentRecords.map((r, i) => [
        i + 1,
        r.store_name,
        r.inspection_date,
        r.supervisor_name,
        r.total_score,
        r.rating,
      ]),
    ];
    const ws4 = xlsx.utils.aoa_to_sheet(recordData);
    ws4["!cols"] = [{ wch: 6 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 8 }];
    xlsx.utils.book_append_sheet(wb, ws4, "检查记录汇总");

    // Sheet 5: 每项检查明细（详细列出所有35项）
    const detailData = [
      ["检查项明细"],
      ["检查ID", "门店名称", "检查日期", "督导", "检查大类", "序号", "检查项目及标准", "满分", "得分", "问题记录"],
    ];

    // 逐条获取检查记录的详细项
    try {
      for (const record of recentRecords) {
        const res = await fetch(`/api/inspections/${record.id}`);
        const json = await res.json();
        if (json.success && json.data.items) {
          for (const item of json.data.items) {
            detailData.push([
              record.id,
              record.store_name,
              record.inspection_date,
              record.supervisor_name,
              item.category || "",
              item.item_number || "",
              item.description || "",
              item.max_score ?? "",
              item.actual_score ?? "",
              item.notes || "",
            ]);
          }
        }
      }
    } catch (e) {
      console.error("获取检查明细失败:", e);
    }

    const ws5 = xlsx.utils.aoa_to_sheet(detailData);
    ws5["!cols"] = [
      { wch: 8 },
      { wch: 20 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 6 },
      { wch: 40 },
      { wch: 6 },
      { wch: 6 },
      { wch: 30 },
    ];
    xlsx.utils.book_append_sheet(wb, ws5, "检查项明细");

    const dateStr = new Date().toISOString().slice(0, 10);
    xlsx.writeFile(wb, `巡店统计报告_${dateStr}.xlsx`);
    } catch (err) {
      console.error("导出Excel失败:", err);
      alert("导出失败，请重试");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/history" className="flex items-center gap-1 text-gray-600 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </Link>
          <h1 className="text-base font-semibold text-gray-800">统计报告</h1>
          <button
            onClick={exportToExcel}
            disabled={exporting}
            className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2.5 py-1.5 rounded-lg active:bg-green-100 disabled:opacity-50"
          >
            {exporting ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                导出中...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                导出Excel
              </>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* 时间范围选择 */}
        <div className="flex gap-2 mb-4">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                days === d
                  ? "bg-amber-500 text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {d}天
            </button>
          ))}
        </div>

        {/* 概览卡片 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <div className="text-2xl font-bold text-gray-800">{summary.totalInspections}</div>
            <div className="text-xs text-gray-500 mt-1">检查次数</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <div className="text-2xl font-bold text-amber-600">{summary.avgScore}</div>
            <div className="text-xs text-gray-500 mt-1">平均得分</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {total > 0 ? Math.round((summary.ratingDistribution.excellent / total) * 100) : 0}%
            </div>
            <div className="text-xs text-gray-500 mt-1">优秀率</div>
          </div>
        </div>

        {/* 评级分布 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <h3 className="font-semibold text-gray-800 mb-4">评级分布</h3>
          <div className="flex items-center gap-4 mb-4">
            {/* 简易饼图 */}
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                {total > 0 && (
                  <>
                    <circle
                      cx="18" cy="18" r="15.9"
                      fill="none" stroke="#10b981" strokeWidth="3"
                      strokeDasharray={`${(summary.ratingDistribution.excellent / total) * 100} ${100 - (summary.ratingDistribution.excellent / total) * 100}`}
                      strokeDashoffset="0"
                    />
                    <circle
                      cx="18" cy="18" r="15.9"
                      fill="none" stroke="#f59e0b" strokeWidth="3"
                      strokeDasharray={`${(summary.ratingDistribution.good / total) * 100} ${100 - (summary.ratingDistribution.good / total) * 100}`}
                      strokeDashoffset={`-${(summary.ratingDistribution.excellent / total) * 100}`}
                    />
                    <circle
                      cx="18" cy="18" r="15.9"
                      fill="none" stroke="#ef4444" strokeWidth="3"
                      strokeDasharray={`${(summary.ratingDistribution.poor / total) * 100} ${100 - (summary.ratingDistribution.poor / total) * 100}`}
                      strokeDashoffset={`-${((summary.ratingDistribution.excellent + summary.ratingDistribution.good) / total) * 100}`}
                    />
                  </>
                )}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-gray-700">{total}</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-sm text-gray-600">优秀</span>
                </div>
                <span className="text-sm font-medium text-gray-800">{summary.ratingDistribution.excellent}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-sm text-gray-600">良好</span>
                </div>
                <span className="text-sm font-medium text-gray-800">{summary.ratingDistribution.good}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-sm text-gray-600">较差</span>
                </div>
                <span className="text-sm font-medium text-gray-800">{summary.ratingDistribution.poor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 评分趋势 */}
        {trendData.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <h3 className="font-semibold text-gray-800 mb-4">评分趋势</h3>
            <div className="h-40 flex items-end gap-1">
              {trendData.map((item, idx) => {
                const maxScore = 100;
                const height = (item.avgScore / maxScore) * 100;
                const color = item.avgScore >= 90 ? "#10b981" : item.avgScore >= 70 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-500">{item.avgScore}</span>
                    <div
                      className="w-full rounded-t-sm transition-all duration-500"
                      style={{ height: `${height}%`, backgroundColor: color, minHeight: "4px" }}
                    />
                    <span className="text-[9px] text-gray-400 truncate w-full text-center">
                      {item.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 门店排名 */}
        {storeStats.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <h3 className="font-semibold text-gray-800 mb-4">门店排名</h3>
            <div className="space-y-3">
              {storeStats.map((store, idx) => (
                <div key={store.name} className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0
                        ? "bg-amber-100 text-amber-700"
                        : idx === 1
                        ? "bg-gray-100 text-gray-600"
                        : idx === 2
                        ? "bg-orange-100 text-orange-700"
                        : "bg-gray-50 text-gray-400"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 truncate">{store.name}</span>
                      <span className="text-sm font-bold text-gray-800">{store.avgScore}分</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${store.avgScore}%`,
                          backgroundColor: store.avgScore >= 90 ? "#10b981" : store.avgScore >= 70 ? "#f59e0b" : "#ef4444",
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 mt-0.5">检查{store.count}次</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 最近检查 */}
        {recentRecords.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <h3 className="font-semibold text-gray-800 mb-4">最近检查</h3>
            <div className="space-y-2">
              {recentRecords.slice(0, 5).map((record) => (
                <Link
                  key={record.id}
                  href={`/result/${record.id}`}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div>
                    <span className="text-sm text-gray-800">{record.store_name}</span>
                    <span className="text-xs text-gray-400 ml-2">{record.inspection_date}</span>
                  </div>
                  <span
                    className="text-sm font-bold"
                    style={{
                      color: record.total_score >= 90 ? "#10b981" : record.total_score >= 70 ? "#f59e0b" : "#ef4444",
                    }}
                  >
                    {record.total_score}分
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 无数据提示 */}
        {summary.totalInspections === 0 && (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-gray-500 text-sm">暂无统计数据</p>
            <p className="text-gray-400 text-xs mt-1">完成检查后数据将自动统计</p>
          </div>
        )}

        {/* 底部操作 */}
        <div className="flex gap-3 mt-6">
          <Link
            href="/"
            className="flex-1 py-3 text-center bg-gradient-to-r from-amber-600 to-amber-500 text-white font-semibold rounded-xl shadow-lg shadow-amber-200"
          >
            新建检查
          </Link>
          <Link
            href="/history"
            className="flex-1 py-3 text-center border border-amber-200 text-amber-700 font-medium rounded-xl hover:bg-amber-50 transition-colors"
          >
            历史记录
          </Link>
        </div>
      </div>
    </div>
  );
}
