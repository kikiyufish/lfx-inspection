import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, AlignmentType, BorderStyle, HeadingLevel,
  TableLayoutType, VerticalAlign, ShadingType,
} from 'docx';
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
      .eq('id', id)
      .single();

    if (error || !inspection) {
      return NextResponse.json({ error: '检查记录不存在' }, { status: 404 });
    }

    // 获取检查项
    const { data: items } = await supabase
      .from('inspection_items')
      .select('*')
      .eq('inspection_id', id)
      .order('item_number', { ascending: true });

    const allItems = items || [];

    // 筛选问题项：扣分或有备注
    const problemItems = allItems.filter(
      (item: { actual_score: number; max_score: number; notes: string | null }) =>
        item.actual_score < item.max_score || (item.notes && item.notes.trim())
    );

    // 按分类统计
    const categoryStats: Record<string, { count: number; deduction: number }> = {};
    for (const cat of inspectionCategories) {
      categoryStats[cat.name] = { count: 0, deduction: 0 };
    }
    for (const item of problemItems) {
      if (categoryStats[item.category]) {
        categoryStats[item.category].count++;
        categoryStats[item.category].deduction += item.max_score - item.actual_score;
      }
    }

    // 格式化日期
    const dateStr = inspection.inspection_date
      ? new Date(inspection.inspection_date).toLocaleDateString('zh-CN')
      : new Date().toLocaleDateString('zh-CN');

    // 生成问题表格数据
    const problemRows = problemItems.map((item: {
      item_number: number;
      category: string;
      description: string;
      max_score: number;
      actual_score: number;
      notes: string | null;
    }, idx: number) => {
      const deduction = item.max_score - item.actual_score;
      // 找到对应的检查大类编号
      const catIndex = inspectionCategories.findIndex((c: { name: string }) => c.name === item.category);
      const catCode = catIndex >= 0 ? ['一', '二', '三', '四', '五', '六'][catIndex] : '';
      const problemDesc = `${catCode}/${item.item_number} ${item.description}`;
      const level = deduction >= 3 ? '一般' : '轻微';
      const note = item.notes && item.notes.trim() ? item.notes : `扣${deduction}分，需整改`;

      return {
        seq: idx + 1,
        desc: problemDesc,
        level,
        deduction,
        measure: note,
        result: '',
      };
    });

    const totalDeduction = problemItems.reduce(
      (sum: number, item: { max_score: number; actual_score: number }) =>
        sum + (item.max_score - item.actual_score), 0
    );

    // 创建Word文档
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: '宋体', size: 24 }, // 12pt
          },
        },
      },
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children: [
          // 标题
          new Paragraph({
            children: [
              new TextRun({
                text: '老凤祥督导巡店报表（单店）',
                bold: true,
                size: 36, // 18pt
                font: '黑体',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
          }),

          // 报告周期和督导签名
          new Paragraph({
            children: [
              new TextRun({ text: `报告周期：${dateStr}  督导签名：___________`, size: 24 }),
            ],
            spacing: { after: 300 },
          }),

          // （一）核心工作摘要
          new Paragraph({
            children: [
              new TextRun({ text: '（一）本次核心工作摘要', bold: true, size: 24 }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `门店名称：${inspection.store_name || ''}  责任人：________ 巡查评分：${inspection.total_score || 0}分，问题发现：${problemItems.length}项，整改情况：□已完成 □未完成`,
                size: 24,
              }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({ text: '其他情况：___________________________________________________________', size: 24 }),
            ],
            spacing: { after: 300 },
          }),

          // （二）巡店检查工作开展详情
          new Paragraph({
            children: [
              new TextRun({ text: '（二）巡店检查工作开展详情', bold: true, size: 24 }),
            ],
            spacing: { after: 200 },
          }),

          // 问题表格
          createProblemTable(problemRows, totalDeduction),

          // 空行
          new Paragraph({ children: [], spacing: { after: 200 } }),

          // （三）其他工作完成情况
          new Paragraph({
            children: [
              new TextRun({ text: '（三）其他工作完成情况', bold: true, size: 24 }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({ text: '□培训  □会议  □专项检查  □客诉处理  □其他：___________', size: 24 }),
            ],
            spacing: { after: 100 },
          }),

          new Paragraph({
            children: [
              new TextRun({ text: '详情：___________________________________________________________', size: 24 }),
            ],
            spacing: { after: 300 },
          }),

          // （四）存在的困难与需公司协调事项
          new Paragraph({
            children: [
              new TextRun({ text: '（四）存在的困难与需公司协调事项', bold: true, size: 24 }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({ text: '___________________________________________________________', size: 24 }),
            ],
            spacing: { after: 300 },
          }),

          // 附件说明
          new Paragraph({
            children: [
              new TextRun({ text: '检查表评分及相关照片见附件', size: 24, italics: true }),
            ],
            spacing: { after: 200 },
          }),
        ],
      }],
    });

    // 生成文档
    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(`老凤祥督导巡店报表（${inspection.store_name || '门店'}）.docx`)}"`,
      },
    });
  } catch (error) {
    console.error('生成报告失败:', error);
    return NextResponse.json({ error: '生成报告失败' }, { status: 500 });
  }
}

