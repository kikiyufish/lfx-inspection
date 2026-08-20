"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getRatingInfo } from "@/lib/inspection-data";
import { inspectionCategories } from "@/lib/inspection-data";

interface InspectionResult {
  id: number;
  store_name: string;
  inspection_date: string;
  supervisor_name: string;
  total_score: number;
  max_score: number;
  rating: string;
  status: string;
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
  }[];
}

export default function ResultPage() {
  const params = useParams();
  const [data, setData] = useState<InspectionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  // 按分类汇总
  const categorySummary = inspectionCategories.map((cat) => {
    const catItems = data.items.filter((item) => item.category === cat.name);
    const catScore = catItems.reduce((sum, item) => sum + item.actual_score, 0);
    return { ...cat, score: catScore };
  });

  // 有问题记录的项目
  const problemItems = data.items.filter(
    (item) => item.notes || (item.photo_urls && item.photo_urls.length > 0)
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
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
                      <span className="text-xs font-medium text-amber-700">
                        得分: {item.actual_score}/{item.max_score}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-2 mb-2">
                        {item.notes}
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

        {/* 操作按钮 */}
        <div className="flex gap-3 mt-6">
          <Link
            href="/"
            className="flex-1 py-3 text-center border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            新建检查
          </Link>
          <button
            onClick={() => window.print()}
            className="flex-1 py-3 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-semibold rounded-xl shadow-lg shadow-amber-200 active:scale-[0.98] transition-transform"
          >
            打印报告
          </button>
        </div>
      </div>
    </div>
  );
}
