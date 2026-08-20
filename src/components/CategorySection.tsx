"use client";

import type { ReactNode } from "react";
import type { InspectionCategory } from "@/lib/inspection-data";

interface CategorySectionProps {
  category: InspectionCategory;
  isExpanded: boolean;
  onToggle: () => void;
  itemData: Record<number, { actual_score: number; notes: string; photo_keys: string[] }>;
  categoryScore: number;
  renderItem: (item: InspectionCategory["items"][0]) => ReactNode;
}

export function CategorySection({
  category,
  isExpanded,
  onToggle,
  categoryScore,
  renderItem,
}: CategorySectionProps) {
  const completionRate = Math.round(
    (category.items.filter((item) => {
      const data = category.items.find((i) => i.itemNumber === item.itemNumber);
      return data;
    }).length /
      category.items.length) *
      100
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
      {/* 分类标题 */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
            <span className="text-amber-700 font-bold text-sm">{category.name.charAt(0)}</span>
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-800 text-sm">{category.name}</h3>
            <p className="text-xs text-gray-400">
              {category.items.length}项 · 满分{category.maxScore}分
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-lg font-bold text-amber-700">{categoryScore}</div>
            <div className="text-xs text-gray-400">/{category.maxScore}</div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="px-4 pb-2 border-t border-gray-100">
          {category.items.map((item) => renderItem(item))}
        </div>
      )}
    </div>
  );
}
