"use client";

import { useRef, useState } from "react";

interface PhotoUploadProps {
  itemNumber: number;
  photoKeys: string[];
  onPhotosChange: (keys: string[]) => void;
}

export function PhotoUpload({ itemNumber, photoKeys, onPhotosChange }: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newKeys: string[] = [];
    const newPreviews: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // 生成预览
      const previewUrl = URL.createObjectURL(file);
      newPreviews.push(previewUrl);

      // 上传到服务器
      const formData = new FormData();
      formData.append("file", file);
      formData.append("item_number", String(itemNumber));

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const result = await res.json();
        if (result.success) {
          newKeys.push(result.data.key);
        } else {
          alert(result.error || "上传失败");
        }
      } catch {
        alert("照片上传失败，请重试");
      }
    }

    if (newKeys.length > 0) {
      onPhotosChange([...photoKeys, ...newKeys]);
    }
    setPreviews((prev) => [...prev, ...newPreviews]);
    setUploading(false);

    // 重置input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    const newKeys = photoKeys.filter((_, i) => i !== index);
    onPhotosChange(newKeys);
    setPreviews((prev) => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index]);
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  };

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-xs text-gray-400">现场照片</span>
        {photoKeys.length > 0 && (
          <span className="text-xs text-amber-600 font-medium">{photoKeys.length}张</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {/* 已有照片预览 */}
        {previews.map((preview, index) => (
          <div key={index} className="relative w-16 h-16 rounded-lg overflow-hidden group">
            <img
              src={preview}
              alt={`照片${index + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => removePhoto(index)}
              className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {/* 上传按钮 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-16 h-16 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-0.5 hover:border-amber-400 hover:bg-amber-50 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <svg className="w-5 h-5 text-amber-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10px] text-gray-400">拍照</span>
            </>
          )}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
