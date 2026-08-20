"use client";

interface SubmitModalProps {
  totalScore: number;
  ratingInfo: { label: string; color: string; description: string };
  storeName: string;
  inspectionDate: string;
  supervisorName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SubmitModal({
  totalScore,
  ratingInfo,
  storeName,
  inspectionDate,
  supervisorName,
  onCancel,
  onConfirm,
}: SubmitModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* 弹窗内容 */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-6 pb-8 animate-slide-up">
        {/* 评分展示 */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-3"
            style={{ backgroundColor: `${ratingInfo.color}15` }}
          >
            <span
              className="text-3xl font-bold"
              style={{ color: ratingInfo.color }}
            >
              {totalScore}
            </span>
          </div>
          <div
            className="text-lg font-bold mb-1"
            style={{ color: ratingInfo.color }}
          >
            {ratingInfo.label}
          </div>
          <p className="text-sm text-gray-500">{ratingInfo.description}</p>
        </div>

        {/* 检查信息 */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">门店名称</span>
            <span className="text-gray-800 font-medium">{storeName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">检查日期</span>
            <span className="text-gray-800 font-medium">{inspectionDate}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">督导姓名</span>
            <span className="text-gray-800 font-medium">{supervisorName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">检查评分</span>
            <span className="font-bold" style={{ color: ratingInfo.color }}>
              {totalScore}/100
            </span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            返回修改
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-semibold rounded-xl shadow-lg shadow-amber-200 active:scale-[0.98] transition-transform"
          >
            确认提交
          </button>
        </div>
      </div>
    </div>
  );
}
