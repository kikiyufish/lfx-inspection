"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { inspectionCategories, getAllItems, getRatingInfo } from "@/lib/inspection-data";
import { PhotoUpload } from "@/components/PhotoUpload";
import { ScoreSlider } from "@/components/ScoreSlider";
import { CategorySection } from "@/components/CategorySection";
import { SubmitModal } from "@/components/SubmitModal";

interface ItemData {
  actual_score: number;
  notes: string;
  photo_keys: string[];
}

export default function InspectionPage() {
  const router = useRouter();
  const [storeName, setStoreName] = useState("");
  const [inspectionDate, setInspectionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [supervisorName, setSupervisorName] = useState("");
  const [itemData, setItemData] = useState<Record<number, ItemData>>({});
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    inspectionCategories[0]?.id || null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [currentStep, setCurrentStep] = useState<"info" | "form">("info");

  const allItems = getAllItems();

  const updateItemData = useCallback(
    (itemNumber: number, field: keyof ItemData, value: number | string | string[]) => {
      setItemData((prev) => {
        const existing = prev[itemNumber] || { actual_score: 0, notes: "", photo_keys: [] };
        return {
          ...prev,
          [itemNumber]: {
            ...existing,
            [field]: value,
          },
        };
      });
    },
    []
  );

  const totalScore = allItems.reduce(
    (sum, item) => sum + (itemData[item.itemNumber]?.actual_score || 0),
    0
  );

  const ratingInfo = getRatingInfo(totalScore);

  const handleSubmit = async () => {
    if (!storeName.trim() || !inspectionDate || !supervisorName.trim()) {
      alert("请填写完整的门店信息");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        store_name: storeName.trim(),
        inspection_date: inspectionDate,
        supervisor_name: supervisorName.trim(),
        items: allItems.map((item) => ({
          item_number: item.itemNumber,
          category: item.category,
          description: item.description,
          max_score: item.maxScore,
          actual_score: itemData[item.itemNumber]?.actual_score || 0,
          notes: itemData[item.itemNumber]?.notes || "",
          photo_keys: itemData[item.itemNumber]?.photo_keys || [],
        })),
      };

      const res = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "提交失败");

      router.push(`/result/${result.data.id}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "提交失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 门店信息填写页
  if (currentStep === "info") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
        {/* 顶部品牌栏 */}
        <div className="bg-gradient-to-r from-amber-700 to-amber-600 text-white px-4 py-6 shadow-lg">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-wide">老凤祥</h1>
                <p className="text-amber-100 text-sm mt-1">督导巡店检查系统 (2026版)</p>
              </div>
              <div className="flex gap-2">
                <a
                  href="/history"
                  className="px-3 py-1.5 bg-white/15 rounded-lg text-xs font-medium hover:bg-white/25 transition-colors"
                >
                  历史记录
                </a>
                <a
                  href="/stats"
                  className="px-3 py-1.5 bg-white/15 rounded-lg text-xs font-medium hover:bg-white/25 transition-colors"
                >
                  统计报告
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-6">
          {/* 门店信息卡片 */}
          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
              <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700 text-sm font-bold">1</span>
              门店信息
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  门店名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="请输入门店名称"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  检查日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  督导姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  placeholder="请输入督导姓名"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-gray-800"
                />
              </div>
            </div>
          </div>

          {/* 检查概览 */}
          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700 text-sm font-bold">2</span>
              检查概览
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {inspectionCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-gray-50 rounded-xl p-3 text-center"
                >
                  <div className="text-sm text-gray-600">{cat.name}</div>
                  <div className="text-lg font-bold text-amber-700">
                    {cat.maxScore}
                    <span className="text-xs text-gray-400 font-normal">分</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-amber-50 rounded-xl p-3 text-center">
              <div className="text-sm text-amber-700">总分</div>
              <div className="text-2xl font-bold text-amber-800">100分</div>
            </div>
          </div>

          {/* 开始检查按钮 */}
          <button
            onClick={() => {
              if (!storeName.trim() || !inspectionDate || !supervisorName.trim()) {
                alert("请先填写完整的门店信息");
                return;
              }
              setCurrentStep("form");
            }}
            className="w-full py-4 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-semibold rounded-2xl shadow-lg shadow-amber-200 active:scale-[0.98] transition-transform text-lg"
          >
            开始巡店检查
          </button>
        </div>
      </div>
    );
  }

  // 检查表单页
  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setCurrentStep("info")}
            className="text-amber-700 font-medium text-sm flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
          <h1 className="font-semibold text-gray-800 text-sm">{storeName}</h1>
          <div className="text-sm text-amber-700 font-bold">{totalScore}/100</div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* 实时评分概览 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">当前总分</span>
            <span className="text-2xl font-bold" style={{ color: ratingInfo.color }}>
              {totalScore}
              <span className="text-sm text-gray-400 font-normal">/100</span>
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${totalScore}%`,
                backgroundColor: ratingInfo.color,
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">评级</span>
            <span
              className="text-sm font-semibold px-2 py-0.5 rounded-full"
              style={{
                color: ratingInfo.color,
                backgroundColor: `${ratingInfo.color}15`,
              }}
            >
              {ratingInfo.label}
            </span>
          </div>
        </div>

        {/* 分类检查项 */}
        {inspectionCategories.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            isExpanded={expandedCategory === category.id}
            onToggle={() =>
              setExpandedCategory(
                expandedCategory === category.id ? null : category.id
              )
            }
            itemData={itemData}
            categoryScore={category.items.reduce(
              (sum, item) => sum + (itemData[item.itemNumber]?.actual_score || 0),
              0
            )}
            renderItem={(item) => (
              <div key={item.itemNumber} className="py-4 border-b border-gray-50 last:border-0">
                {/* 检查项描述 */}
                <div className="flex items-start gap-2 mb-3">
                  <span className="shrink-0 w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                    {item.itemNumber}
                  </span>
                  <p className="text-sm text-gray-700 leading-relaxed flex-1">
                    {item.description}
                  </p>
                </div>

                {/* 评分滑块 */}
                <ScoreSlider
                  maxScore={item.maxScore}
                  value={itemData[item.itemNumber]?.actual_score || 0}
                  onChange={(val) => updateItemData(item.itemNumber, "actual_score", val)}
                />

                {/* 问题记录 */}
                <div className="mt-3">
                  <textarea
                    value={itemData[item.itemNumber]?.notes || ""}
                    onChange={(e) =>
                      updateItemData(item.itemNumber, "notes", e.target.value)
                    }
                    placeholder="完成情况及问题记录..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none transition-all"
                  />
                </div>

                {/* 照片上传 */}
                <PhotoUpload
                  itemNumber={item.itemNumber}
                  photoKeys={itemData[item.itemNumber]?.photo_keys || []}
                  onPhotosChange={(keys) =>
                    updateItemData(item.itemNumber, "photo_keys", keys)
                  }
                />
              </div>
            )}
          />
        ))}
      </div>

      {/* 底部提交栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400">当前评分</div>
            <div className="text-xl font-bold" style={{ color: ratingInfo.color }}>
              {totalScore}分 · {ratingInfo.label}
            </div>
          </div>
          <button
            onClick={() => setShowSubmitModal(true)}
            disabled={isSubmitting}
            className="px-8 py-3 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-semibold rounded-xl shadow-lg shadow-amber-200 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {isSubmitting ? "提交中..." : "提交检查"}
          </button>
        </div>
      </div>

      {/* 提交确认弹窗 */}
      {showSubmitModal && (
        <SubmitModal
          totalScore={totalScore}
          ratingInfo={ratingInfo}
          storeName={storeName}
          inspectionDate={inspectionDate}
          supervisorName={supervisorName}
          onCancel={() => setShowSubmitModal(false)}
          onConfirm={() => {
            setShowSubmitModal(false);
            handleSubmit();
          }}
        />
      )}
    </div>
  );
}
