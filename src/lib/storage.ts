import { getSupabaseClient } from "@/storage/database/supabase-client";

const BUCKET_NAME = "inspection-photos";

/**
 * 获取文件的签名URL（通过 Supabase Storage）
 */
export async function getSignedUrl(key: string, expireTime = 86400): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(key, expireTime);

  if (error || !data?.signedUrl) {
    throw new Error(`生成签名URL失败: ${error?.message || "未知错误"}`);
  }
  return data.signedUrl;
}

/**
 * 下载文件内容（通过 Supabase Storage）
 */
export async function downloadFile(key: string): Promise<Buffer> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(key);

  if (error || !data) {
    throw new Error(`下载文件失败: ${error?.message || "未知错误"}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
