import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// POST - 创建新的巡店检查记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { store_name, inspection_date, supervisor_name, items } = body;

    if (!store_name || !inspection_date || !supervisor_name) {
      return NextResponse.json(
        { error: "缺少必填字段" },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 计算总分
    const totalScore = items.reduce(
      (sum: number, item: { actual_score: number }) => sum + (item.actual_score || 0),
      0
    );

    // 确定评级
    let rating = "较差";
    if (totalScore >= 90) rating = "优秀";
    else if (totalScore >= 70) rating = "良好";

    // 插入检查主记录
    const { data: inspection, error: inspectionError } = await client
      .from("inspections")
      .insert({
        store_name,
        inspection_date,
        supervisor_name,
        total_score: totalScore,
        max_score: 100,
        rating,
        status: "submitted",
      })
      .select()
      .single();

    if (inspectionError) throw new Error(`插入检查记录失败: ${inspectionError.message}`);

    // 批量插入检查项目
    const itemsData = items.map((item: {
      item_number: number;
      category: string;
      description: string;
      max_score: number;
      actual_score: number;
      notes?: string;
      photo_keys?: string[];
    }) => ({
      inspection_id: inspection.id,
      item_number: item.item_number,
      category: item.category,
      description: item.description,
      max_score: item.max_score,
      actual_score: item.actual_score || 0,
      notes: item.notes || null,
      photo_keys: item.photo_keys || null,
    }));

    const { error: itemsError } = await client
      .from("inspection_items")
      .insert(itemsData);

    if (itemsError) throw new Error(`插入检查项目失败: ${itemsError.message}`);

    return NextResponse.json({
      success: true,
      data: { id: inspection.id, total_score: totalScore, rating },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "服务器错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - 获取检查记录列表
export async function GET() {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("inspections")
      .select("id, store_name, inspection_date, supervisor_name, total_score, rating, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(`查询失败: ${error.message}`);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "服务器错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
