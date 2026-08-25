import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

const BUCKET_NAME = "inspection-photos";

// POST - 上传检查照片
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const itemName = formData.get("item_number") as string;

    if (!file) {
      return NextResponse.json({ error: "未选择文件" }, { status: 400 });
    }

    // 验证文件类型
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "不支持的文件格式，仅支持 JPG/PNG/WebP" },
        { status: 400 }
      );
    }

    // 验证文件大小 (最大 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "文件大小不能超过10MB" },
        { status: 400 }
      );
    }

    // 生成文件名
    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `inspection/item_${itemName || "unknown"}/${timestamp}.${ext}`;

    // 上传到 Supabase Storage
    const supabase = getSupabaseClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`上传失败: ${uploadError.message}`);
    }

    return NextResponse.json({
      success: true,
      data: { key: filePath, fileName: filePath },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "上传失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
