import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { inspectionCategories } from '@/lib/inspection-data';
import ExcelJS from 'exceljs';

// GET /api/inspections/[id]/excel - 生成单店检查表及报表Excel
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseClient();

  // 获取检查记录
  const { data: inspection, error } = await supabase
    .from('inspections')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !inspection) {
    return NextResponse.json({ error: '检查记录不存在' }, { status: 404 });
  }

  // 获取检查项明细
  const { data: items } = await supabase
    .from('inspection_items')
    .select('*')
    .eq('inspection_id', id)
    .order('item_number', { ascending: true });

  // 创建检查项映射
  const itemMap = new Map<number, any>();
  if (items) {
    for (const item of items) {
      itemMap.set(item.item_number, item);
    }
  }

  // 创建工作簿
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '老凤祥督导巡店系统';
  workbook.created = new Date();

  // ========== 工作表1：单店检查表 ==========
  const checkSheet = workbook.addWorksheet('单店检查表');

  // 设置列宽
  checkSheet.columns = [
    { width: 14 },  // A: 检查大类
    { width: 6 },   // B: 序号
    { width: 45 },  // C-G: 检查项目及标准（合并）
    { width: 8 },   // H: 分值
    { width: 25 },  // I: 完成情况及问题记录
    { width: 8 },   // J: 得分
    { width: 10 },  // K: 问题等级
  ];

  // 标题行
  const titleRow = checkSheet.addRow(['老凤祥上海督导巡店检查表（2026版）']);
  titleRow.height = 30;
  checkSheet.mergeCells('A1:K1');
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
  checkSheet.mergeCells('A2:B2');
  checkSheet.mergeCells('C2:E2');
  checkSheet.mergeCells('F2:H2');
  checkSheet.mergeCells('I2:J2');
  checkSheet.mergeCells('K2:K2');
  
  for (let col = 1; col <= 11; col++) {
    const cell = infoRow.getCell(col);
    cell.font = { size: 11, bold: true, name: '微软雅黑' };
    cell.alignment = { vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
  }

  // 表头行
  const headerRow = checkSheet.addRow([
    '检查大类', '序号', '检查项目及标准', '', '', '', '', '分值', '完成情况及问题记录', '得分', '问题等级'
  ]);
  headerRow.height = 25;
  checkSheet.mergeCells('C3:G3');
  
  for (let col = 1; col <= 11; col++) {
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
      const deduction = item.maxScore - actualScore;
      const level = deduction === 0 ? '无' : (deduction >= 3 ? '重大' : (deduction >= 2 ? '一般' : '轻微'));
      
      const row = checkSheet.addRow([
        '', // 检查大类（稍后合并）
        item.itemNumber,
        item.description, '', '', '', '', // 检查项内容（合并C-G）
        item.maxScore,
        notes,
        actualScore,
        level
      ]);
      
      row.height = 35;
      checkSheet.mergeCells(`C${rowNum}:G${rowNum}`);
      
      // 设置边框和对齐
      for (let col = 1; col <= 11; col++) {
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
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };
      
      // 得分颜色
      const scoreCell = row.getCell(10);
      if (actualScore < item.maxScore) {
        scoreCell.font = { size: 10, name: '微软雅黑', color: { argb: 'FFFF0000' } };
      }
      
      // 问题等级颜色
      const levelCell = row.getCell(11);
      if (level === '重大') {
        levelCell.font = { size: 10, name: '微软雅黑', color: { argb: 'FFFF0000' } };
      } else if (level === '一般') {
        levelCell.font = { size: 10, name: '微软雅黑', color: { argb: 'FFFF8C00' } };
      }
      
      rowNum++;
    }
    
    // 合并检查大类列
    const endRow = rowNum - 1;
    if (startRow < endRow) {
      checkSheet.mergeCells(`A${startRow}:A${endRow}`);
    }
    const categoryCell = checkSheet.getCell(`A${startRow}`);
    categoryCell.value = `${category.name}\n（${category.maxScore}分）`;
    categoryCell.font = { size: 10, bold: true, name: '微软雅黑' };
    categoryCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    categoryCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8DC' } };
  }

  // 总分行
  const totalRow = checkSheet.addRow(['总  分', '', '', '', '', '', '', '', '', inspection.total_score, '']);
  totalRow.height = 25;
  checkSheet.mergeCells(`A${rowNum}:G${rowNum}`);
  checkSheet.mergeCells(`H${rowNum}:I${rowNum}`);
  checkSheet.getCell(`A${rowNum}`).font = { size: 12, bold: true, name: '微软雅黑' };
  checkSheet.getCell(`A${rowNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
  checkSheet.getCell(`J${rowNum}`).font = { size: 14, bold: true, name: '微软雅黑', color: { argb: 'FFD4AF37' } };
  checkSheet.getCell(`J${rowNum}`).alignment = { horizontal: 'center', vertical: 'middle' };
  for (let col = 1; col <= 11; col++) {
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
    ? '优秀（90-100分）— 各项工作落实到位，无安全隐患和管理漏洞'
    : inspection.rating === '良好'
    ? '良好（70-89分）— 基本符合要求，存在部分需改进问题'
    : '较差（70分以下）— 存在重大安全隐患或严重管理问题，立即责令整改';
  
  const ratingRow = checkSheet.addRow([`评定：${ratingText}`]);
  checkSheet.mergeCells(`A${rowNum}:K${rowNum}`);
  ratingRow.getCell(1).font = { size: 10, name: '微软雅黑' };
  ratingRow.getCell(1).alignment = { vertical: 'middle' };
  rowNum++;

  // 问题统计行
  const problemItems = items?.filter(i => (i.actual_score ?? 0) < i.max_score) || [];
  const minorCount = problemItems.filter(i => i.max_score - (i.actual_score ?? 0) <= 1).length;
  const majorCount = problemItems.filter(i => i.max_score - (i.actual_score ?? 0) >= 3).length;
  const normalCount = problemItems.length - minorCount - majorCount;
  
  const statsRow = checkSheet.addRow([
    '问题统计', '', '', '', '',
    `轻微: ${minorCount}    一般: ${normalCount}    重大: ${majorCount}    问题总数: ${problemItems.length}`,
    '', '', '', '', ''
  ]);
  checkSheet.mergeCells(`A${rowNum}:B${rowNum}`);
  checkSheet.mergeCells(`C${rowNum}:K${rowNum}`);
  statsRow.getCell(1).font = { size: 10, bold: true, name: '微软雅黑' };
  statsRow.getCell(3).font = { size: 10, name: '微软雅黑' };
  rowNum++;

  // 签名行
  const signRow = checkSheet.addRow(['督导签名：', '', '', '', '门店负责人签名：', '', '', '', '', '', '']);
  signRow.height = 30;
  checkSheet.mergeCells(`A${rowNum}:D${rowNum}`);
  checkSheet.mergeCells(`E${rowNum}:K${rowNum}`);
  signRow.getCell(1).font = { size: 10, name: '微软雅黑' };
  signRow.getCell(5).font = { size: 10, name: '微软雅黑' };

  // ========== 工作表2：单店报表 ==========
  const reportSheet = workbook.addWorksheet('单店报表');

  // 设置列宽
  reportSheet.columns = [
    { width: 15 },  // A
    { width: 20 },  // B
    { width: 15 },  // C
    { width: 15 },  // D
    { width: 20 },  // E
    { width: 15 },  // F
  ];

  // 标题
  const reportTitle = reportSheet.addRow(['老凤祥督导巡店报表（单店）']);
  reportTitle.height = 30;
  reportSheet.mergeCells('A1:F1');
  reportTitle.getCell(1).font = { size: 16, bold: true, name: '微软雅黑' };
  reportTitle.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  reportTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };

  // 门店信息
  const reportInfo1 = reportSheet.addRow([
    '门店名称：', inspection.store_name, '', '区域&负责人：', `${region} ${responsible}`, ''
  ]);
  reportInfo1.height = 22;
  reportInfo1.getCell(1).font = { size: 10, bold: true, name: '微软雅黑' };
  reportInfo1.getCell(4).font = { size: 10, bold: true, name: '微软雅黑' };

  const reportInfo2 = reportSheet.addRow([
    '督导：', inspection.supervisor_name, '', '检查日期：', inspection.inspection_date, ''
  ]);
  reportInfo2.getCell(1).font = { size: 10, bold: true, name: '微软雅黑' };
  reportInfo2.getCell(4).font = { size: 10, bold: true, name: '微软雅黑' };

  const reportInfo3 = reportSheet.addRow([
    '巡查评分：', inspection.total_score, '', '问题总数：', problemItems.length, ''
  ]);
  reportInfo3.getCell(1).font = { size: 10, bold: true, name: '微软雅黑' };
  reportInfo3.getCell(2).font = { size: 12, bold: true, name: '微软雅黑', color: { argb: 'FFD4AF37' } };
  reportInfo3.getCell(4).font = { size: 10, bold: true, name: '微软雅黑' };

  const reportInfo4 = reportSheet.addRow([
    '评定：', ratingText, '', '', '', ''
  ]);
  reportSheet.mergeCells(`B${reportSheet.rowCount}:F${reportSheet.rowCount}`);
  reportInfo4.getCell(1).font = { size: 10, bold: true, name: '微软雅黑' };

  const reportInfo5 = reportSheet.addRow([
    `轻微问题: ${minorCount}项    一般问题: ${normalCount}项    重大问题: ${majorCount}项    扣分合计: ${100 - inspection.total_score}分`
  ]);
  reportSheet.mergeCells(`A${reportSheet.rowCount}:F${reportSheet.rowCount}`);
  reportInfo5.getCell(1).font = { size: 10, name: '微软雅黑' };
  reportInfo5.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8DC' } };

  // 空行
  reportSheet.addRow([]);

  // （一）核心工作摘要
  const section1Title = reportSheet.addRow(['（一）本次核心工作摘要']);
  reportSheet.mergeCells(`A${reportSheet.rowCount}:F${reportSheet.rowCount}`);
  section1Title.getCell(1).font = { size: 11, bold: true, name: '微软雅黑' };
  section1Title.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };

  // 从备注中提取工作亮点和其他情况
  const highlights = items?.filter(i => i.notes && i.notes.includes('亮点')).map(i => i.notes).join('\n') || '';
  const otherInfo = items?.filter(i => i.notes && !i.notes.includes('亮点')).map(i => i.notes).join('\n') || '';

  reportSheet.addRow(['工作亮点：']);
  reportSheet.mergeCells(`A${reportSheet.rowCount}:F${reportSheet.rowCount}`);
  const highlightRow = reportSheet.addRow([highlights || '']);
  reportSheet.mergeCells(`A${reportSheet.rowCount}:F${reportSheet.rowCount}`);
  highlightRow.getCell(1).alignment = { wrapText: true, vertical: 'top' };
  highlightRow.height = 40;

  reportSheet.addRow(['其他情况：']);
  reportSheet.mergeCells(`A${reportSheet.rowCount}:F${reportSheet.rowCount}`);
  const otherRow = reportSheet.addRow([otherInfo || '']);
  reportSheet.mergeCells(`A${reportSheet.rowCount}:F${reportSheet.rowCount}`);
  otherRow.getCell(1).alignment = { wrapText: true, vertical: 'top' };
  otherRow.height = 40;

  // 空行
  reportSheet.addRow([]);

  // （二）巡店检查问题清单
  const section2Title = reportSheet.addRow(['（二）巡店检查问题清单（自动从检查表提取）']);
  reportSheet.mergeCells(`A${reportSheet.rowCount}:F${reportSheet.rowCount}`);
  section2Title.getCell(1).font = { size: 11, bold: true, name: '微软雅黑' };
  section2Title.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };

  // 问题清单表头
  const problemHeader = reportSheet.addRow(['序号', '问题描述（对应检查项及记录）', '大类', '问题等级', '整改措施', '整改结果']);
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

  // 填充问题清单（所有35项，有问题的显示详情，无问题的留空）
  let problemNum = 1;
  for (const category of inspectionCategories) {
    for (const item of category.items) {
      const itemData = itemMap.get(item.itemNumber);
      const actualScore = itemData?.actual_score ?? item.maxScore;
      const deduction = item.maxScore - actualScore;
      
      if (deduction > 0 || (itemData?.notes && itemData.notes.trim())) {
        const level = deduction === 0 ? '轻微' : (deduction >= 3 ? '重大' : (deduction >= 2 ? '一般' : '轻微'));
        const row = reportSheet.addRow([
          problemNum++,
          itemData?.notes || `扣${deduction}分`,
          category.name,
          level,
          '',  // 整改措施（待填写）
          ''   // 整改结果（待填写）
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
        
        // 问题等级颜色
        const levelCell = row.getCell(4);
        if (level === '重大') {
          levelCell.font = { size: 10, name: '微软雅黑', color: { argb: 'FFFF0000' } };
        } else if (level === '一般') {
          levelCell.font = { size: 10, name: '微软雅黑', color: { argb: 'FFFF8C00' } };
        }
      }
    }
  }

  // 扣分合计行
  const totalDeductionRow = reportSheet.addRow(['扣分合计 / 整改完成率', '', '', `${100 - inspection.total_score}`, '—', '']);
  totalDeductionRow.height = 25;
  reportSheet.mergeCells(`A${reportSheet.rowCount}:C${reportSheet.rowCount}`);
  totalDeductionRow.getCell(1).font = { size: 10, bold: true, name: '微软雅黑' };
  totalDeductionRow.getCell(4).font = { size: 12, bold: true, name: '微软雅黑', color: { argb: 'FFFF0000' } };
  for (let col = 1; col <= 6; col++) {
    totalDeductionRow.getCell(col).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  }

  // 空行
  reportSheet.addRow([]);

  // （三）其他工作完成情况
  const section3Title = reportSheet.addRow(['（三）其他工作完成情况']);
  reportSheet.mergeCells(`A${reportSheet.rowCount}:F${reportSheet.rowCount}`);
  section3Title.getCell(1).font = { size: 11, bold: true, name: '微软雅黑' };
  section3Title.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };

  reportSheet.addRow(['□培训  □会议  □专项检查  □客诉处理  □其他：']);
  reportSheet.mergeCells(`A${reportSheet.rowCount}:F${reportSheet.rowCount}`);
  reportSheet.addRow(['']);
  reportSheet.mergeCells(`A${reportSheet.rowCount}:F${reportSheet.rowCount}`);
  reportSheet.addRow(['']);
  reportSheet.mergeCells(`A${reportSheet.rowCount}:F${reportSheet.rowCount}`);

  // 空行
  reportSheet.addRow([]);

  // （四）存在的困难与需公司协调事项
  const section4Title = reportSheet.addRow(['（四）存在的困难与需公司协调事项']);
  reportSheet.mergeCells(`A${reportSheet.rowCount}:F${reportSheet.rowCount}`);
  section4Title.getCell(1).font = { size: 11, bold: true, name: '微软雅黑' };
  section4Title.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };

  reportSheet.addRow(['']);
  reportSheet.mergeCells(`A${reportSheet.rowCount}:F${reportSheet.rowCount}`);
  reportSheet.addRow(['']);
  reportSheet.mergeCells(`A${reportSheet.rowCount}:F${reportSheet.rowCount}`);
  reportSheet.addRow(['']);
  reportSheet.mergeCells(`A${reportSheet.rowCount}:F${reportSheet.rowCount}`);

  // 备注
  reportSheet.addRow([]);
  const noteRow = reportSheet.addRow(['备注：本报表由「单店检查表」自动生成。问题描述、等级、扣分随检查表实时更新；整改措施和整改结果请手动填写。']);
  reportSheet.mergeCells(`A${reportSheet.rowCount}:F${reportSheet.rowCount}`);
  noteRow.getCell(1).font = { size: 9, italic: true, name: '微软雅黑', color: { argb: 'FF888888' } };

  // 生成Excel文件
  const buffer = await workbook.xlsx.writeBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  const fileName = `老凤祥单店督导检查表及报表（${inspection.store_name}）${inspection.inspection_date}.xlsx`;

  return NextResponse.json({
    success: true,
    data: {
      filename: fileName,
      content: base64,
    },
  });
}
