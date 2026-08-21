import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export const dynamic = "force-dynamic";

/**
 * GET /api/stats - 获取统计数据
 * 支持查询参数: days (统计天数，默认30)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = new Date().toISOString().split("T")[0];

    const client = getSupabaseClient();

    // 获取指定时间范围内的所有检查记录
    const { data: records, error } = await client
      .from("inspections")
      .select("id, store_name, inspection_date, supervisor_name, total_score, rating, status, created_at")
      .gte("inspection_date", startDateStr)
      .lte("inspection_date", endDateStr)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`查询失败: ${error.message}`);

    const allRecords = records || [];

    // 基础统计
    const totalInspections = allRecords.length;
    const avgScore =
      totalInspections > 0
        ? Math.round(
            allRecords.reduce((sum: number, r: { total_score: number }) => sum + r.total_score, 0) /
              totalInspections
          )
        : 0;

    // 评级分布
    const ratingDistribution = {
      excellent: allRecords.filter((r: { total_score: number }) => r.total_score >= 90).length,
      good: allRecords.filter((r: { total_score: number }) => r.total_score >= 70 && r.total_score < 90).length,
      poor: allRecords.filter((r: { total_score: number }) => r.total_score < 70).length,
    };

    // 按门店统计
    const storeMap = new Map<string, { count: number; totalScore: number }>();
    for (const r of allRecords) {
      const existing = storeMap.get(r.store_name) || { count: 0, totalScore: 0 };
      existing.count++;
      existing.totalScore += r.total_score;
      storeMap.set(r.store_name, existing);
    }
    const storeStats = Array.from(storeMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgScore: Math.round(data.totalScore / data.count),
      }))
      .sort((a, b) => b.avgScore - a.avgScore);

    // 按日期统计（趋势数据）
    const dateMap = new Map<string, { count: number; totalScore: number }>();
    for (const r of allRecords) {
      const date = r.inspection_date;
      const existing = dateMap.get(date) || { count: 0, totalScore: 0 };
      existing.count++;
      existing.totalScore += r.total_score;
      dateMap.set(date, existing);
    }
    const trendData = Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        avgScore: Math.round(data.totalScore / data.count),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 最近检查记录
    const recentRecords = allRecords.slice(0, 20);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalInspections,
          avgScore,
          ratingDistribution,
        },
        storeStats,
        trendData,
        recentRecords,
      },
    });
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json(
      { success: false, error: "获取统计数据失败" },
      { status: 500 }
    );
  }
}
