import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getSignedUrl } from "@/lib/storage";

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");

    // 获取所有检查记录
    const { data: inspections, error } = await supabase
      .from("inspections")
      .select("*")
      .gte("created_at", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    // 获取所有检查项
    const inspectionIds = (inspections || []).map((i) => i.id);
    let allItems: any[] = [];
    if (inspectionIds.length > 0) {
      const { data: items, error: itemsError } = await supabase
        .from("inspection_items")
        .select("*")
        .in("inspection_id", inspectionIds)
        .order("item_number");

      if (itemsError) throw itemsError;
      allItems = items || [];
    }

    // 为每个检查项获取照片签名URL
    const itemsWithPhotos = await Promise.all(
      allItems.map(async (item) => {
        let photoUrls: string[] = [];
        if (item.photo_keys && item.photo_keys.length > 0) {
          photoUrls = await Promise.all(
            item.photo_keys.map(async (key: string) => {
              try {
                return await getSignedUrl(key);
              } catch {
                return "";
              }
            })
          );
          photoUrls = photoUrls.filter((url) => url);
        }
        return { ...item, photo_urls: photoUrls };
      })
    );

    // 按检查ID分组
    const itemsByInspection = new Map<number, any[]>();
    for (const item of itemsWithPhotos) {
      if (!itemsByInspection.has(item.inspection_id)) {
        itemsByInspection.set(item.inspection_id, []);
      }
      itemsByInspection.get(item.inspection_id)!.push(item);
    }

    // 组合数据
    const fullData = (inspections || []).map((insp) => ({
      ...insp,
      items: itemsByInspection.get(insp.id) || [],
    }));

    return NextResponse.json({ success: true, data: fullData });
  } catch (error) {
    console.error("获取完整数据失败:", error);
    return NextResponse.json(
      { success: false, error: "获取数据失败" },
      { status: 500 }
    );
  }
}
