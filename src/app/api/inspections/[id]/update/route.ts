import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// PUT: 更新检查记录（仅允许修改一次）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const inspectionId = parseInt(id);
    const body = await request.json();
    const { items, store_name, region, responsible_person, inspection_date, supervisor_name } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "检查项数据无效" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 先查询当前记录
    const { data: currentRecord, error: queryError } = await supabase
      .from("inspections")
      .select("edit_count, supervisor_name")
      .eq("id", inspectionId)
      .single();

    if (queryError || !currentRecord) {
      return NextResponse.json(
        { error: "检查记录不存在" },
        { status: 404 }
      );
    }

    // 检查是否已经修改过
    if (currentRecord.edit_count >= 1) {
      return NextResponse.json(
        { error: "该记录已修改过一次，无法再次修改" },
        { status: 403 }
      );
    }

    // 计算总分
    const totalScore = items.reduce((sum: number, item: { actual_score: number }) => sum + (item.actual_score || 0), 0);

    // 确定评级
    let rating = "较差";
    if (totalScore >= 90) rating = "优秀";
    else if (totalScore >= 70) rating = "良好";

    // 更新主表
    const { error: updateError } = await supabase
      .from("inspections")
      .update({
        store_name,
        region,
        responsible_person,
        inspection_date,
        supervisor_name,
        total_score: totalScore,
        rating,
        edit_count: 1,
        status: "edited",
        updated_at: new Date(),
      })
      .eq("id", inspectionId);

    if (updateError) {
      console.error("Update inspection error:", updateError);
      return NextResponse.json(
        { error: "更新检查记录失败", detail: updateError.message },
        { status: 500 }
      );
    }

    // 删除旧的检查项
    const { error: deleteError } = await supabase
      .from("inspection_items")
      .delete()
      .eq("inspection_id", inspectionId);

    if (deleteError) {
      console.error("Delete old items error:", deleteError);
      return NextResponse.json(
        { error: "删除旧检查项失败", detail: deleteError.message },
        { status: 500 }
      );
    }

    // 插入新的检查项
    const itemsToInsert = items.map((item: {
      item_number: number;
      category: string;
      description: string;
      max_score: number;
      actual_score: number;
      notes?: string;
      rectification?: string;
      photo_keys?: string[];
    }) => ({
      inspection_id: inspectionId,
      item_number: item.item_number,
      category: item.category,
      description: item.description,
      max_score: item.max_score,
      actual_score: item.actual_score,
      notes: item.notes || "",
      rectification: item.rectification || "",
      photo_keys: item.photo_keys || [],
    }));

    if (itemsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("inspection_items")
        .insert(itemsToInsert);

      if (insertError) {
        console.error("Insert items error:", insertError);
        return NextResponse.json(
          { error: "插入检查项失败", detail: insertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: inspectionId,
        total_score: totalScore,
        rating,
      },
    });
  } catch (error) {
    console.error("Update inspection error:", error);
    return NextResponse.json(
      { error: "更新检查记录失败" },
      { status: 500 }
    );
  }
}