// 创建问题表格
function createProblemTable(
  rows: Array<{ seq: number; desc: string; level: string; deduction: number; measure: string; result: string }>,
  totalDeduction: number
) {
  const borderStyle = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: '000000',
  };
  const borders = {
    top: borderStyle,
    bottom: borderStyle,
    left: borderStyle,
    right: borderStyle,
  };

  // 表头
  const headerRow = new TableRow({
    children: ['序号', '问题描述（对应检查表大类编号）', '问题等级', '扣分值', '整改措施', '整改结果'].map(text =>
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text, bold: true, size: 20, font: '宋体' })],
          alignment: AlignmentType.CENTER,
        })],
        borders,
        verticalAlign: VerticalAlign.CENTER,
        shading: { type: ShadingType.SOLID, color: 'D9E2F3' },
      })
    ),
  });

  // 数据行
  const dataRows = rows.map(row =>
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(row.seq), size: 20 })], alignment: AlignmentType.CENTER })],
          borders,
          verticalAlign: VerticalAlign.CENTER,
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: row.desc, size: 20 })] })],
          borders,
          verticalAlign: VerticalAlign.CENTER,
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: row.level, size: 20 })], alignment: AlignmentType.CENTER })],
          borders,
          verticalAlign: VerticalAlign.CENTER,
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: `-${row.deduction}`, size: 20, color: 'CC0000' })], alignment: AlignmentType.CENTER })],
          borders,
          verticalAlign: VerticalAlign.CENTER,
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: row.measure, size: 20 })] })],
          borders,
          verticalAlign: VerticalAlign.CENTER,
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: row.result, size: 20 })] })],
          borders,
          verticalAlign: VerticalAlign.CENTER,
        }),
      ],
    })
  );

  // 汇总行
  const summaryRow = new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: '扣分统计', bold: true, size: 20 })], alignment: AlignmentType.CENTER })],
        borders,
        columnSpan: 3,
        shading: { type: ShadingType.SOLID, color: 'F2F2F2' },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: `-${totalDeduction}`, bold: true, size: 20, color: 'CC0000' })], alignment: AlignmentType.CENTER })],
        borders,
        shading: { type: ShadingType.SOLID, color: 'F2F2F2' },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: '整改完成率', bold: true, size: 20 })], alignment: AlignmentType.CENTER })],
        borders,
        shading: { type: ShadingType.SOLID, color: 'F2F2F2' },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: '', size: 20 })] })],
        borders,
        shading: { type: ShadingType.SOLID, color: 'F2F2F2' },
      }),
    ],
  });

  return new Table({
    rows: [headerRow, ...dataRows, summaryRow],
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
  });
}
