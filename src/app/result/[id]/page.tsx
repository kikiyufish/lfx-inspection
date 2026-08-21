"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getRatingInfo } from "@/lib/inspection-data";
import { inspectionCategories } from "@/lib/inspection-data";

interface InspectionResult {
  id: number;
  store_name: string;
  region: string | null;
  responsible_person: string | null;
  inspection_date: string;
  supervisor_name: string;
  total_score: number;
  max_score: number;
  rating: string;
  status: string;
  edit_count: number;
  created_at: string;
  items: {
    id: number;
    item_number: number;
    category: string;
    description: string;
    max_score: number;
    actual_score: number;
    notes: string | null;
    photo_keys: string[] | null;
    photo_urls: string[];
    problem_level: string | null;
  }[];
}

export default function ResultPage() {
  const params = useParams();
  const [data, setData] = useState<InspectionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const res = await fetch(`/api/inspections/${params.id}`);
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "加载失败");
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [params.id]);

  const handleExportPDF = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const element = document.getElementById("report-content");
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#f9fafb",
      });

      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `巡店报告_${data.store_name}_${data.inspection_date}.png`;
      link.href = imgData;
      link.click();
    } catch (err) {
      console.error("导出失败:", err);
      alert("导出失败，请重试");
    } finally {
      setExporting(false);
    }
  };

  // 导出Word报告
  const handleExportReport = async () => {
    try {
      const res = await fetch(`/api/inspections/${params.id}/report`);
      if (!res.ok) throw new Error("导出失败");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `老凤祥督导巡店报表（${data?.store_name}）${data?.inspection_date}.docx`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("导出报告失败:", err);
      alert("导出报告失败，请重试");
    }
  };

  // 导出单店Excel（检查表+报表）
  const handleExportExcel = async () => {
    try {
      const res = await fetch(`/api/inspections/${params.id}/excel`);
      if (!res.ok) throw new Error("导出失败");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "导出失败");
      // 将base64转换为blob
      const byteChars = atob(json.data.content);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = json.data.filename;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("导出Excel失败:", err);
      alert("导出Excel失败，请重试");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-500 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || "数据加载失败"}</p>
          <Link href="/" className="text-amber-600 underline">返回首页</Link>
        </div>
      </div>
    );
  }

  const ratingInfo = getRatingInfo(data.total_score);

  const categorySummary = inspectionCategories.map((cat) => {
    const catItems = data.items.filter((item) => item.category === cat.name);
    const catScore = catItems.reduce((sum, item) => sum + item.actual_score, 0);
    return { ...cat, score: catScore };
  });

  // 问题记录：只列出有扣分的或有填写备注的检查项
  const problemItems = data.items.filter(
    (item) => item.actual_score < item.max_score || (item.notes && item.notes.trim())
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* 操作栏 - 打印时隐藏 */}
      <div className="print:hidden sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-2.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1 text-gray-600 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回
        </Link>
        <span className="text-sm font-medium text-gray-700">检查报告</span>
        <div className="flex gap-2">
          <button
            onClick={handleExportReport}
            className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg font-medium"
          >
            导出报告
          </button>
          <button
            onClick={handleExportExcel}
            className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-medium"
          >
            导出Excel
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="text-xs px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg font-medium disabled:opacity-50"
          >
            {exporting ? "导出中..." : "导出图片"}
          </button>
          <button
            onClick={() => window.print()}
            className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg font-medium"
          >
            打印
          </button>
          {data.edit_count === 0 && (
            <Link
              href={`/?edit=${params.id}`}
              className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg font-medium"
            >
              修改记录
            </Link>
          )}
          {data.edit_count > 0 && (
            <span className="text-xs px-3 py-1.5 bg-gray-50 text-gray-400 rounded-lg">
              已修改过
            </span>
          )}
        </div>
      </div>

      {/* 报告内容区域 - 用于导出 */}
      <div id="report-content">
        {/* 顶部结果展示 */}
        <div
          className="px-4 py-8 text-center text-white"
          style={{
            background: `linear-gradient(135deg, ${ratingInfo.color}dd, ${ratingInfo.color}99)`,
          }}
        >
          <div className="max-w-lg mx-auto">
            <div className="text-5xl font-bold mb-2">{data.total_score}</div>
            <div className="text-xl font-semibold mb-1">{ratingInfo.label}</div>
            <p className="text-white/80 text-sm">{ratingInfo.description}</p>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 -mt-4">
          {/* 基本信息卡片 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
            <h3 className="font-semibold text-gray-800 mb-3">检查信息</h3>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">门店名称</span>
                <span className="text-gray-800 font-medium">{data.store_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">检查日期</span>
                <span className="text-gray-800 font-medium">{data.inspection_date}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">督导姓名</span>
                <span className="text-gray-800 font-medium">{data.supervisor_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">提交时间</span>
                <span className="text-gray-800 font-medium">
                  {new Date(data.created_at).toLocaleString("zh-CN")}
                </span>
              </div>
            </div>
          </div>

          {/* 分类得分 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
            <h3 className="font-semibold text-gray-800 mb-3">分类得分</h3>
            <div className="space-y-3">
              {categorySummary.map((cat) => (
                <div key={cat.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{cat.name}</span>
                    <span className="font-medium text-gray-800">
                      {cat.score}/{cat.maxScore}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${cat.maxScore > 0 ? (cat.score / cat.maxScore) * 100 : 0}%`,
                        backgroundColor:
                          cat.score / cat.maxScore >= 0.8
                            ? "#10b981"
                            : cat.score / cat.maxScore >= 0.5
                            ? "#f59e0b"
                            : "#ef4444",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 问题记录 */}
          {problemItems.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                问题记录 ({problemItems.length}项)
              </h3>
              <div className="space-y-4">
                {problemItems.map((item) => (
                  <div key={item.id} className="border-l-2 border-amber-300 pl-3">
                    <div className="flex items-start gap-2 mb-1">
                      <span className="shrink-0 w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5">
                        {item.item_number}
                      </span>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                    <div className="ml-7">
                      <div className="flex items-center gap-2 mb-1">
                        {item.actual_score < item.max_score ? (
                          <span className="text-xs font-medium text-red-600">
                            扣{item.max_score - item.actual_score}分
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-amber-600">
                            满分 (有备注)
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          (得分 {item.actual_score}/{item.max_score})
                        </span>
                      </div>
                      {item.notes && (
                        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-2 mb-2">
                          {item.notes}
                        </p>
                      )}
                      {!item.notes && (
                        <p className="text-sm text-gray-400 italic mb-2">
                          未填写问题描述
                        </p>
                      )}
                      {item.photo_urls && item.photo_urls.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {item.photo_urls.map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`问题照片${idx + 1}`}
                              className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 操作按钮 - 打印时隐藏 */}
          <div className="flex gap-3 mt-6 print:hidden">
            <Link
              href="/"
              className="flex-1 py-3 text-center border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
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
    </div>
  );
}
