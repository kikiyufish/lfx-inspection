/**
 * 督导评分汇总表导出 API
 * 生成包含三个工作表的Excel：督导评分汇总、统计分析
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import ExcelJS from 'exceljs';
import { inspectionCategories } from '@/lib/inspection-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const supabase = getSupabaseClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 获取所有检查记录（含明细）
    const { data: inspections, error } = await supabase
      .from('inspections')
      .select(`
        id, store_name, region, responsible_person, inspection_date,
        supervisor_name, total_score, rating, created_at
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: '获取数据失败: ' + error.message }, { status: 500 });
    }

    // 获取所有检查项明细
    const inspectionIds = inspections?.map(i => i.id) || [];
    let allItems: any[] = [];
    if (inspectionIds.length > 0) {
      const { data: items } = await supabase
        .from('inspection_items')
        .select('inspection_id, item_number, category, description, max_score, actual_score, notes')
        .in('inspection_id', inspectionIds);
      allItems = items || [];
    }

    // 创建 Excel 工作簿
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '老凤祥督导巡店系统';
    workbook.created = new Date();

    // ==================== 工作表1：督导评分汇总 ====================
    const summarySheet = workbook.addWorksheet('督导评分汇总');

    // 定义样式
    const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
    const categoryFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // 构建列：位置、编号、店铺名、区域、区域经理、督导、日期、总分 + 35个检查项
    const columns: Partial<ExcelJS.Column>[] = [
      { header: '位置', key: 'location', width: 12 },
      { header: '编号', key: 'seq', width: 6 },
      { header: '店铺名', key: 'store', width: 24 },
      { header: '区域', key: 'region', width: 14 },
      { header: '区域经理', key: 'manager', width: 10 },
      { header: '督导', key: 'supervisor', width: 10 },
      { header: '日期', key: 'date', width: 12 },
      { header: '总分', key: 'score', width: 8 },
    ];

    // 添加35个检查项列
    const allItems_flat = inspectionCategories.flatMap(cat => cat.items);
    allItems_flat.forEach((item, idx) => {
      columns.push({
        header: `${item.itemNumber}`,
        key: `item_${item.itemNumber}`,
        width: 10
      });
    });

    summarySheet.columns = columns;

    // 第1行：标题
    const titleRow = summarySheet.getRow(1);
    titleRow.values = ['老凤祥上海地区督导评分汇总表（2026版）'];
    titleRow.font = { bold: true, size: 14 };
    summarySheet.mergeCells(1, 1, 1, columns.length);

    // 第2行：分类标题行
    const catRow = summarySheet.getRow(2);
    catRow.values = ['', '', '', '', '', '', '', ''];
    // 添加分类标题
    let colIdx = 9;
    inspectionCategories.forEach(cat => {
      const itemCount = cat.items.length;
      catRow.getCell(colIdx).value = `${cat.name}（${cat.maxScore}分）`;
      if (itemCount > 1) {
        summarySheet.mergeCells(2, colIdx, 2, colIdx + itemCount - 1);
      }
      colIdx += itemCount;
    });
    catRow.font = { bold: true, size: 10 };
    catRow.fill = headerFill;
    catRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // 第3行：检查项编号
    const numRow = summarySheet.getRow(3);
    numRow.values = ['', '', '', '', '', '', '', ''];
    let numColIdx = 9;
    allItems_flat.forEach(item => {
      numRow.getCell(numColIdx).value = item.itemNumber;
      numColIdx++;
    });
    numRow.font = { bold: true, size: 9 };
    numRow.fill = categoryFill;
    numRow.alignment = { horizontal: 'center' };

    // 第4行：检查项描述（简化版）
    const descRow = summarySheet.getRow(4);
    descRow.values = ['', '', '', '', '', '', '', ''];
    let descColIdx = 9;
    allItems_flat.forEach(item => {
      const shortDesc = item.description.length > 20 ? item.description.substring(0, 20) + '...' : item.description;
      descRow.getCell(descColIdx).value = `${shortDesc}（${item.maxScore}分）`;
      descColIdx++;
    });
    descRow.font = { size: 8 };
    descRow.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
    summarySheet.getRow(4).height = 40;

    // 第5行：列标题（问题记录/扣分）
    const headerRow = summarySheet.getRow(5);
    const headerValues = ['位置/交通', '序号', '门店名称', '区域', '区域经理', '督导', '检查日期', '总分'];
    allItems_flat.forEach(() => headerValues.push('问题记录/扣分'));
    headerRow.values = headerValues;
    headerRow.font = { bold: true, size: 9 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6D9B7' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // 填充门店数据
    inspections?.forEach((insp, idx) => {
      const row = summarySheet.getRow(6 + idx);
      const rowValues: any[] = [
        '', // 位置
        idx + 1,
        insp.store_name,
        insp.region || '',
        '', // 区域经理
        insp.supervisor_name,
        new Date(insp.inspection_date).toLocaleDateString('zh-CN'),
        insp.total_score
      ];

      // 为每个检查项填充扣分情况
      const inspItems = allItems.filter(i => i.inspection_id === insp.id);
      allItems_flat.forEach(item => {
        const inspItem = inspItems.find(i => i.item_number === item.itemNumber);
        if (inspItem && inspItem.actual_score < inspItem.max_score) {
          // 有扣分，记录问题
          const deduction = inspItem.max_score - inspItem.actual_score;
          const note = inspItem.notes ? inspItem.notes.substring(0, 30) : '';
          rowValues.push(note ? `${note}-${deduction}` : `-${deduction}`);
        } else {
          rowValues.push('');
        }
      });

      row.values = rowValues;
      row.alignment = { vertical: 'middle', wrapText: true };
    });

    // 添加问题统计行
    const statsRow = summarySheet.getRow(6 + (inspections?.length || 0));
    statsRow.values = ['', '问题统计', '', '', '', '', '', ''];
    // 计算每个检查项的问题率
    allItems_flat.forEach((item, idx) => {
      const itemInspections = allItems.filter(i => i.item_number === item.itemNumber);
      const problemCount = itemInspections.filter(i => i.actual_score < i.max_score).length;
      const totalInspections = inspections?.length || 1;
      const rate = Math.round((problemCount / totalInspections) * 100);
      statsRow.getCell(9 + idx).value = `${rate}%`;
    });
    statsRow.font = { bold: true };
    statsRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };

    // ==================== 工作表2：统计分析 ====================
    const analysisSheet = workbook.addWorksheet('统计分析');

    // 设置列宽
    analysisSheet.columns = [
      { width: 20 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 12 }
    ];

    // 标题
    const analysisTitle = analysisSheet.getRow(1);
    analysisTitle.values = ['督导评分统计分析'];
    analysisTitle.font = { bold: true, size: 14 };
    analysisSheet.mergeCells(1, 1, 1, 7);

    // 一、总体统计
    let row = 3;
    analysisSheet.getRow(row).values = ['一、总体统计'];
    analysisSheet.getRow(row).font = { bold: true, size: 12 };
    row++;

    const totalInspections = inspections?.length || 0;
    const scores = inspections?.map(i => i.total_score) || [];
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const excellentCount = scores.filter(s => s >= 90).length;
    const goodCount = scores.filter(s => s >= 70 && s < 90).length;
    const poorCount = scores.filter(s => s < 70).length;

    const summaryData = [
      ['已检查门店数', totalInspections],
      ['平均分', avgScore],
      ['最高分', maxScore],
      ['最低分', minScore],
      ['优秀数(≥90)', excellentCount],
      ['良好数(70-89)', goodCount],
      ['较差数(<70)', poorCount]
    ];

    summaryData.forEach(data => {
      analysisSheet.getRow(row).values = data;
      analysisSheet.getRow(row).getCell(1).font = { bold: true };
      row++;
    });

    // 二、各区域评分统计
    row += 1;
    analysisSheet.getRow(row).values = ['二、各区域评分统计'];
    analysisSheet.getRow(row).font = { bold: true, size: 12 };
    row++;

    // 区域表头
    analysisSheet.getRow(row).values = ['区域', '门店总数', '已检查', '平均分', '最高分', '最低分', '优秀率'];
    analysisSheet.getRow(row).font = { bold: true };
    analysisSheet.getRow(row).fill = headerFill;
    row++;

    // 按区域统计
    const regionStats = new Map<string, { total: number; scores: number[] }>();
    inspections?.forEach(insp => {
      const region = insp.region || '未分类';
      if (!regionStats.has(region)) {
        regionStats.set(region, { total: 0, scores: [] });
      }
      const stat = regionStats.get(region)!;
      stat.total++;
      stat.scores.push(insp.total_score);
    });

    regionStats.forEach((stat, region) => {
      const avg = stat.scores.length > 0 ? (stat.scores.reduce((a, b) => a + b, 0) / stat.scores.length).toFixed(1) : '—';
      const max = stat.scores.length > 0 ? Math.max(...stat.scores) : 0;
      const min = stat.scores.length > 0 ? Math.min(...stat.scores) : 0;
      const excellentRate = stat.scores.length > 0
        ? `${Math.round((stat.scores.filter(s => s >= 90).length / stat.scores.length) * 100)}%`
        : '—';
      analysisSheet.getRow(row).values = [region, stat.total, stat.total, avg, max, min, excellentRate];
      row++;
    });

    // 三、高频问题项统计
    row += 1;
    analysisSheet.getRow(row).values = ['三、高频问题项统计（各项被记录问题的门店数）'];
    analysisSheet.getRow(row).font = { bold: true, size: 12 };
    row++;

    // 问题统计表头
    analysisSheet.getRow(row).values = ['序号', '检查项（简称）', '满分', '问题门店数', '问题率'];
    analysisSheet.getRow(row).font = { bold: true };
    analysisSheet.getRow(row).fill = headerFill;
    row++;

    // 计算每个检查项的问题率
    allItems_flat.forEach(item => {
      const itemInspections = allItems.filter(i => i.item_number === item.itemNumber);
      const problemCount = itemInspections.filter(i => i.actual_score < i.max_score).length;
      const totalInsp = inspections?.length || 1;
      const rate = totalInsp > 0 ? `${Math.round((problemCount / totalInsp) * 100)}%` : '—';
      const shortDesc = item.description.length > 25 ? item.description.substring(0, 25) + '…' : item.description;
      analysisSheet.getRow(row).values = [item.itemNumber, shortDesc, item.maxScore, problemCount, rate];
      row++;
    });

    // 生成 Buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // 返回文件
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = encodeURIComponent(`老凤祥上海地区督导评分汇总表_${dateStr}.xlsx`);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`
      }
    });
  } catch (error) {
    console.error('导出汇总表失败:', error);
    return NextResponse.json({ error: '导出失败' }, { status: 500 });
  }
}
