/**
 * 督导评分汇总表导出 API
 * 生成包含三个工作表的Excel：检查项明细、汇总统计、问题汇总
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

    // 获取所有检查记录
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
    const inspectionIds = inspections?.map((i: any) => i.id) || [];
    let allItems: any[] = [];
    if (inspectionIds.length > 0) {
      const { data: items } = await supabase
        .from('inspection_items')
        .select('inspection_id, item_number, category, description, max_score, actual_score, notes')
        .in('inspection_id', inspectionIds);
      allItems = items || [];
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '老凤祥督导巡店系统';
    workbook.created = new Date();

    const allFlatItems = inspectionCategories.flatMap(cat => cat.items);
    const now = new Date();
    const timeStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };

    // ==================== Sheet 1: 检查项明细 ====================
    const detailSheet = workbook.addWorksheet('检查项明细');
    
    detailSheet.columns = [
      { width: 10 },  // A: 区域
      { width: 16 },  // B: 门店名称
      { width: 10 },  // C: 负责人
      { width: 12 },  // D: 检查日期
      { width: 10 },  // E: 督导
      { width: 14 },  // F: 检查项目
      { width: 6 },   // G: 序号
      { width: 45 },  // H: 检查标准
      { width: 8 },   // I: 满分
      { width: 8 },   // J: 得分
      { width: 15 },  // K: 现场照片
      { width: 8 },   // L: 扣分
      { width: 25 },  // M: 备注
    ];
    
    // Row 1: 标题
    detailSheet.mergeCells('A1:M1');
    detailSheet.getCell('A1').value = '老凤祥督导巡店检查报告';
    detailSheet.getCell('A1').font = { size: 16, bold: true, name: '微软雅黑' };
    detailSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    detailSheet.getRow(1).height = 35;
    
    // Row 2: 统计信息
    detailSheet.mergeCells('A2:M2');
    detailSheet.getCell('A2').value = `统计周期: 近${days}天 | 导出时间: ${timeStr}`;
    detailSheet.getCell('A2').font = { size: 10, name: '微软雅黑', color: { argb: 'FF666666' } };
    detailSheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    detailSheet.getRow(2).height = 22;
    
    // Row 3: 表头
    const headers = ['区域', '门店名称', '负责人', '检查日期', '督导', '检查项目', '序号', '检查标准', '满分', '得分', '现场照片', '扣分', '备注'];
    const headerRow = detailSheet.addRow(headers);
    headerRow.height = 28;
    for (let col = 1; col <= 13; col++) {
      const cell = headerRow.getCell(col);
      cell.font = { size: 10, bold: true, name: '微软雅黑' };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
      cell.border = borderStyle;
    }
    
    // 填充所有检查记录的数据
    let rowNum = 4;
    for (const insp of (inspections || [])) {
      const inspItems = allItems.filter((i: any) => i.inspection_id === insp.id);
      const itemMap = new Map<number, any>();
      inspItems.forEach((item: any) => itemMap.set(item.item_number, item));
      
      const region = insp.region || '';
      const responsible = insp.responsible_person || '';
      
      for (const category of inspectionCategories) {
        const startRow = rowNum;
        
        for (const item of category.items) {
          const itemData = itemMap.get(item.itemNumber);
          const actualScore = itemData?.actual_score ?? item.maxScore;
          const notes = itemData?.notes || '';
          const deduction = item.maxScore - actualScore;
          
          const row = detailSheet.addRow([
            region,
            insp.store_name,
            responsible,
            insp.inspection_date,
            insp.supervisor_name,
            '',
            item.itemNumber,
            item.description,
            item.maxScore,
            actualScore,
            '',
            deduction,
            notes
          ]);
          
          row.height = 30;
          for (let col = 1; col <= 13; col++) {
            const cell = row.getCell(col);
            cell.font = { size: 10, name: '微软雅黑' };
            cell.alignment = { vertical: 'middle', wrapText: true };
            cell.border = borderStyle;
          }
          
          row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
          row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
          row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
          row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
          row.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };
          row.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };
          
          if (actualScore < item.maxScore) {
            row.getCell(10).font = { size: 10, name: '微软雅黑', color: { argb: 'FFFF0000' } };
          }
          if (deduction > 0) {
            row.getCell(12).font = { size: 10, name: '微软雅黑', color: { argb: 'FFFF0000' } };
          }
          
          rowNum++;
        }
        
        // 合并检查大类列
        const endRow = rowNum - 1;
        if (startRow <= endRow) {
          detailSheet.mergeCells(`F${startRow}:F${endRow}`);
        }
        const categoryCell = detailSheet.getCell(`F${startRow}`);
        categoryCell.value = `${category.name}\n（${category.maxScore}分）`;
        categoryCell.font = { size: 10, bold: true, name: '微软雅黑' };
        categoryCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        categoryCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8DC' } };
      }
    }
    
    // ==================== Sheet 2: 汇总统计 ====================
    const statsSheet = workbook.addWorksheet('汇总统计');
    
    statsSheet.columns = [
      { width: 18 },
      { width: 30 },
      { width: 50 },
    ];
    
    // 标题
    statsSheet.mergeCells('A1:C1');
    statsSheet.getCell('A1').value = '巡店检查统计汇总';
    statsSheet.getCell('A1').font = { size: 14, bold: true, name: '微软雅黑' };
    statsSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    statsSheet.getRow(1).height = 30;
    
    statsSheet.mergeCells('A2:C2');
    statsSheet.getCell('A2').value = `统计周期: 近${days}天`;
    statsSheet.getCell('A2').font = { size: 10, name: '微软雅黑', color: { argb: 'FF666666' } };
    statsSheet.getRow(2).height = 20;
    
    let sRow = 4;
    
    // 统计报告标题
    statsSheet.mergeCells(`A${sRow}:C${sRow}`);
    statsSheet.getCell(`A${sRow}`).value = '老凤祥督导巡店统计报告';
    statsSheet.getCell(`A${sRow}`).font = { size: 12, bold: true, name: '微软雅黑' };
    sRow++;
    statsSheet.mergeCells(`A${sRow}:C${sRow}`);
    statsSheet.getCell(`A${sRow}`).value = `统计周期: 近${days}天`;
    statsSheet.getCell(`A${sRow}`).font = { size: 10, name: '微软雅黑', color: { argb: 'FF666666' } };
    sRow++;
    
    // 统计数据
    const scores = (inspections || []).map((i: any) => i.total_score);
    const totalInspections = scores.length;
    const avgScore = totalInspections > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / totalInspections) : 0;
    const excellentCount = scores.filter((s: number) => s >= 90).length;
    const goodCount = scores.filter((s: number) => s >= 70 && s < 90).length;
    const poorCount = scores.filter((s: number) => s < 70).length;
    const excellentRate = totalInspections > 0 ? `${Math.round((excellentCount / totalInspections) * 100)}%` : '0%';
    
    // 表头
    statsSheet.getCell(`A${sRow}`).value = '项目';
    statsSheet.getCell(`B${sRow}`).value = '数值';
    statsSheet.getCell(`A${sRow}`).font = { size: 10, bold: true, name: '微软雅黑' };
    statsSheet.getCell(`B${sRow}`).font = { size: 10, bold: true, name: '微软雅黑' };
    statsSheet.getCell(`A${sRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
    statsSheet.getCell(`B${sRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
    for (let c = 1; c <= 2; c++) {
      statsSheet.getCell(sRow, c).border = borderStyle;
    }
    sRow++;
    
    const statsData = [
      ['检查次数', String(totalInspections)],
      ['平均得分', String(avgScore)],
      ['优秀次数', String(excellentCount)],
      ['良好次数', String(goodCount)],
      ['较差次数', String(poorCount)],
      ['优秀率', excellentRate],
    ];
    
    for (const [label, value] of statsData) {
      statsSheet.getCell(`A${sRow}`).value = label;
      statsSheet.getCell(`B${sRow}`).value = value;
      statsSheet.getCell(`A${sRow}`).font = { size: 10, name: '微软雅黑' };
      statsSheet.getCell(`B${sRow}`).font = { size: 10, name: '微软雅黑' };
      for (let c = 1; c <= 2; c++) {
        statsSheet.getCell(sRow, c).border = borderStyle;
      }
      sRow++;
    }
    
    // 门店排名
    sRow++;
    statsSheet.mergeCells(`A${sRow}:C${sRow}`);
    statsSheet.getCell(`A${sRow}`).value = '门店排名';
    statsSheet.getCell(`A${sRow}`).font = { size: 11, bold: true, name: '微软雅黑' };
    sRow++;
    
    // 排名表头
    statsSheet.getCell(`A${sRow}`).value = '排名';
    statsSheet.getCell(`B${sRow}`).value = '门店 / 次数 / 平均分';
    statsSheet.getCell(`A${sRow}`).font = { size: 10, bold: true, name: '微软雅黑' };
    statsSheet.getCell(`B${sRow}`).font = { size: 10, bold: true, name: '微软雅黑' };
    statsSheet.getCell(`A${sRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
    statsSheet.getCell(`B${sRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
    for (let c = 1; c <= 2; c++) {
      statsSheet.getCell(sRow, c).border = borderStyle;
    }
    sRow++;
    
    // 按门店统计排名
    const storeStats = new Map<string, { count: number; totalScore: number }>();
    (inspections || []).forEach((insp: any) => {
      const name = insp.store_name;
      if (!storeStats.has(name)) {
        storeStats.set(name, { count: 0, totalScore: 0 });
      }
      const stat = storeStats.get(name)!;
      stat.count++;
      stat.totalScore += insp.total_score;
    });
    
    const storeRanking = Array.from(storeStats.entries())
      .map(([name, stat]) => ({ name, count: stat.count, avg: Math.round(stat.totalScore / stat.count) }))
      .sort((a, b) => b.avg - a.avg);
    
    storeRanking.forEach((store, idx) => {
      statsSheet.getCell(`A${sRow}`).value = String(idx + 1);
      statsSheet.getCell(`B${sRow}`).value = ` ${store.name} / ${store.count}次 / ${store.avg}分`;
      statsSheet.getCell(`A${sRow}`).font = { size: 10, name: '微软雅黑' };
      statsSheet.getCell(`B${sRow}`).font = { size: 10, name: '微软雅黑' };
      for (let c = 1; c <= 2; c++) {
        statsSheet.getCell(sRow, c).border = borderStyle;
      }
      sRow++;
    });
    
    // 检查项模块分值分布
    sRow++;
    statsSheet.mergeCells(`A${sRow}:C${sRow}`);
    statsSheet.getCell(`A${sRow}`).value = '检查项模块分值分布';
    statsSheet.getCell(`A${sRow}`).font = { size: 11, bold: true, name: '微软雅黑' };
    sRow++;
    
    // 表头
    statsSheet.getCell(`A${sRow}`).value = '项目';
    statsSheet.getCell(`B${sRow}`).value = '分值';
    statsSheet.getCell(`C${sRow}`).value = '包含内容';
    for (let c = 1; c <= 3; c++) {
      statsSheet.getCell(sRow, c).font = { size: 10, bold: true, name: '微软雅黑' };
      statsSheet.getCell(sRow, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
      statsSheet.getCell(sRow, c).border = borderStyle;
    }
    sRow++;
    
    const catNames = ['一', '二', '三', '四', '五', '六'];
    inspectionCategories.forEach((cat, idx) => {
      const itemNames = cat.items.map(i => i.description.substring(0, 10)).join('、');
      statsSheet.getCell(`A${sRow}`).value = `${catNames[idx]}、${cat.name}`;
      statsSheet.getCell(`B${sRow}`).value = `${cat.maxScore}分`;
      statsSheet.getCell(`C${sRow}`).value = itemNames;
      for (let c = 1; c <= 3; c++) {
        statsSheet.getCell(sRow, c).font = { size: 10, name: '微软雅黑' };
        statsSheet.getCell(sRow, c).alignment = { vertical: 'middle', wrapText: true };
        statsSheet.getCell(sRow, c).border = borderStyle;
      }
      sRow++;
    });
    
    // ==================== Sheet 3: 问题汇总 ====================
    const problemSheet = workbook.addWorksheet('问题汇总');
    
    // 列: A-F=基本信息, G-AM=35个检查项
    const probColumns: Partial<ExcelJS.Column>[] = [
      { width: 10 },  // A: 区域
      { width: 18 },  // B: 店铺名
      { width: 10 },  // C: 负责人
      { width: 12 },  // D: 日期
      { width: 10 },  // E: 督导
      { width: 8 },   // F: 得分
    ];
    allFlatItems.forEach(() => {
      probColumns.push({ width: 12 });
    });
    problemSheet.columns = probColumns;
    
    // 冻结窗口至得分列（F列），前6列固定
    problemSheet.views = [{ state: 'frozen', xSplit: 6, ySplit: 3 }];
    
    // Row 1: 分类标题行（从G列开始）
    let colOffset = 7;
    inspectionCategories.forEach((cat) => {
      const count = cat.items.length;
      if (count > 1) {
        problemSheet.mergeCells(1, colOffset, 1, colOffset + count - 1);
      }
      problemSheet.getCell(1, colOffset).value = `${cat.name}（${cat.maxScore}分）`;
      problemSheet.getCell(1, colOffset).font = { size: 10, bold: true, name: '微软雅黑', color: { argb: 'FFFFFFFF' } };
      problemSheet.getCell(1, colOffset).alignment = { horizontal: 'center', vertical: 'middle' };
      problemSheet.getCell(1, colOffset).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC00000' } };
      colOffset += count;
    });
    problemSheet.getRow(1).height = 30;
    
    // Row 2: 序号行
    allFlatItems.forEach((item, idx) => {
      problemSheet.getCell(2, 7 + idx).value = item.itemNumber;
      problemSheet.getCell(2, 7 + idx).font = { size: 9, bold: true, name: '微软雅黑' };
      problemSheet.getCell(2, 7 + idx).alignment = { horizontal: 'center', vertical: 'middle' };
      problemSheet.getCell(2, 7 + idx).border = borderStyle;
    });
    problemSheet.getRow(2).height = 20;
    
    // Row 3: 检查标准行
    const descLabels: any[] = [undefined, '', '', '', '', '', '']; // 1-indexed, index 0 ignored
    allFlatItems.forEach(item => {
      descLabels.push(`${item.description}（${item.maxScore}分）`);
    });
    problemSheet.getRow(3).values = descLabels;
    for (let c = 7; c <= 6 + allFlatItems.length; c++) {
      problemSheet.getCell(3, c).font = { size: 8, name: '微软雅黑' };
      problemSheet.getCell(3, c).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      problemSheet.getCell(3, c).border = borderStyle;
    }
    problemSheet.getRow(3).height = 50;
    
    // Row 4: 表头行（红色背景白色文字）
    const headerLabels: any[] = [undefined, '区域', '店铺名', '负责人', '日期', '督导', '得分'];
    problemSheet.getRow(4).values = headerLabels;
    for (let c = 1; c <= 6; c++) {
      problemSheet.getCell(4, c).font = { size: 10, bold: true, name: '微软雅黑', color: { argb: 'FFFFFFFF' } };
      problemSheet.getCell(4, c).alignment = { horizontal: 'center', vertical: 'middle' };
      problemSheet.getCell(4, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC00000' } };
      problemSheet.getCell(4, c).border = borderStyle;
    }
    problemSheet.getRow(4).height = 25;
    
    // Row 5+: 每个检查记录一行
    let probRowNum = 5;
    for (const insp of (inspections || [])) {
      const inspItems = allItems.filter((i: any) => i.inspection_id === insp.id);
      const inspItemMap = new Map<number, any>();
      inspItems.forEach((item: any) => inspItemMap.set(item.item_number, item));
      
      const dataRow: any[] = [
        undefined, // ExcelJS values is 1-indexed, index 0 is ignored
        insp.region || '',
        insp.store_name,
        insp.responsible_person || '',
        insp.inspection_date,
        insp.supervisor_name,
        insp.total_score
      ];
      
      allFlatItems.forEach(item => {
        const itemData = inspItemMap.get(item.itemNumber);
        const actualScore = itemData?.actual_score ?? item.maxScore;
        const deduction = item.maxScore - actualScore;
        if (deduction > 0) {
          // 显示扣分原因
          const note = itemData?.notes || '';
          dataRow.push(note ? `${note}-${deduction}` : `-${deduction}`);
        } else {
          dataRow.push('');
        }
      });
      
      const dRow = problemSheet.getRow(probRowNum);
      dRow.values = dataRow;
      dRow.height = 25;
      for (let c = 1; c <= 6 + allFlatItems.length; c++) {
        problemSheet.getCell(probRowNum, c).font = { size: 9, name: '微软雅黑' };
        problemSheet.getCell(probRowNum, c).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        problemSheet.getCell(probRowNum, c).border = borderStyle;
      }
      // 得分和扣分红字
      problemSheet.getCell(probRowNum, 6).font = { size: 9, name: '微软雅黑', color: { argb: 'FFFF0000' } };
      allFlatItems.forEach((item, idx) => {
        const itemData = inspItemMap.get(item.itemNumber);
        const actualScore = itemData?.actual_score ?? item.maxScore;
        const deduction = item.maxScore - actualScore;
        if (deduction > 0) {
          problemSheet.getCell(probRowNum, 7 + idx).font = { size: 9, name: '微软雅黑', color: { argb: 'FFFF0000' } };
        }
      });
      
      probRowNum++;
    }
    
    // 生成 Buffer
    const buffer = await workbook.xlsx.writeBuffer();

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = encodeURIComponent(`老凤祥督导巡店检查报告_${dateStr}.xlsx`);

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
