import { NextRequest } from 'next/server';
import ExcelJS from 'exceljs';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { inspectionCategories } from '@/lib/inspection-data';
import { downloadFile } from '@/lib/storage';

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
    
    const region = inspection.region || '';
    const responsible = inspection.responsible_person || '';
    const allFlatItems = inspectionCategories.flatMap(cat => cat.items);
    
    // ==================== Sheet 1: 检查项明细 ====================
    const ws = workbook.addWorksheet('检查项明细');
    
    // 13列: A-M
    ws.columns = [
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
    ws.mergeCells('A1:M1');
    const titleCell = ws.getCell('A1');
    titleCell.value = '老凤祥督导巡店检查报告';
    titleCell.font = { size: 16, bold: true, name: '微软雅黑' };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 35;
    
    // Row 2: 统计信息
    ws.mergeCells('A2:M2');
    const now = new Date();
    const timeStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    ws.getCell('A2').value = `统计周期: 近30天 | 导出时间: ${timeStr}`;
    ws.getCell('A2').font = { size: 10, name: '微软雅黑', color: { argb: 'FF666666' } };
    ws.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 22;
    
    // Row 3: 表头
    const headers = ['区域', '门店名称', '负责人', '检查日期', '督导', '检查项目', '序号', '检查标准', '满分', '得分', '现场照片', '扣分', '备注'];
    const headerRow = ws.addRow(headers);
    headerRow.height = 28;
    for (let col = 1; col <= 13; col++) {
      const cell = headerRow.getCell(col);
      cell.font = { size: 10, bold: true, name: '微软雅黑' };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    }
    
    // Row 4+: 数据行
    let rowNum = 4;
    for (const category of inspectionCategories) {
      const startRow = rowNum;
      
      for (const item of category.items) {
        const itemData = itemMap.get(item.itemNumber);
        const actualScore = itemData?.actual_score ?? item.maxScore;
        const notes = itemData?.notes || '';
        const rectification = itemData?.rectification || '';
        const deduction = item.maxScore - actualScore;
        
        let displayNotes = notes;
        if (rectification) {
          displayNotes = notes ? `${notes}\n【整改措施】${rectification}` : `【整改措施】${rectification}`;
        }
        
        const row = ws.addRow([
          region,
          inspection.store_name,
          responsible,
          inspection.inspection_date,
          inspection.supervisor_name,
          '',                         // F: 检查项目（合并）
          item.itemNumber,
          item.description,
          item.maxScore,
          actualScore,
          '',                         // K: 现场照片
          deduction,
          displayNotes
        ]);
        
        row.height = 35;
        
        for (let col = 1; col <= 13; col++) {
          const cell = row.getCell(col);
          cell.font = { size: 10, name: '微软雅黑' };
          cell.alignment = { vertical: 'middle', wrapText: true };
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          };
        }
        
        // 居中列
        row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };
        
        // 得分颜色
        if (actualScore < item.maxScore) {
          row.getCell(10).font = { size: 10, name: '微软雅黑', color: { argb: 'FFFF0000' } };
        }
        // 扣分颜色
        if (deduction > 0) {
          row.getCell(12).font = { size: 10, name: '微软雅黑', color: { argb: 'FFFF0000' } };
        }
        
        // 插入照片到K列
        let photoKeys: string[] = [];
        try {
          if (itemData?.photo_keys) {
            photoKeys = JSON.parse(itemData.photo_keys);
          }
        } catch {
          photoKeys = [];
        }
        if (photoKeys.length > 0) {
          try {
            const firstPhotoKey = photoKeys[0];
            const photoBuffer = await downloadFile(firstPhotoKey);
            if (photoBuffer) {
              const imageId = workbook.addImage({
                buffer: photoBuffer as any,
                extension: 'jpeg',
              });
              ws.addImage(imageId, {
                tl: { col: 10.15, row: rowNum - 0.85 },
                ext: { width: 100, height: 75 }
              });
            }
          } catch (photoError) {
            console.error('插入照片失败:', photoError);
          }
        }
        
        rowNum++;
      }
      
      // 合并检查大类列
      const endRow = rowNum - 1;
      if (startRow <= endRow) {
        ws.mergeCells(`F${startRow}:F${endRow}`);
      }
      const categoryCell = ws.getCell(`F${startRow}`);
      categoryCell.value = `${category.name}\n（${category.maxScore}分）`;
      categoryCell.font = { size: 10, bold: true, name: '微软雅黑' };
      categoryCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      categoryCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8DC' } };
    }
    
    // ==================== Sheet 2: 汇总统计 ====================
    const statsSheet = workbook.addWorksheet('汇总统计');
    
    statsSheet.columns = [
      { width: 18 },
      { width: 25 },
      { width: 50 },
    ];
    
    // 标题
    statsSheet.mergeCells('A1:C1');
    statsSheet.getCell('A1').value = '巡店检查统计汇总';
    statsSheet.getCell('A1').font = { size: 14, bold: true, name: '微软雅黑' };
    statsSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    statsSheet.getRow(1).height = 30;
    
    // 统计周期
    statsSheet.mergeCells('A2:C2');
    statsSheet.getCell('A2').value = '统计周期: 近30天';
    statsSheet.getCell('A2').font = { size: 10, name: '微软雅黑', color: { argb: 'FF666666' } };
    statsSheet.getRow(2).height = 20;
    
    // 空行
    let sRow = 4;
    
    // 统计报告标题
    statsSheet.mergeCells(`A${sRow}:C${sRow}`);
    statsSheet.getCell(`A${sRow}`).value = '老凤祥督导巡店统计报告';
    statsSheet.getCell(`A${sRow}`).font = { size: 12, bold: true, name: '微软雅黑' };
    sRow++;
    statsSheet.mergeCells(`A${sRow}:C${sRow}`);
    statsSheet.getCell(`A${sRow}`).value = '统计周期: 近30天';
    statsSheet.getCell(`A${sRow}`).font = { size: 10, name: '微软雅黑', color: { argb: 'FF666666' } };
    sRow++;
    
    // 统计数据
    const totalScore = inspection.total_score || 0;
    const rating = inspection.rating || '';
    const isExcellent = totalScore >= 90;
    const isGood = totalScore >= 70 && totalScore < 90;
    const isPoor = totalScore < 70;
    
    const statsData = [
      ['检查次数', '1'],
      ['平均得分', String(totalScore)],
      ['优秀次数', isExcellent ? '1' : '0'],
      ['良好次数', isGood ? '1' : '0'],
      ['较差次数', isPoor ? '1' : '0'],
      ['优秀率', isExcellent ? '100%' : '0%'],
    ];
    
    // 表头
    statsSheet.getCell(`A${sRow}`).value = '项目';
    statsSheet.getCell(`B${sRow}`).value = '数值';
    statsSheet.getCell(`A${sRow}`).font = { size: 10, bold: true, name: '微软雅黑' };
    statsSheet.getCell(`B${sRow}`).font = { size: 10, bold: true, name: '微软雅黑' };
    statsSheet.getCell(`A${sRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
    statsSheet.getCell(`B${sRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
    sRow++;
    
    for (const [label, value] of statsData) {
      statsSheet.getCell(`A${sRow}`).value = label;
      statsSheet.getCell(`B${sRow}`).value = value;
      statsSheet.getCell(`A${sRow}`).font = { size: 10, name: '微软雅黑' };
      statsSheet.getCell(`B${sRow}`).font = { size: 10, name: '微软雅黑' };
      for (let c = 1; c <= 2; c++) {
        statsSheet.getCell(sRow, c).border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
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
      statsSheet.getCell(sRow, c).border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    }
    sRow++;
    
    // 排名数据（单店只有1条）
    statsSheet.getCell(`A${sRow}`).value = '1';
    statsSheet.getCell(`B${sRow}`).value = ` ${inspection.store_name} / 1次 / ${totalScore}分`;
    statsSheet.getCell(`A${sRow}`).font = { size: 10, name: '微软雅黑' };
    statsSheet.getCell(`B${sRow}`).font = { size: 10, name: '微软雅黑' };
    for (let c = 1; c <= 2; c++) {
      statsSheet.getCell(sRow, c).border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    }
    sRow++;
    
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
      statsSheet.getCell(sRow, c).border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    }
    sRow++;
    
    // 各分类
    const catNames = ['一', '二', '三', '四', '五', '六'];
    inspectionCategories.forEach((cat, idx) => {
      const itemNames = cat.items.map(i => i.description.substring(0, 10)).join('、');
      statsSheet.getCell(`A${sRow}`).value = `${catNames[idx]}、${cat.name}`;
      statsSheet.getCell(`B${sRow}`).value = `${cat.maxScore}分`;
      statsSheet.getCell(`C${sRow}`).value = itemNames;
      for (let c = 1; c <= 3; c++) {
        statsSheet.getCell(sRow, c).font = { size: 10, name: '微软雅黑' };
        statsSheet.getCell(sRow, c).alignment = { vertical: 'middle', wrapText: true };
        statsSheet.getCell(sRow, c).border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      }
      sRow++;
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer as any).toString('base64');
    
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
