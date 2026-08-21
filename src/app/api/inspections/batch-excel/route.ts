import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { inspectionCategories } from '@/lib/inspection-data';
import ExcelJS from 'exceljs';

// POST /api/inspections/batch-excel - 批量导出多店检查表Excel
export async function POST(request: NextRequest) {
  try {
    const { ids } = await request.json();
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: '请选择要导出的检查记录' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 获取所有检查记录
    const { data: inspections, error } = await supabase
      .from('inspections')
      .select('*')
      .in('id', ids)
      .order('inspection_date', { ascending: false });

    if (error || !inspections || inspections.length === 0) {
      return NextResponse.json({ error: '未找到检查记录' }, { status: 404 });
    }

    // 获取所有检查项
    const { data: allItems } = await supabase
      .from('inspection_items')
      .select('*')
      .in('inspection_id', ids);

    // 按inspection_id分组
    const itemsByInspection = new Map<number, any[]>();
    if (allItems) {
      for (const item of allItems) {
        const list = itemsByInspection.get(item.inspection_id) || [];
        list.push(item);
        itemsByInspection.set(item.inspection_id, list);
      }
    }

    // 创建工作簿
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '老凤祥督导巡店系统';
    workbook.created = new Date();

    // 为每个门店创建两个工作表
    for (const inspection of inspections) {
      const items = itemsByInspection.get(inspection.id) || [];
      const itemMap = new Map<number, any>();
      for (const item of items) {
        itemMap.set(item.item_number, item);
      }

      const storeName = inspection.store_name || '未知门店';
      const shortName = storeName.replace(/老凤祥/g, '').substring(0, 10);

      // ========== 工作表1：单店检查表 ==========
      const checkSheet = workbook.addWorksheet(`${shortName}-检查表`);

      // 设置列宽
      checkSheet.columns = [
        { width: 14 }, { width: 6 }, { width: 45 }, { width: 8 },
        { width: 25 }, { width: 8 }, { width: 10 },
      ];

      // 标题行
      const titleRow = checkSheet.addRow(['老凤祥上海督导巡店检查表（2026版）']);
      titleRow.height = 30;
      checkSheet.mergeCells('A1:G1');
      const titleCell = checkSheet.getCell('A1');
      titleCell.font = { size: 16, bold: true, name: '微软雅黑' };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };

      // 门店信息行
      const region = inspection.region || '';
      const responsible = inspection.responsible_person || '';
      const infoRow = checkSheet.addRow([
        '门店名称：', inspection.store_name, '',
        '区域&负责人：', `${region}${responsible ? ' ' + responsible : ''}`, '',
        '检查日期：', inspection.inspection_date, '',
        '督导：', inspection.supervisor_name
      ]);
      infoRow.height = 25;

      // 表头行
      const headerRow = checkSheet.addRow([
        '检查大类', '序号', '检查项目及标准', '', '', '', '', '分值', '完成情况及问题记录', '得分', '问题等级'
      ]);
      headerRow.height = 25;
      checkSheet.mergeCells('C3:G3');

      // 填充检查项
      let rowNum = 4;
      for (const category of inspectionCategories) {
        const startRow = rowNum;
        for (const item of category.items) {
          const record = itemMap.get(item.itemNumber);
          const score = record?.actual_score ?? 0;
          const notes = record?.notes || '';
          const deduction = item.maxScore - score;
          const level = deduction === 0 ? '无' : deduction <= 2 ? '轻微' : deduction <= 4 ? '一般' : '重大';

          const row = checkSheet.addRow([
            rowNum === startRow ? `${category.name}（${category.maxScore}分）` : '',
            item.itemNumber,
            item.description, '', '', '', '',
            item.maxScore,
            notes || (deduction > 0 ? `扣${deduction}分` : ''),
            score,
            level
          ]);
          row.height = 28;
          checkSheet.mergeCells(`C${rowNum}:G${rowNum}`);
          rowNum++;
        }
      }

      // ========== 工作表2：单店报表 ==========
      const reportSheet = workbook.addWorksheet(`${shortName}-报表`);
      reportSheet.columns = [
        { width: 12 }, { width: 35 }, { width: 12 }, { width: 10 }, { width: 25 }, { width: 15 }
      ];

      // 报表标题
      const reportTitle = reportSheet.addRow(['老凤祥督导巡店报表（单店）']);
      reportTitle.height = 30;
      reportSheet.mergeCells('A1:F1');
      reportTitle.getCell(1).font = { size: 16, bold: true, name: '微软雅黑' };
      reportTitle.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      reportTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };

      // 门店信息
      const rating = inspection.total_score >= 90 ? '优秀' : inspection.total_score >= 70 ? '良好' : '较差';
      const problemItems = items.filter(i => (i.max_score - i.actual_score) > 0 || (i.notes && i.notes.trim()));
      
      reportSheet.addRow(['门店名称：', inspection.store_name, '区域&负责人：', `${region} ${responsible}`]);
      reportSheet.addRow(['督导：', inspection.supervisor_name, '检查日期：', inspection.inspection_date]);
      reportSheet.addRow(['巡查评分：', inspection.total_score, '问题总数：', problemItems.length]);
      reportSheet.addRow(['评定：', `${rating}（${inspection.total_score}分）`]);

      // 问题清单
      reportSheet.addRow([]);
      const sectionRow = reportSheet.addRow(['（二）巡店检查问题清单']);
      sectionRow.getCell(1).font = { size: 12, bold: true, name: '微软雅黑' };
      
      const probHeader = reportSheet.addRow(['序号', '问题描述', '大类', '问题等级', '整改措施', '整改结果']);
      probHeader.height = 25;
      probHeader.eachCell((cell) => {
        cell.font = { size: 10, bold: true, name: '微软雅黑' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
      });

      // 填充问题项
      let probNum = 1;
      for (const category of inspectionCategories) {
        for (const item of category.items) {
          const record = itemMap.get(item.itemNumber);
          const score = record?.actual_score ?? 0;
          const notes = record?.notes || '';
          const deduction = item.maxScore - score;
          
          if (deduction > 0 || (notes && notes.trim())) {
            const level = deduction === 0 ? '轻微' : deduction <= 2 ? '轻微' : deduction <= 4 ? '一般' : '重大';
            const row = reportSheet.addRow([
              probNum++,
              notes || `扣${deduction}分`,
              category.name,
              level,
              '', ''
            ]);
            row.height = 25;
          }
        }
      }

      // 扣分合计
      const totalDeduction = 100 - inspection.total_score;
      reportSheet.addRow(['扣分合计', '', '', totalDeduction, '—', '']);
    }

    // 生成Excel
    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `老凤祥督导巡店批量报表_${dateStr}.xlsx`;

    return NextResponse.json({
      success: true,
      data: {
        content: base64,
        filename: filename,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    });
  } catch (error) {
    console.error('Batch Excel export error:', error);
    return NextResponse.json({ error: '导出失败' }, { status: 500 });
  }
}
