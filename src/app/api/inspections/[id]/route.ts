import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// GET - 获取单个检查记录详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getSupabaseClient();

    // 查询检查主记录
    const { data: inspection, error: inspectionError } = await client
      .from("inspections")
      .select("id, store_name, region, responsible_person, inspection_date, supervisor_name, total_score, max_score, rating, status, edit_count, created_at")
      .eq("id", parseInt(id))
      .single();

    if (inspectionError) throw new Error(`查询检查记录失败: ${inspectionError.message}`);
    if (!inspection) {
      return NextResponse.json({ error: "检查记录不存在" }, { status: 404 });
    }

    // 查询检查项目
    const { data: items, error: itemsError } = await client
      .from("inspection_items")
      .select("id, item_number, category, description, max_score, actual_score, notes, photo_keys")
      .eq("inspection_id", parseInt(id))
      .order("item_number", { ascending: true });

    if (itemsError) throw new Error(`查询检查项目失败: ${itemsError.message}`);

    // 为照片生成签名URL
    const itemsWithUrls = await Promise.all(
      (items || []).map(async (item) => {
        let photo_urls: string[] = [];
        if (item.photo_keys && Array.isArray(item.photo_keys)) {
          photo_urls = await Promise.all(
            (item.photo_keys as string[]).map(async (key) => {
              try {
                return await client.storage
                  .from("inspection-photos")
                  .createSignedUrl(key, 86400)
                  .then((res) => res.data?.signedUrl || "");
              } catch {
                return "";
              }
            })
          );
          photo_urls = photo_urls.filter((url) => url);
        }
        return { ...item, photo_urls };
      })
    );

    return NextResponse.json({
      success: true,
      data: { ...inspection, items: itemsWithUrls },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "服务器错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
