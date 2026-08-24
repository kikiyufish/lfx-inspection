import { NextRequest } from 'next/server';
import ExcelJS from 'exceljs';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { inspectionCategories } from '@/lib/inspection-data';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseClient();
    
    // 获取检查记录
    const { data: inspection, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('id', parseInt(id))
      .single();
    
    if (error || !inspection) {
      return new Response(JSON.stringify({ error: '检查记录不存在' }), { status: 404 });
    }
    
    // 获取检查项
    const { data: items } = await supabase
      .from('inspection_items')
      .select('*')
      .eq('inspection_id', parseInt(id));
    
    const itemMap = new Map<number, any>();
    items?.forEach((item: any) => itemMap.set(item.item_number, item));
    
    // 创建工作簿
    const workbook = new ExcelJS.Workbook();
    
    // 获取区域和负责人信息
    const region = inspection.region || '';
    const responsible = inspection.responsible_person || '';
    
    // ==================== Sheet 1: 检查评分表 ====================
    const checkSheet = workbook.addWorksheet('检查评分表');
    
    // 设置列宽
    checkSheet.columns = [
      { width: 12 },  // A: 区域
      { width: 15 },  // B: 门店名称
      { width: 12 },  // C: 负责人
      { width: 12 },  // D: 检查日期
      { width: 12 },  // E: 督导
      { width: 15 },  // F: 检查大类
      { width: 6 },   // G: 序号
      { width: 35 },  // H: 检查项目及标准
      { width: 15 },  // I: (合并)
      { width: 15 },  // J: (合并)
      { width: 8 },   // K: 满分
      { width: 8 },   // L: 得分
      { width: 8 },   // M: 扣分
      { width: 30 },  // N: 问题记录
      { width: 15 }   // O: 现场照片
    ];
    
    // 标题行
    checkSheet.mergeCells('A1:O1');
    const titleCell = checkSheet.getCell('A1');
    titleCell.value = '老凤祥督导巡店检查报告';
    titleCell.font = { size: 16, bold: true, name: '微软雅黑' };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    checkSheet.getRow(1).height = 35;
    
    // 门店信息行
    const infoRow = checkSheet.addRow([
      `区域：${region}`,
      `门店名称：${inspection.store_name}`,
      `负责人：${responsible}`,
      `检查日期：${inspection.inspection_date}`,
      `督导：${inspection.supervisor_name}`,
      '', '', '', '', '', '', '', '', '', ''
    ]);
    infoRow.height = 25;
    checkSheet.mergeCells('A2:E2');
    checkSheet.mergeCells('F2:J2');
    checkSheet.mergeCells('K2:O2');
    checkSheet.getCell('A2').value = `区域：${region}    门店名称：${inspection.store_name}    负责人：${responsible}`;
    checkSheet.getCell('F2').value = `检查日期：${inspection.inspection_date}    督导：${inspection.supervisor_name}`;
    checkSheet.getCell('K2').value = `总分：${inspection.total_score}    评级：${inspection.rating}`;
    for (let col = 1; col <= 15; col++) {
      const cell = infoRow.getCell(col);
      cell.font = { size: 11, bold: true, name: '微软雅黑' };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
    }
    
    // 表头行
    const headerRow = checkSheet.addRow([
      '区域',           // A
      '门店名称',       // B
      '负责人',         // C
      '检查日期',       // D
      '督导',           // E
      '检查大类',       // F
      '序号',           // G
      '检查项目及标准', '', '',  // H-J: 合并
      '满分',           // K
      '得分',           // L
      '扣分',           // M
      '问题记录',       // N
      '现场照片'        // O
    ]);
    headerRow.height = 25;
    checkSheet.mergeCells('H3:J3');
    
    for (let col = 1; col <= 15; col++) {
      const cell = headerRow.getCell(col);
      cell.font = { size: 10, bold: true, name: '微软雅黑' };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    // 填充检查项数据
    let rowNum = 4;
    for (const category of inspectionCategories) {
      const startRow = rowNum;
      
      for (const item of category.items) {
        const itemData = itemMap.get(item.itemNumber);
        const actualScore = itemData?.actual_score ?? item.maxScore;
        const notes = itemData?.notes || '';
        const rectification = itemData?.rectification || '';
        const deduction = item.maxScore - actualScore;
        
        // 合并问题记录和整改措施
        let displayNotes = notes;
        if (rectification) {
          displayNotes = notes ? `${notes}\n【整改措施】${rectification}` : `【整改措施】${rectification}`;
        }
        
        const row = checkSheet.addRow([
          region,                    // A: 区域
          inspection.store_name,     // B: 门店名称
          responsible,               // C: 负责人
          inspection.inspection_date, // D: 检查日期
          inspection.supervisor_name, // E: 督导
          '',                        // F: 检查大类（稍后合并）
          item.itemNumber,           // G: 序号
          item.description, '', '',  // H-J: 检查项内容（合并）
          item.maxScore,             // K: 满分
          actualScore,               // L: 得分
          deduction,                 // M: 扣分
          displayNotes,              // N: 问题记录（含整改措施）
          ''                         // O: 现场照片
        ]);
        
        row.height = 35;
        checkSheet.mergeCells(`H${rowNum}:J${rowNum}`);
        
        // 设置边框和对齐
        for (let col = 1; col <= 15; col++) {
          const cell = row.getCell(col);
          cell.font = { size: 10, name: '微软雅黑' };
          cell.alignment = { vertical: 'middle', wrapText: true };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        }
        
        // 居中的列
        row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(13).alignment = { horizontal: 'center', vertical: 'middle' };
        
        // 得分颜色
        const scoreCell = row.getCell(12);
        if (actualScore < item.maxScore) {
          scoreCell.font = { size: 10, name: '微软雅黑', color: { argb: 'FFFF0000' } };
        }
        
        // 扣分颜色
        const deductionCell = row.getCell(13);
        if (deduction > 0) {
          deductionCell.font = { size: 10, name: '微软雅黑', color: { argb: 'FFFF0000' } };
        }
        
        rowNum++;
      }
      
      // 合并检查大类列
      const endRow = rowNum - 1;
      if (startRow < endRow) {
        checkSheet.mergeCells(`F${startRow}:F${endRow}`);
      }
      const categoryCell = checkSheet.getCell(`F${startRow}`);
      categoryCell.value = `${category.name}\n（${category.maxScore}分）`;
      categoryCell.font = { size: 10, bold: true, name: '微软雅黑' };
      categoryCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      categoryCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8DC' } };
    }
    
    // 总分行
    const totalRow = checkSheet.addRow(['', '', '', '', '', '总  分', '', '', '', '', '', '', '', inspection.total_score, '']);
    totalRow.height = 25;
    checkSheet.mergeCells(`A${rowNum}:E${rowNum}`);
    checkSheet.mergeCells(`F${rowNum}:N${rowNum}`);
    checkSheet.getCell(`F${rowNum}`).font = { size: 12, bold: true, name: '微软雅黑' };
    checkSheet.getCell(`F${rowNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
    checkSheet.getCell(`O${rowNum}`).font = { size: 14, bold: true, name: '微软雅黑', color: { argb: 'FFD4AF37' } };
    checkSheet.getCell(`O${rowNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
    for (let col = 1; col <= 15; col++) {
      totalRow.getCell(col).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    rowNum++;
    
    // 评定行
    const ratingText = inspection.rating === '优秀' 
      ? '优秀（90-100分）' 
      : (inspection.rating === '良好' ? '良好（70-89分）' : '较差（<70分）');
    const ratingRow = checkSheet.addRow(['', '', '', '', '', '评定等级', '', '', '', '', '', '', '', ratingText, '']);
    ratingRow.height = 25;
    checkSheet.mergeCells(`A${rowNum}:E${rowNum}`);
    checkSheet.mergeCells(`F${rowNum}:N${rowNum}`);
    checkSheet.getCell(`F${rowNum}`).font = { size: 12, bold: true, name: '微软雅黑' };
    checkSheet.getCell(`F${rowNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
    const ratingCell = checkSheet.getCell(`O${rowNum}`);
    ratingCell.font = { size: 12, bold: true, name: '微软雅黑', color: { argb: 'FFD4AF37' } };
    ratingCell.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let col = 1; col <= 15; col++) {
      ratingRow.getCell(col).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    // 导出时间
    const exportTimeRow = checkSheet.addRow([`导出时间：${new Date().toLocaleString('zh-CN')}`, '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    exportTimeRow.height = 20;
    checkSheet.mergeCells(`A${rowNum + 1}:O${rowNum + 1}`);
    checkSheet.getCell(`A${rowNum + 1}`).font = { size: 9, name: '微软雅黑', color: { argb: 'FF888888' } };
    
    // ==================== Sheet 2: 问题汇总表 ====================
    const problemSheet = workbook.addWorksheet('问题汇总表');
    
    problemSheet.columns = [
      { width: 15 },  // A: 检查大类
      { width: 6 },   // B: 序号
      { width: 40 },  // C: 检查项目
      { width: 10 },  // D: 扣分
      { width: 40 },  // E: 问题记录
      { width: 40 }   // F: 整改措施
    ];
    
    // 标题
    problemSheet.mergeCells('A1:F1');
    problemSheet.getCell('A1').value = '问题汇总表';
    problemSheet.getCell('A1').font = { size: 14, bold: true, name: '微软雅黑' };
    problemSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    problemSheet.getRow(1).height = 30;
    
    // 表头
    const problemHeader = problemSheet.addRow(['检查大类', '序号', '检查项目', '扣分', '问题记录', '整改措施']);
    problemHeader.height = 25;
    for (let col = 1; col <= 6; col++) {
      const cell = problemHeader.getCell(col);
      cell.font = { size: 10, bold: true, name: '微软雅黑' };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    // 填充问题数据
    let problemRow = 2;
    for (const category of inspectionCategories) {
      for (const item of category.items) {
        const itemData = itemMap.get(item.itemNumber);
        const actualScore = itemData?.actual_score ?? item.maxScore;
        const deduction = item.maxScore - actualScore;
        
        // 只显示有扣分或有备注的项
        if (deduction > 0 || itemData?.notes) {
          const row = problemSheet.addRow([
            category.name,
            item.itemNumber,
            item.description,
            deduction,
            itemData?.notes || '',
            itemData?.rectification || ''
          ]);
          row.height = 30;
          
          for (let col = 1; col <= 6; col++) {
            const cell = row.getCell(col);
            cell.font = { size: 10, name: '微软雅黑' };
            cell.alignment = { vertical: 'middle', wrapText: true };
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          }
          
          // 扣分列居中
          row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
          if (deduction > 0) {
            row.getCell(4).font = { size: 10, name: '微软雅黑', color: { argb: 'FFFF0000' } };
          }
          
          problemRow++;
        }
      }
    }
    
    // 生成 Excel 文件
    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    
    return new Response(JSON.stringify({
      success: true,
      filename: `${inspection.store_name}_检查报告_${inspection.inspection_date}.xlsx`,
      data: base64
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('生成Excel失败:', error);
    return new Response(JSON.stringify({ error: '生成Excel失败' }), { status: 500 });
  }
}
