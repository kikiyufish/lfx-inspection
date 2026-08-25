import { NextRequest, NextResponse } from "next/server";
import { S3Storage } from "coze-coding-dev-sdk";

const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: process.env.COZE_BUCKET_ACCESS_KEY || "",
  secretKey: process.env.COZE_BUCKET_SECRET_KEY || "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
});

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
    const fileName = `inspection/item_${itemName || "unknown"}/${timestamp}.${ext}`;

    // 上传到对象存储
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = await storage.uploadFile({
      fileContent: buffer,
      fileName,
      contentType: file.type,
    });

    return NextResponse.json({
      success: true,
      data: { key, fileName },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "上传失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
