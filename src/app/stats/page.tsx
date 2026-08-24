"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface InspectionItem {
  item_number: number;
  category: string;
  description: string;
  max_score: number;
  actual_score: number;
  notes: string;
  photo_keys: string[];
  photo_urls: string[];
}

interface FullInspection {
  id: number;
  store_name: string;
  region?: string;
  responsible_person?: string;
  inspection_date: string;
  supervisor_name: string;
  total_score: number;
  rating: string;
  created_at: string;
  items: InspectionItem[];
}

interface StatsData {
  summary: {
    totalInspections: number;
    avgScore: number;
    ratingDistribution: {
      excellent: number;
      good: number;
      poor: number;
    };
  };
  storeStats: {
    region: string;
    name: string;
    count: number;
    avgScore: number;
    scores: number[];
  }[];
  trendData: {
    date: string;
    count: number;
    avgScore: number;
  }[];
  recentRecords: {
    id: number;
    store_name: string;
    inspection_date: string;
    supervisor_name: string;
    total_score: number;
    rating: string;
    created_at: string;
  }[];
}

export default function StatsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [fullData, setFullData] = useState<FullInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [exporting, setExporting] = useState(false);
  const [exportingPhotos, setExportingPhotos] = useState(false);
  const [exportingSummary, setExportingSummary] = useState(false);
  const [exportingComprehensive, setExportingComprehensive] = useState(false);
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const [showStoreSelector, setShowStoreSelector] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [statsRes, fullRes] = await Promise.all([
          fetch(`/api/stats?days=${days}`),
          fetch(`/api/inspections/full?days=${days}`),
        ]);
        const statsResult = await statsRes.json();
        const fullResult = await fullRes.json();
        if (statsResult.success) {
          setData(statsResult.data);
        }
        if (fullResult.success) {
          setFullData(fullResult.data);
        }
      } catch (err) {
        console.error("加载统计数据失败:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [days]);

  // 获取筛选后的数据
  const getFilteredData = () => {
    if (selectedStores.size === 0) return fullData;
    return fullData.filter(d => selectedStores.has(d.store_name));
  };

  // 导出Excel（含照片）
  const exportToExcel = async () => {
    const dataToExport = getFilteredData();
    if (exporting || dataToExport.length === 0) return;
    setExporting(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "老凤祥督导巡店系统";
      workbook.created = new Date();

      // Sheet 1: 检查项明细（含照片）
      const detailSheet = workbook.addWorksheet("检查项明细", {
        views: [{ state: "frozen", ySplit: 2 }],
      });

      // 设置列宽 - 匹配模板格式（13列）
      detailSheet.columns = [
        { header: "区域", key: "region", width: 10 },
        { header: "门店名称", key: "store", width: 18 },
        { header: "负责人", key: "responsible", width: 10 },
        { header: "检查日期", key: "date", width: 12 },
        { header: "督导", key: "supervisor", width: 10 },
        { header: "检查项目", key: "category", width: 14 },
        { header: "序号", key: "num", width: 6 },
        { header: "检查标准", key: "desc", width: 45 },
        { header: "满分", key: "max", width: 6 },
        { header: "得分", key: "score", width: 6 },
        { header: "现场照片", key: "photos", width: 25 },
        { header: "扣分", key: "deduction", width: 6 },
        { header: "备注", key: "notes", width: 30 },
      ];

      // 标题行样式
      const titleRow = detailSheet.addRow(["老凤祥督导巡店检查报告"]);
      titleRow.font = { size: 16, bold: true, color: { argb: "FFB45515" } };
      titleRow.alignment = { horizontal: "center" };
      detailSheet.mergeCells(1, 1, 1, 13);

      const subtitleRow = detailSheet.addRow([
        `统计周期: 近${days}天 | 导出时间: ${new Date().toLocaleString("zh-CN")}`,
      ]);
      subtitleRow.font = { size: 10, color: { argb: "FF666666" } };
      subtitleRow.alignment = { horizontal: "center" };
      detailSheet.mergeCells(2, 1, 2, 13);

      // 表头行 - 匹配模板格式
      const headerRow = detailSheet.addRow([
        "区域", "门店名称", "负责人", "检查日期", "督导", "检查项目", "序号",
        "检查标准", "满分", "得分", "现场照片", "扣分", "备注",
      ]);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFB45515" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // 添加数据行
      for (const inspection of dataToExport) {
        for (const item of inspection.items) {
          const deduction = item.max_score - item.actual_score;
          // 扣分项自动生成问题记录
          const autoNotes = deduction > 0 && !item.notes
            ? `扣${deduction}分，需整改`
            : item.notes || "";
          const row = detailSheet.addRow({
            region: inspection.region || "",
            store: inspection.store_name,
            responsible: inspection.responsible_person || "",
            date: inspection.inspection_date,
            supervisor: inspection.supervisor_name,
            category: item.category,
            num: item.item_number,
            desc: item.description,
            max: item.max_score,
            score: item.actual_score,
            deduction: deduction > 0 ? deduction : "",
            notes: autoNotes,
            photos: item.photo_urls.length > 0 ? `[${item.photo_urls.length}张照片]` : "",
          });

          // 得分颜色
          const scoreCell = row.getCell("score");
          const ratio = item.actual_score / item.max_score;
          if (ratio >= 0.8) {
            scoreCell.font = { color: { argb: "FF16A34A" }, bold: true };
          } else if (ratio >= 0.5) {
            scoreCell.font = { color: { argb: "FFCA8A04" }, bold: true };
          } else {
            scoreCell.font = { color: { argb: "FFDC2626" }, bold: true };
          }

          // 扣分列红色高亮
          if (deduction > 0) {
            const deductionCell = row.getCell("deduction");
            deductionCell.font = { color: { argb: "FFDC2626" }, bold: true };
            // 扣分行背景浅红
            row.eachCell((cell) => {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFFEF2F2" },
              };
            });
          }

          // 边框
          row.eachCell((cell) => {
            cell.border = {
              top: { style: "thin", color: { argb: "FFE5E7EB" } },
              bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
              left: { style: "thin", color: { argb: "FFE5E7EB" } },
              right: { style: "thin", color: { argb: "FFE5E7EB" } },
            };
            cell.alignment = { vertical: "middle", wrapText: true };
          });

          // 如果有照片，尝试嵌入
          if (item.photo_urls.length > 0) {
            const photoCell = row.getCell("photos");
            photoCell.value = ""; // 清空文本
            row.height = 80; // 设置行高以容纳照片

            // 嵌入第一张照片 - 使用base64方式，更兼容WPS
            try {
              const photoUrl = item.photo_urls[0];
              const response = await fetch(photoUrl);
              const blob = await response.blob();
              
              // 转换为base64
              const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const result = reader.result as string;
                  // 移除data:image/xxx;base64,前缀
                  const base64Data = result.split(",")[1] || result;
                  resolve(base64Data);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
              
              const imageId = workbook.addImage({
                base64: base64,
                extension: "jpeg",
              });
              detailSheet.addImage(imageId, {
                tl: { col: 10.1, row: row.number - 1.9 },
                ext: { width: 100, height: 75 },
              });
            } catch (e) {
              console.warn("嵌入照片失败:", e);
              photoCell.value = `[${item.photo_urls.length}张照片]`;
            }
          }
        }
      }

      // Sheet 2: 汇总统计
      const summarySheet = workbook.addWorksheet("汇总统计");
      summarySheet.columns = [
        { header: "项目", key: "item", width: 20 },
        { header: "数值", key: "value", width: 15 },
      ];

      const total = data!.summary.ratingDistribution.excellent + data!.summary.ratingDistribution.good + data!.summary.ratingDistribution.poor;
      const summaryData = [
        ["老凤祥督导巡店统计报告", ""],
        [`统计周期: 近${days}天`, ""],
        ["", ""],
        ["检查次数", data!.summary.totalInspections],
        ["平均得分", data!.summary.avgScore],
        ["优秀次数", data!.summary.ratingDistribution.excellent],
        ["良好次数", data!.summary.ratingDistribution.good],
        ["较差次数", data!.summary.ratingDistribution.poor],
        ["优秀率", total > 0 ? `${Math.round((data!.summary.ratingDistribution.excellent / total) * 100)}%` : "0%"],
        ["", ""],
        ["门店排名", ""],
        ["排名", "门店 / 次数 / 平均分"],
      ];

      for (const [item, value] of summaryData) {
        const row = summarySheet.addRow({ item, value });
        if (item === "老凤祥督导巡店统计报告") {
          row.font = { size: 14, bold: true };
        }
      }

      data!.storeStats.forEach((s, i) => {
        summarySheet.addRow({
          item: `${i + 1}`,
          value: `${s.region || ""} ${s.name} / ${s.count}次 / ${s.avgScore}分`,
        });
      });

      // Sheet 3: 问题汇总（矩阵格式，参照模板）
      const problemSheet = workbook.addWorksheet("问题汇总", {
        views: [{ state: "frozen", ySplit: 4, xSplit: 4 }],
      });

      // 定义分类和检查项
      const categories = [
        { name: "一、基础管理（20分）", items: [1, 2, 3, 4, 5] },
        { name: "二、环境与设施（10分）", items: [6, 7, 8, 9] },
        { name: "三、货品管理（30分）", items: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
        { name: "四、安全管理（20分）", items: [21, 22, 23, 24, 25, 26] },
        { name: "五、财务管理（10分）", items: [27, 28, 29, 30] },
        { name: "六、服务与售后（10分）", items: [31, 32, 33, 34, 35] },
      ];

      // 从第一个检查记录获取检查项描述
      const itemDescriptions: Record<number, string> = {};
      const itemMaxScores: Record<number, number> = {};
      if (fullData.length > 0) {
        for (const item of fullData[0].items) {
          itemDescriptions[item.item_number] = item.description;
          itemMaxScores[item.item_number] = item.max_score;
        }
      }

      // Row 1: 分类标题行
      const catRowValues: (string | number)[] = ["", "", "", "", ""];
      for (const cat of categories) {
        for (let i = 0; i < cat.items.length; i++) {
          catRowValues.push("");
        }
      }
      const catRow = problemSheet.addRow(catRowValues);
      // 合并分类标题
      let colOffset = 5;
      for (const cat of categories) {
        const colEnd = colOffset + cat.items.length - 1;
        problemSheet.mergeCells(1, colOffset, 1, colEnd);
        const cell = problemSheet.getCell(1, colOffset);
        cell.value = cat.name;
        cell.font = { bold: true, size: 11, color: { argb: "FF1F2937" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
        colOffset = colEnd + 1;
      }

      // Row 2: 编号行
      const numRowValues: (string | number)[] = ["", "", "", "", ""];
      for (let i = 1; i <= 35; i++) {
        numRowValues.push(i);
      }
      const numRow = problemSheet.addRow(numRowValues);
      for (let col = 5; col <= 39; col++) {
        const cell = problemSheet.getCell(2, col);
        cell.font = { bold: true, size: 9, color: { argb: "FF6B7280" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
      }

      // Row 3: 检查项内容行
      const descRowValues: (string | number)[] = ["", "", "", "", ""];
      for (let i = 1; i <= 35; i++) {
        const desc = itemDescriptions[i] || "";
        const maxScore = itemMaxScores[i] || 0;
        descRowValues.push(`${desc}（${maxScore}分）`);
      }
      const descRow = problemSheet.addRow(descRowValues);
      for (let col = 5; col <= 39; col++) {
        const cell = problemSheet.getCell(3, col);
        cell.font = { size: 8, color: { argb: "FF6B7280" } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
      }

      // Row 4: 表头行
      const probHeaderValues: (string | number)[] = ["区域", "店铺名", "负责人", "日期", "得分"];
      for (let i = 1; i <= 35; i++) {
        probHeaderValues.push("");
      }
      const probHeaderRow = problemSheet.addRow(probHeaderValues);
      for (let col = 1; col <= 4; col++) {
        const cell = probHeaderRow.getCell(col);
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB91C1C" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin", color: { argb: "FF991B1B" } },
          bottom: { style: "thin", color: { argb: "FF991B1B" } },
          left: { style: "thin", color: { argb: "FF991B1B" } },
          right: { style: "thin", color: { argb: "FF991B1B" } },
        };
      }

      // 设置列宽
      problemSheet.getColumn(1).width = 18;
      problemSheet.getColumn(2).width = 10;
      problemSheet.getColumn(3).width = 12;
      problemSheet.getColumn(4).width = 8;
      for (let col = 5; col <= 39; col++) {
        problemSheet.getColumn(col).width = 22;
      }

      // 数据行：每个门店一行
      for (const inspection of dataToExport) {
        const rowData: (string | number)[] = [
          inspection.region || "",
          inspection.store_name,
          inspection.responsible_person || "",
          inspection.supervisor_name,
          inspection.inspection_date,
          inspection.total_score,
        ];

        // 填充35个检查项的问题描述
        for (let itemNum = 1; itemNum <= 35; itemNum++) {
          const item = inspection.items.find(i => i.item_number === itemNum);
          if (item) {
            const deduction = item.max_score - item.actual_score;
            const hasNotes = item.notes && item.notes.trim().length > 0;
            if (deduction > 0 || hasNotes) {
              // 有扣分或有备注的项，显示问题描述
              let cellText = "";
              if (deduction > 0 && hasNotes) {
                cellText = `${item.notes}-${deduction}`;
              } else if (deduction > 0) {
                cellText = `扣${deduction}分`;
              } else {
                // 满分但有备注
                cellText = item.notes || "";
              }
              rowData.push(cellText);
            } else {
              rowData.push("");
            }
          } else {
            rowData.push("");
          }
        }

        const row = problemSheet.addRow(rowData);
        // 设置样式
        for (let col = 1; col <= 4; col++) {
          const cell = row.getCell(col);
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE5E7EB" } },
            bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
            left: { style: "thin", color: { argb: "FFE5E7EB" } },
            right: { style: "thin", color: { argb: "FFE5E7EB" } },
          };
        }
        // 得分列红色高亮（如果低于100）
        if (inspection.total_score < 100) {
          row.getCell(4).font = { color: { argb: "FFDC2626" }, bold: true };
        }
        // 问题项红色字体
        for (let col = 5; col <= 39; col++) {
          const cell = row.getCell(col);
          cell.alignment = { vertical: "middle", wrapText: true };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE5E7EB" } },
            bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
            left: { style: "thin", color: { argb: "FFE5E7EB" } },
            right: { style: "thin", color: { argb: "FFE5E7EB" } },
          };
          if (cell.value && String(cell.value).trim()) {
            cell.font = { color: { argb: "FFDC2626" }, size: 9 };
          }
        }
      }

      // 生成文件并下载
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `巡店检查报告_${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("导出Excel失败:", error);
      alert("导出失败，请查看控制台错误信息");
    } finally {
      setExporting(false);
    }
  };

  // 导出综合统计报表（按模板格式）
  const exportComprehensiveReport = async () => {
    if (exportingComprehensive) return;
    setExportingComprehensive(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "老凤祥督导巡店系统";
      workbook.created = new Date();

      // 获取完整数据
      const params = new URLSearchParams({ days: String(days) });
      const res = await fetch(`/api/inspections/full?${params}`);
      const result = await res.json();
      const allInspections = result.data || [];
      
      // 按选中门店筛选
      const inspections = selectedStores.size > 0 
        ? allInspections.filter((i: any) => selectedStores.has(i.store_name))
        : allInspections;

      // ===== Sheet 1: 督导评分汇总 =====
      const summarySheet = workbook.addWorksheet("督导评分汇总", {
        views: [{ state: "frozen", ySplit: 4, xSplit: 3 }],
      });

      // 标题行
      const titleRow = summarySheet.addRow(["老凤祥上海地区督导评分汇总表（2026版）"]);
      summarySheet.mergeCells(1, 1, 1, 42);
      titleRow.height = 30;
      titleRow.eachCell((cell) => {
        cell.font = { size: 16, bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD4AF37" } };
      });

      // 分类标题行
      const categoryHeaders = [
        "", "", "", "", "", "", "", "",
        "一、基础管理（20分）", "", "", "", "",
        "二、环境与设施（10分）", "", "", "",
        "三、货品管理（30分）", "", "", "", "", "", "", "", "", "", "", "",
        "四、安全管理（20分）", "", "", "", "", "",
        "五、财务管理（10分）", "", "", "",
        "六、服务与售后（10分）", "", "", "", "",
      ];
      const catRow = summarySheet.addRow(categoryHeaders);
      catRow.height = 25;
      catRow.eachCell((cell, colNumber) => {
        cell.font = { bold: true, size: 10 };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5F5" } };
        cell.border = {
          top: { style: "thin" }, bottom: { style: "thin" },
          left: { style: "thin" }, right: { style: "thin" },
        };
      });

      // 编号行
      const numHeaders = ["位置", "编号", "店铺名", "区域", "区域经理", "督导", "日期", "总分"];
      for (let i = 1; i <= 35; i++) numHeaders.push(String(i));
      const numRow = summarySheet.addRow(numHeaders);
      numRow.height = 20;
      numRow.eachCell((cell) => {
        cell.font = { bold: true, size: 9 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8E8E8" } };
        cell.border = {
          top: { style: "thin" }, bottom: { style: "thin" },
          left: { style: "thin" }, right: { style: "thin" },
        };
      });

      // 检查项描述行
      const descHeaders = ["", "", "", "", "", "", "", ""];
      const descriptions = [
        "员工仪表仪容规范，佩戴统一工号牌，精神面貌良好，健康证有效（5分）",
        "一人一客一物，微笑招呼，规范使用托盘手套放大镜（5分）",
        "每月职工安全生产记录卡按时填写（3分）",
        "营业准备到位，柜台整洁无私人物品（2分）",
        "各类培训、新品推广及工作按要求完成（5分）",
        "店铺环境整洁，无杂物无卫生死角（2分）",
        "售货环境清洁明亮通风，温度16-26℃（2分）",
        "电子天平校准正常，水平仪气泡居中（3分）",
        "服务公约、当日金价、维修价目表上墙公示（3分）",
        "产品标签按规定串绳，陈列整齐美观（2分）",
        "商品印记、吊牌、证书与产品相符（3分）",
        "商品使用专用道具，防护措施到位（2分）",
        "库存记录本规范填写，早晚签名交接双签（4分）",
        "商品抽查任务表按时填写，双人双签（3分）",
        "进出库记录、进销存/收付存月报表完整（4分）",
        "截料旧金登记规范，添金调换流程规范（4分）",
        "所有销售折扣优惠需公示（2分）",
        "黄金类赠品做好表格登记（2分）",
        "商品检验报告齐全，吊牌有成色记录（2分）",
        "无不合格商品上柜（2分）",
        "灭火器正常有效，每月检查签字（3分）",
        "消防器材无杂物，员工知晓四防应急（3分）",
        "保险柜开库关闭后及时锁好打乱密码（5分）",
        "商品存放专用保险柜，双人双锁管理（5分）",
        "红外线报警系统正常并与110联网（2分）",
        "监控正常运行，录像保留不少于30日（2分）",
        "每日按时解款（下限1000元），上交凭证（2分）",
        "无坐支现金、私设小金库（3分）",
        "销售凭证规范，加盖印记已复秤章，双签（3分）",
        "每日销售与资金数据核对一致（2分）",
        "营业日记规范填写，交接班内容清晰（2分）",
        "企业微信内任务及时完成（2分）",
        "修理售后登记完整，售后服务处理表上传（2分）",
        "顾客财产识别验证保护到位（2分）",
        "顾客意见簿放置到位，投诉处理闭环（2分）",
      ];
      for (const desc of descriptions) descHeaders.push(desc);
      const descRow = summarySheet.addRow(descHeaders);
      descRow.height = 60;
      descRow.eachCell((cell, colNumber) => {
        if (colNumber > 8) {
          cell.font = { size: 8 };
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5F5" } };
        cell.border = {
          top: { style: "thin" }, bottom: { style: "thin" },
          left: { style: "thin" }, right: { style: "thin" },
        };
      });

      // 表头行
      const headerValues = ["位置/交通", "序号", "门店名称", "区域", "区域经理", "督导", "检查日期", "总分", ...Array(35).fill("问题记录/扣分")];
      const dataHeaderRow = summarySheet.addRow(headerValues);
      dataHeaderRow.getCell(1).value = "位置/交通";
      dataHeaderRow.getCell(2).value = "序号";
      dataHeaderRow.getCell(3).value = "门店名称";
      dataHeaderRow.getCell(4).value = "区域";
      dataHeaderRow.getCell(5).value = "区域经理";
      dataHeaderRow.getCell(6).value = "督导";
      dataHeaderRow.getCell(7).value = "检查日期";
      dataHeaderRow.getCell(8).value = "总分";
      for (let i = 9; i <= 43; i++) dataHeaderRow.getCell(i).value = "问题记录/扣分";
      dataHeaderRow.height = 20;
      dataHeaderRow.eachCell((cell) => {
        cell.font = { bold: true, size: 9 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD4AF37" } };
        cell.border = {
          top: { style: "thin" }, bottom: { style: "thin" },
          left: { style: "thin" }, right: { style: "thin" },
        };
      });

      // 数据行
      inspections.forEach((inspection: any, index: number) => {
        const itemMap = new Map<number, any>();
        for (const item of inspection.items) {
          itemMap.set(item.item_number, item);
        }

        const rowData: (string | number)[] = [
          "",
          index + 1,
          inspection.store_name,
          inspection.region || "",
          "", // 区域经理
          inspection.supervisor_name,
          inspection.inspection_date,
          inspection.total_score,
        ];

        // 添加35个检查项的问题记录
        for (let i = 1; i <= 35; i++) {
          const item = itemMap.get(i);
          if (item && item.actual_score < item.max_score) {
            const deduction = item.max_score - item.actual_score;
            const note = item.notes || `扣${deduction}分`;
            rowData.push(`${note}-${deduction}`);
          } else {
            rowData.push("");
          }
        }

        const row = summarySheet.addRow(rowData);
        row.eachCell((cell, colNumber) => {
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.border = {
            top: { style: "thin" }, bottom: { style: "thin" },
            left: { style: "thin" }, right: { style: "thin" },
          };
          // 高亮扣分项
          if (colNumber > 8 && cell.value && String(cell.value).includes("-")) {
            cell.font = { color: { argb: "FFCC0000" } };
          }
        });
      });

      // 设置列宽
      summarySheet.getColumn(1).width = 12;
      summarySheet.getColumn(2).width = 6;
      summarySheet.getColumn(3).width = 20;
      summarySheet.getColumn(4).width = 12;
      summarySheet.getColumn(5).width = 10;
      summarySheet.getColumn(6).width = 10;
      summarySheet.getColumn(7).width = 12;
      summarySheet.getColumn(8).width = 8;
      for (let i = 9; i <= 43; i++) {
        summarySheet.getColumn(i).width = 15;
      }

      // ===== Sheet 2: 统计分析 =====
      const statsSheet = workbook.addWorksheet("统计分析");

      // 标题
      const statsTitle = statsSheet.addRow(["督导评分统计分析"]);
      statsSheet.mergeCells(1, 1, 1, 7);
      statsTitle.height = 30;
      statsTitle.eachCell((cell) => {
        cell.font = { size: 16, bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD4AF37" } };
      });

      statsSheet.addRow([]);

      // 一、总体统计
      const totalInspections = inspections.length;
      const avgScore = totalInspections > 0
        ? Math.round(inspections.reduce((sum: number, i: any) => sum + i.total_score, 0) / totalInspections * 10) / 10
        : 0;
      const maxScore = totalInspections > 0 ? Math.max(...inspections.map((i: any) => i.total_score)) : 0;
      const minScore = totalInspections > 0 ? Math.min(...inspections.map((i: any) => i.total_score)) : 0;
      const excellentCount = inspections.filter((i: any) => i.total_score >= 90).length;
      const goodCount = inspections.filter((i: any) => i.total_score >= 70 && i.total_score < 90).length;
      const poorCount = inspections.filter((i: any) => i.total_score < 70).length;

      const section1Title = statsSheet.addRow(["一、总体统计"]);
      section1Title.font = { bold: true, size: 12 };
      statsSheet.addRow(["已检查门店数", totalInspections]);
      statsSheet.addRow(["平均分", avgScore || "—"]);
      statsSheet.addRow(["最高分", maxScore]);
      statsSheet.addRow(["最低分", minScore]);
      statsSheet.addRow(["优秀数(≥90)", excellentCount]);
      statsSheet.addRow(["良好数(70-89)", goodCount]);
      statsSheet.addRow(["较差数(<70)", poorCount]);
      statsSheet.addRow([]);

      // 二、各区域评分统计
      const section2Title = statsSheet.addRow(["二、各区域评分统计"]);
      section2Title.font = { bold: true, size: 12 };
      const regionHeader = statsSheet.addRow(["区域", "门店总数", "已检查", "平均分", "最高分", "最低分", "优秀率"]);
      regionHeader.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8E8E8" } };
        cell.border = {
          top: { style: "thin" }, bottom: { style: "thin" },
          left: { style: "thin" }, right: { style: "thin" },
        };
      });

      // 按区域统计
      const regionMap = new Map<string, { total: number; checked: number; scores: number[] }>();
      for (const inspection of inspections) {
        const region = inspection.region || "未分类";
        if (!regionMap.has(region)) {
          regionMap.set(region, { total: 0, checked: 0, scores: [] });
        }
        const r = regionMap.get(region)!;
        r.checked++;
        r.scores.push(inspection.total_score);
      }

      for (const [region, data] of regionMap) {
        const avg = data.scores.length > 0 ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length * 10) / 10 : "—";
        const max = data.scores.length > 0 ? Math.max(...data.scores) : 0;
        const min = data.scores.length > 0 ? Math.min(...data.scores) : 0;
        const excellent = data.scores.filter(s => s >= 90).length;
        const excellentRate = data.scores.length > 0 ? `${Math.round(excellent / data.scores.length * 100)}%` : "—";
        const row = statsSheet.addRow([region, data.total, data.checked, avg, max, min, excellentRate]);
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" }, bottom: { style: "thin" },
            left: { style: "thin" }, right: { style: "thin" },
          };
        });
      }

      statsSheet.addRow([]);

      // 三、高频问题项统计
      const section3Title = statsSheet.addRow(["三、高频问题项统计（各项被记录问题的门店数）"]);
      section3Title.font = { bold: true, size: 12 };
      const itemHeader = statsSheet.addRow(["序号", "检查项（简称）", "满分", "问题门店数", "问题率"]);
      itemHeader.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8E8E8" } };
        cell.border = {
          top: { style: "thin" }, bottom: { style: "thin" },
          left: { style: "thin" }, right: { style: "thin" },
        };
      });

      // 统计每个检查项的问题数
      const itemProblemCount = new Map<number, number>();
      for (let i = 1; i <= 35; i++) itemProblemCount.set(i, 0);
      for (const inspection of inspections) {
        for (const item of inspection.items) {
          if (item.actual_score < item.max_score || (item.notes && item.notes.trim())) {
            itemProblemCount.set(item.item_number, (itemProblemCount.get(item.item_number) || 0) + 1);
          }
        }
      }

      const itemDescriptions = [
        "员工仪表仪容规范，佩戴统一工号牌，精神面貌…",
        "一人一客一物，微笑招呼，规范使用托盘手套放…",
        "每月职工安全生产记录卡按时填写",
        "营业准备到位，柜台整洁无私人物品",
        "各类培训、新品推广及工作按要求完成",
        "店铺环境整洁，无杂物无卫生死角",
        "售货环境清洁明亮通风，温度16-26℃",
        "电子天平校准正常，水平仪气泡居中",
        "服务公约、当日金价、维修价目表上墙公示",
        "产品标签按规定串绳，陈列整齐美观",
        "商品印记、吊牌、证书与产品相符",
        "商品使用专用道具，防护措施到位",
        "库存记录本规范填写，早晚签名交接双签",
        "商品抽查任务表按时填写，双人双签",
        "进出库记录、进销存/收付存月报表完整",
        "截料旧金登记规范，添金调换流程规范",
        "所有销售折扣优惠需公示",
        "黄金类赠品做好表格登记",
        "商品检验报告齐全，吊牌有成色记录",
        "无不合格商品上柜",
        "灭火器正常有效，每月检查签字",
        "消防器材无杂物，员工知晓四防应急",
        "保险柜开库关闭后及时锁好打乱密码",
        "商品存放专用保险柜，双人双锁管理",
        "红外线报警系统正常并与110联网",
        "监控正常运行，录像保留不少于30日",
        "每日按时解款（下限1000元），上交凭证",
        "无坐支现金、私设小金库",
        "销售凭证规范，加盖印记已复秤章，双签",
        "每日销售与资金数据核对一致",
        "营业日记规范填写，交接班内容清晰",
        "企业微信内任务及时完成",
        "修理售后登记完整，售后服务处理表上传",
        "顾客财产识别验证保护到位",
        "顾客意见簿放置到位，投诉处理闭环",
      ];
      const maxScores = [5, 5, 3, 2, 5, 2, 2, 3, 3, 2, 3, 2, 4, 3, 4, 4, 2, 2, 2, 2, 3, 3, 5, 5, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2];

      for (let i = 0; i < 35; i++) {
        const count = itemProblemCount.get(i + 1) || 0;
        const rate = totalInspections > 0 ? `${Math.round(count / totalInspections * 100)}%` : "—";
        const row = statsSheet.addRow([i + 1, itemDescriptions[i], maxScores[i], count, rate]);
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" }, bottom: { style: "thin" },
            left: { style: "thin" }, right: { style: "thin" },
          };
        });
      }

      // 设置列宽
      statsSheet.getColumn(1).width = 20;
      statsSheet.getColumn(2).width = 40;
      statsSheet.getColumn(3).width = 10;
      statsSheet.getColumn(4).width = 12;
      statsSheet.getColumn(5).width = 10;
      statsSheet.getColumn(6).width = 10;
      statsSheet.getColumn(7).width = 10;

      // 生成文件
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `老凤祥督导评分汇总表_${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("导出综合报表失败:", error);
      alert("导出失败，请查看控制台错误信息");
    } finally {
      setExportingComprehensive(false);
    }
  };


  // 导出照片打包
  const exportPhotos = async () => {
    if (exportingPhotos || fullData.length === 0) return;
    setExportingPhotos(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      let photoCount = 0;
      for (const inspection of fullData) {
        for (const item of inspection.items) {
          if (item.photo_urls.length > 0) {
            for (let i = 0; i < item.photo_urls.length; i++) {
              try {
                const url = item.photo_urls[i];
                const response = await fetch(url);
                const blob = await response.blob();
                const folderName = `${inspection.store_name}_${inspection.inspection_date}`;
                const fileName = `第${item.item_number}项_${i + 1}.jpg`;
                zip.folder(folderName)?.file(fileName, blob);
                photoCount++;
              } catch (e) {
                console.warn("下载照片失败:", e);
              }
            }
          }
        }
      }

      if (photoCount === 0) {
        alert("没有找到照片");
        setExportingPhotos(false);
        return;
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `巡店照片_${new Date().toISOString().split("T")[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("导出照片失败:", error);
      alert("导出照片失败");
    } finally {
      setExportingPhotos(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-500 text-sm">加载统计数据...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-4">数据加载失败</p>
          <Link href="/" className="text-amber-600 underline">返回首页</Link>
        </div>
      </div>
    );
  }

  const { summary, storeStats, trendData, recentRecords } = data;
  const total = summary.ratingDistribution.excellent + summary.ratingDistribution.good + summary.ratingDistribution.poor;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* 顶部导航 */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">返回</span>
          </Link>
          <h1 className="text-lg font-bold">统计报告</h1>
          <Link href="/history" className="text-sm opacity-90">历史记录</Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* 时间筛选 */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800">统计周期</h2>
            <div className="flex gap-2">
              {[7, 14, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    days === d
                      ? "bg-amber-600 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {d}天
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 门店选择器 */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="font-medium text-gray-800">选择门店</span>
              {selectedStores.size > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                  已选 {selectedStores.size} 家
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowStoreSelector(!showStoreSelector)}
                className="text-sm text-amber-600 hover:text-amber-700"
              >
                {showStoreSelector ? "收起" : "展开"}
              </button>
              {selectedStores.size > 0 && (
                <button
                  onClick={() => setSelectedStores(new Set())}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  清除选择
                </button>
              )}
            </div>
          </div>
          
          {showStoreSelector && (
            <div className="border rounded-lg p-3 max-h-60 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => {
                    const allStores = new Set(data?.storeStats?.map((s) => s.name) || []);
                    setSelectedStores(allStores);
                  }}
                  className="text-xs text-amber-600 hover:text-amber-700"
                >
                  全选
                </button>
                <span className="text-xs text-gray-400">
                  共 {data?.storeStats?.length || 0} 家门店
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {data?.storeStats?.map((store) => (
                  <label
                    key={store.name}
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStores.has(store.name)}
                      onChange={(e) => {
                        const newSet = new Set(selectedStores);
                        if (e.target.checked) {
                          newSet.add(store.name);
                        } else {
                          newSet.delete(store.name);
                        }
                        setSelectedStores(newSet);
                      }}
                      className="w-4 h-4 text-amber-600 rounded"
                    />
                    <span className="text-sm text-gray-700 truncate">{store.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">{store.avgScore}分</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {!showStoreSelector && selectedStores.size === 0 && (
            <p className="text-xs text-gray-400">未选择门店时，导出全部数据</p>
          )}
        </div>

        {/* 导出按钮 */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <div className="flex gap-3">
            <button
              onClick={exportToExcel}
              disabled={exporting || fullData.length === 0}
              className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {exporting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  导出中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  导出Excel(含照片)
                </>
              )}
            </button>
            <button
              onClick={exportPhotos}
              disabled={exportingPhotos || fullData.length === 0}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {exportingPhotos ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  打包中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  导出照片包
                </>
              )}
            </button>
          </div>
          <div className="flex gap-3 mt-3">
            <button
              onClick={exportComprehensiveReport}
              disabled={exportingComprehensive || fullData.length === 0}
              className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {exportingComprehensive ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  导出中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  导出汇总统计表
                </>
              )}
            </button>
          </div>
        </div>

        {/* 概览卡片 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-amber-600">{summary.totalInspections}</p>
            <p className="text-xs text-gray-500 mt-1">检查次数</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-amber-600">{summary.avgScore}</p>
            <p className="text-xs text-gray-500 mt-1">平均得分</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-green-600">
              {total > 0 ? Math.round((summary.ratingDistribution.excellent / total) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">优秀率</p>
          </div>
        </div>

        {/* 评级分布 */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h2 className="font-bold text-gray-800 mb-3">评级分布</h2>
          <div className="flex items-center gap-4">
            <svg viewBox="0 0 100 100" className="w-24 h-24">
              {total > 0 ? (
                <>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#16A34A" strokeWidth="20"
                    strokeDasharray={`${(summary.ratingDistribution.excellent / total) * 251.2} 251.2`}
                    transform="rotate(-90 50 50)" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#CA8A04" strokeWidth="20"
                    strokeDasharray={`${(summary.ratingDistribution.good / total) * 251.2} 251.2`}
                    strokeDashoffset={`-${(summary.ratingDistribution.excellent / total) * 251.2}`}
                    transform="rotate(-90 50 50)" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#DC2626" strokeWidth="20"
                    strokeDasharray={`${(summary.ratingDistribution.poor / total) * 251.2} 251.2`}
                    strokeDashoffset={`-${((summary.ratingDistribution.excellent + summary.ratingDistribution.good) / total) * 251.2}`}
                    transform="rotate(-90 50 50)" />
                </>
              ) : (
                <circle cx="50" cy="50" r="40" fill="none" stroke="#E5E7EB" strokeWidth="20" />
              )}
            </svg>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-600"></span>
                  <span className="text-sm text-gray-600">优秀</span>
                </span>
                <span className="font-medium">{summary.ratingDistribution.excellent}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-600"></span>
                  <span className="text-sm text-gray-600">良好</span>
                </span>
                <span className="font-medium">{summary.ratingDistribution.good}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-600"></span>
                  <span className="text-sm text-gray-600">较差</span>
                </span>
                <span className="font-medium">{summary.ratingDistribution.poor}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 门店排名 */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h2 className="font-bold text-gray-800 mb-3">门店排名</h2>
          <div className="space-y-2">
            {storeStats.slice(0, 10).map((s, i) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 0 ? "bg-amber-100 text-amber-700" :
                  i === 1 ? "bg-gray-100 text-gray-700" :
                  i === 2 ? "bg-orange-100 text-orange-700" :
                  "bg-gray-50 text-gray-500"
                }`}>
                  {i + 1}
                </span>
                <span className="flex-1 text-sm truncate">{s.name}</span>
                <span className="text-sm font-medium text-amber-600">{s.avgScore}分</span>
                <span className="text-xs text-gray-400">{s.count}次</span>
              </div>
            ))}
            {storeStats.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-4">暂无数据</p>
            )}
          </div>
        </div>

        {/* 最近检查 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-3">最近检查</h2>
          <div className="space-y-2">
            {recentRecords.slice(0, 10).map((r) => (
              <Link
                key={r.id}
                href={`/result/${r.id}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-sm">{r.store_name}</p>
                  <p className="text-xs text-gray-500">{r.inspection_date} · {r.supervisor_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-amber-600">{r.total_score}分</p>
                  <p className={`text-xs ${
                    r.rating === "优秀" ? "text-green-600" :
                    r.rating === "良好" ? "text-yellow-600" : "text-red-600"
                  }`}>{r.rating}</p>
                </div>
              </Link>
            ))}
            {recentRecords.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-4">暂无记录</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
