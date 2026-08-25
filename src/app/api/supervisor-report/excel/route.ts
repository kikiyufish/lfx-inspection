import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const dateParam = request.nextUrl.searchParams.get('date');
  const days = parseInt(request.nextUrl.searchParams.get('days') || '30');
  
  let cutoffDate: Date;
  if (dateParam) {
    cutoffDate = new Date(dateParam);
  } else {
    cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
  }

  const supabase = getSupabaseClient();

  // 获取所有检查记录
  const { data: inspections, error } = await getSupabaseClient()
    .from('inspections')
    .select('*')
    .gte('inspection_date', cutoffDate.toISOString().split('T')[0])
    .order('inspection_date', { ascending: false });

  if (error) {
    console.error('查询失败:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('督导巡店报表');

  // 设置列宽
  ws.columns = [
    { width: 8 },   // A: 序号
    { width: 35 },  // B: 问题描述
    { width: 12 },  // C: 问题等级
    { width: 10 },  // D: 扣分值
    { width: 30 },  // E: 整改措施
    { width: 15 },  // F: 整改结果
  ];

  let currentRow = 1;

  // 遍历每个门店生成报表
  for (const inspection of inspections) {
    const inspectionId = inspection.id;
    const storeName = inspection.store_name;
    const region = inspection.region;
    const personInCharge = inspection.person_in_charge;
    const supervisor = inspection.supervisor_name;
    const inspectionDate = inspection.inspection_date;
    const totalScore = inspection.total_score;
    const rating = inspection.rating;

    // 获取检查项明细
    const { data: items } = await getSupabaseClient()
      .from('inspection_items')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('item_index');

    if (!items || items.length === 0) continue;

    // 统计问题数量
    const problemItems = items.filter((item: any) => item.score < item.max_score);
    const problemCount = problemItems.length;

    // === 标题 ===
    ws.mergeCells(`A${currentRow}:F${currentRow}`);
    const titleCell = ws.getCell(`A${currentRow}`);
    titleCell.value = '老凤祥督导巡店报表（单店）';
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFF0000' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(currentRow).height = 30;
    currentRow++;

    // 空行
    currentRow++;

    // === 报告周期和督导签名 ===
    ws.mergeCells(`A${currentRow}:F${currentRow}`);
    const periodCell = ws.getCell(`A${currentRow}`);
    const dateStr = new Date(inspectionDate).toLocaleDateString('zh-CN');
    periodCell.value = `报告周期：${dateStr}    督导签名：___________`;
    periodCell.font = { size: 11 };
    currentRow++;

    // 空行
    currentRow++;

    // === （一）本次核心工作摘要 ===
    ws.mergeCells(`A${currentRow}:F${currentRow}`);
    const section1Cell = ws.getCell(`A${currentRow}`);
    section1Cell.value = '（一）本次核心工作摘要';
    section1Cell.font = { size: 12, bold: true };
    currentRow++;

    // 空行
    currentRow++;

    // 门店信息行
    ws.mergeCells(`A${currentRow}:F${currentRow}`);
    const infoCell = ws.getCell(`A${currentRow}`);
    infoCell.value = `区域：${region}    门店名称：${storeName}    负责人：${personInCharge}    督导：${supervisor}    巡查评分：${totalScore}分，问题发现：${problemCount}项，整改情况：□已完成 □未完成`;
    infoCell.font = { size: 11 };
    infoCell.alignment = { wrapText: true };
    ws.getRow(currentRow).height = 25;
    currentRow++;

    // 空行
    currentRow++;

    // 其他情况
    ws.mergeCells(`A${currentRow}:F${currentRow}`);
    const otherCell = ws.getCell(`A${currentRow}`);
    otherCell.value = '其他情况：_________________________________________________';
    otherCell.font = { size: 11 };
    currentRow++;

    // 空行
    currentRow++;

    // === （二）巡店检查工作开展详情 ===
    ws.mergeCells(`A${currentRow}:F${currentRow}`);
    const section2Cell = ws.getCell(`A${currentRow}`);
    section2Cell.value = '（二）巡店检查工作开展详情';
    section2Cell.font = { size: 12, bold: true };
    currentRow++;

    // 空行
    currentRow++;

    // === 表头 ===
    const headerRow = currentRow;
    const headers = ['序号', '问题描述（对应检查表大类编号）', '问题等级', '扣分值', '整改措施', '整改结果'];
    headers.forEach((header, idx) => {
      const cell = ws.getCell(`${String.fromCharCode(65 + idx)}${currentRow}`);
      cell.value = header;
      cell.font = { bold: true, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' }  // 浅蓝色背景
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    ws.getRow(currentRow).height = 30;
    currentRow++;

    // === 问题列表 ===
    let problemIndex = 1;
    for (const item of problemItems) {
      const categoryIndex = Math.floor((item.item_index - 1) / 5) + 1;
      const itemInCategory = ((item.item_index - 1) % 5) + 1;
      const categoryNames = ['一', '二', '三', '四', '五', '六'];
      const categoryPrefix = categoryNames[categoryIndex - 1] || '一';
      
      const problemDesc = `${categoryPrefix}/${item.item_index} ${item.content}`;
      const deduction = item.score - item.max_score;
      
      // 问题等级判断
      let problemLevel = '轻微';
      if (Math.abs(deduction) >= 3) {
        problemLevel = '严重';
      } else if (Math.abs(deduction) >= 2) {
        problemLevel = '一般';
      }

      const row = currentRow;
      
      // 序号
      ws.getCell(`A${row}`).value = problemIndex;
      ws.getCell(`A${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
      
      // 问题描述
      ws.getCell(`B${row}`).value = problemDesc;
      ws.getCell(`B${row}`).alignment = { vertical: 'middle', wrapText: true };
      
      // 问题等级
      ws.getCell(`C${row}`).value = problemLevel;
      ws.getCell(`C${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
      
      // 扣分值（红色）
      ws.getCell(`D${row}`).value = deduction;
      ws.getCell(`D${row}`).font = { color: { argb: 'FFFF0000' } };
      ws.getCell(`D${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
      
      // 整改措施
      ws.getCell(`E${row}`).value = item.rectification || '';
      ws.getCell(`E${row}`).alignment = { vertical: 'middle', wrapText: true };
      
      // 整改结果
      ws.getCell(`F${row}`).value = '';
      ws.getCell(`F${row}`).alignment = { horizontal: 'center', vertical: 'middle' };

      // 添加边框
      for (let col = 1; col <= 6; col++) {
        const cell = ws.getCell(`${String.fromCharCode(64 + col)}${row}`);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }

      ws.getRow(row).height = 40;
      currentRow++;
      problemIndex++;
    }

    // 如果没有问题，添加空行提示
    if (problemCount === 0) {
      ws.mergeCells(`A${currentRow}:F${currentRow}`);
      const noProblemCell = ws.getCell(`A${currentRow}`);
      noProblemCell.value = '本次检查未发现问题';
      noProblemCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(currentRow).height = 30;
      currentRow++;
    }

    // 每个门店报表后添加分页符和空行
    ws.addRow([]);
    currentRow += 2;
  }

  // 生成 Buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const base64 = Buffer.from(buffer as any).toString('base64');

  return NextResponse.json({
    success: true,
    filename: `督导巡店报表_${new Date().toISOString().split('T')[0]}.xlsx`,
    data: base64,
  });
}
