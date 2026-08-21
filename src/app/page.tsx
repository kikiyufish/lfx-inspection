"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

interface DraftData {
  storeName: string;
  inspectionDate: string;
  supervisorName: string;
  region: string;
  responsiblePerson: string;
  itemData: Record<string, ItemData>;
  currentStep: "info" | "form";
  savedAt: string;
}

interface TodayRecord {
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
  edit_count: number;
}

const DRAFT_KEY = "inspection_draft";

export default function InspectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  
  const [storeName, setStoreName] = useState("");
  const [inspectionDate, setInspectionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [supervisorName, setSupervisorName] = useState("");
  const [region, setRegion] = useState("");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [itemData, setItemData] = useState<Record<number, ItemData>>({});
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    inspectionCategories[0]?.id || null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [currentStep, setCurrentStep] = useState<"info" | "form">("info");
  const [isLoading, setIsLoading] = useState(false);
  const [todayRecords, setTodayRecords] = useState<TodayRecord[]>([]);
  const [loadingToday, setLoadingToday] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [draftInfo, setDraftInfo] = useState<DraftData | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEditMode = !!editId;

  const allItems = getAllItems();

  // Auto-save draft to localStorage (debounced, 2 seconds)
  const saveDraft = useCallback(() => {
    if (isEditMode) return; // Don't save draft in edit mode
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const draft: DraftData = {
        storeName,
        inspectionDate,
        supervisorName,
        region,
        responsiblePerson,
        itemData: Object.fromEntries(
          Object.entries(itemData).map(([k, v]) => [k, { ...v }])
        ),
        currentStep,
        savedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        setHasUnsavedChanges(true);
      } catch {
        // localStorage full or unavailable
      }
    }, 2000);
  }, [storeName, inspectionDate, supervisorName, region, responsiblePerson, itemData, currentStep, isEditMode]);

  // Trigger auto-save when data changes
  useEffect(() => {
    if (!isEditMode && (storeName || supervisorName || Object.keys(itemData).length > 0)) {
      saveDraft();
    }
  }, [storeName, supervisorName, itemData, saveDraft, isEditMode]);

  // Clear draft after successful submission
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      setHasUnsavedChanges(false);
    } catch {
      // ignore
    }
  }, []);

  // Detect draft on mount (don't auto-restore, just mark it available)
  useEffect(() => {
    if (editId) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const draft: DraftData = JSON.parse(saved);
      const draftDate = new Date(draft.savedAt);
      const today = new Date();
      if (draftDate.toDateString() !== today.toDateString()) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      setDraftInfo(draft);
    } catch {
      // ignore parse errors
    }
  }, [editId]);

  // Restore draft when user clicks the recovery button
  const restoreDraft = useCallback(() => {
    if (!draftInfo) return;
    setStoreName(draftInfo.storeName || "");
    setInspectionDate(draftInfo.inspectionDate || new Date().toISOString().split("T")[0]);
    setSupervisorName(draftInfo.supervisorName || "");
    setRegion(draftInfo.region || "");
    setResponsiblePerson(draftInfo.responsiblePerson || "");
    const restoredItemData: Record<number, ItemData> = {};
    for (const [key, value] of Object.entries(draftInfo.itemData || {})) {
      restoredItemData[Number(key)] = value as ItemData;
    }
    setItemData(restoredItemData);
    if (draftInfo.currentStep) setCurrentStep(draftInfo.currentStep);
    setHasUnsavedChanges(true);
    setDraftInfo(null);
  }, [draftInfo]);

  // Discard draft
  const discardDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setDraftInfo(null);
  }, []);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !isSubmitting) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, isSubmitting]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Fetch today's records by supervisor name
  useEffect(() => {
    if (!supervisorName.trim() || supervisorName.length < 1) {
      setTodayRecords([]);
      return;
    }
    const fetchTodayRecords = async () => {
      setLoadingToday(true);
      try {
        const today = new Date().toISOString().split("T")[0];
        const res = await fetch(`/api/inspections?supervisor=${encodeURIComponent(supervisorName)}&date=${today}`);
        const result = await res.json();
        if (result.success) {
          setTodayRecords(result.data || []);
        }
      } catch (err) {
        console.error("加载今日记录失败:", err);
      } finally {
        setLoadingToday(false);
      }
    };
    // Debounce the fetch
    const timer = setTimeout(fetchTodayRecords, 500);
    return () => clearTimeout(timer);
  }, [supervisorName]);

  // Load existing inspection data if editing
  useEffect(() => {
    if (editId) {
      setIsLoading(true);
      fetch(`/api/inspections/${editId}`)
        .then((res) => res.json())
        .then((result) => {
          if (result.success && result.data) {
            const data = result.data;
            setStoreName(data.store_name || "");
            setInspectionDate(data.inspection_date || "");
            setSupervisorName(data.supervisor_name || "");
            setRegion(data.region || "");
            setResponsiblePerson(data.responsible_person || "");
            
            // Load item data
            if (data.items && Array.isArray(data.items)) {
              const newItemData: Record<number, ItemData> = {};
              data.items.forEach((item: { item_number: number; actual_score: number; notes: string; photo_keys: string[] }) => {
                newItemData[item.item_number] = {
                  actual_score: item.actual_score,
                  notes: item.notes || "",
                  photo_keys: item.photo_keys || [],
                };
              });
              setItemData(newItemData);
            }
            setCurrentStep("form");
          }
        })
        .catch((err) => console.error("Failed to load inspection:", err))
        .finally(() => setIsLoading(false));
    }
  }, [editId]);

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
        region: region.trim(),
        responsible_person: responsiblePerson.trim(),
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

      let res;
      if (editId) {
        // Update existing inspection
        res = await fetch(`/api/inspections/${editId}/update`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new inspection
        res = await fetch("/api/inspections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "提交失败");

      clearDraft(); // Clear draft after successful submission
      setHasUnsavedChanges(false);
      router.push(`/result/${editId || result.data.id}`);
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
          {/* 草稿恢复卡片 */}
          {draftInfo && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 mb-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-amber-800">未提交的草稿</span>
                    <span className="text-xs text-amber-500">
                      {new Date(draftInfo.savedAt).getHours().toString().padStart(2, "0")}:
                      {new Date(draftInfo.savedAt).getMinutes().toString().padStart(2, "0")} 保存
                    </span>
                  </div>
                  {draftInfo.storeName && (
                    <p className="text-sm text-amber-700 mb-1">门店：{draftInfo.storeName}</p>
                  )}
                  {draftInfo.supervisorName && (
                    <p className="text-xs text-amber-500 mb-3">督导：{draftInfo.supervisorName}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={restoreDraft}
                      className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 active:scale-[0.98] transition-all"
                    >
                      继续填写
                    </button>
                    <button
                      onClick={discardDraft}
                      className="px-4 py-2 bg-white text-amber-600 text-sm font-medium rounded-lg border border-amber-200 hover:bg-amber-50 active:scale-[0.98] transition-all"
                    >
                      放弃草稿
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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

              {/* 今日检查记录 */}
              {supervisorName.trim() && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-blue-800">我的今日检查</span>
                    {loadingToday && (
                      <svg className="w-3 h-3 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                  </div>
                  {!loadingToday && todayRecords.length === 0 && (
                    <p className="text-xs text-blue-500">今天暂无检查记录，开始新的检查吧</p>
                  )}
                  {!loadingToday && todayRecords.length > 0 && (
                    <div className="space-y-2">
                      {todayRecords.map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-blue-100"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">{record.store_name}</div>
                            <div className="text-xs text-gray-400">
                              {record.region && <span>{record.region} · </span>}
                              <span>{record.total_score}分 · {record.rating}</span>
                            </div>
                          </div>
                          <div className="flex gap-1.5 ml-2">
                            <button
                              onClick={() => router.push(`/result/${record.id}`)}
                              className="px-2.5 py-1 text-xs text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                            >
                              查看
                            </button>
                            {record.edit_count === 0 && (
                              <button
                                onClick={() => router.push(`/?edit=${record.id}`)}
                                className="px-2.5 py-1 text-xs text-amber-600 bg-amber-50 rounded-md hover:bg-amber-100 transition-colors"
                              >
                                修改
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  区域
                </label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="请输入所属区域（如：青浦、徐汇等）"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  负责人
                </label>
                <input
                  type="text"
                  value={responsiblePerson}
                  onChange={(e) => setResponsiblePerson(e.target.value)}
                  placeholder="请输入门店负责人姓名"
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
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && !isEditMode && (
              <span className="text-[10px] text-green-500 flex items-center gap-0.5">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                已保存
              </span>
            )}
            <span className="text-sm text-amber-700 font-bold">{totalScore}/100</span>
          </div>
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
