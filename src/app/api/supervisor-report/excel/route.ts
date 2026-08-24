import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { inspectionCategories } from '@/lib/inspection-data';

export const dynamic = 'force-dynamic';

// 35 个检查项的完整描述（含分值）
const ITEM_DESCRIPTIONS = [
  '员工仪表仪容规范，佩戴统一工号牌，精神面貌良好，所有员工健康证在有效期内，无缺失或过期\n（5分）',
  '一人一客一物，接待顾客微笑招呼，举止得当，礼貌诚信，耐心回答，规范使用托盘、手套、放大镜等\n（5分）',
  '每月职工安全生产记录卡按时填写\n（3分）',
  '营业准备工作到位，柜台整洁，无私人物品摆放\n（2分）',
  '公司安排的各类培训、新品推广及其他工作按要求完成\n（5分）',
  '店铺环境整洁，营业区域无杂物、无卫生死角\n（2分）',
  '售货环境清洁、明亮、通风，温度保持在16℃-26℃\n（2分）',
  '电子天平校准正常，水平仪气泡在正中间\n（3分）',
  '服务公约、当日金价、维修价目表按规定上墙公示，大额现金登记告知需公示\n（3分）',
  '产品标签按规定串绳，陈列整齐美观\n（2分）',
  '商品印记、吊牌、证书与产品相符\n（3分）',
  '所有商品使用专用道具，做好防护措施(台面与库存)\n（2分）',
  '每日库存记录本规范填写，台账准确，早、晚各确认签名，两班交接签名一次\n（4分）',
  '商品抽查任务表按时填写，已抽查一盘货品(双人双签)\n（3分）',
  '产品进出库记录(双人双签)、进销存月报表、收付存月报表完整\n（4分）',
  '截料、旧金登记规范，添金调换服务流程规范\n（4分）',
  '所有销售折扣优惠需公示\n（2分）',
  '黄金类赠品做好表格登记\n（2分）',
  '商品检验报告齐全，吊牌有成色记录\n（2分）',
  '无不合格商品上柜\n（2分）',
  '灭火器能正常使用，在有效期内，每月有检查签字\n（3分）',
  '消防器材存放无杂物、整洁，员工知晓"四防"应急操作\n（3分）',
  '保险柜开库关闭后及时锁好并打乱密码\n（5分）',
  '所有商品存放于专用保险柜，实行双人双锁管理(签字表)\n（5分）',
  '红外线报警系统正常并与110联网\n（2分）',
  '监控设备正常运行，录像保留不少于30日\n（2分）',
  '每日(下限1000元)按时解款，上交解款凭证\n（2分）',
  '无坐支现金、私设小金库情况\n（3分）',
  '销售凭证规范，发票联和财务记账联加盖"印记、已复秤"印章，顾客和营业员双签\n（3分）',
  '每日销售与资金数据核对一致\n（2分）',
  '店铺营业日记规范填写，做好重要事项记录，交接班内容填写清晰\n（2分）',
  '企业微信内任务应及时完成\n（2分）',
  '修理、售后登记完整，《售后服务处理表》规范填写并上传\n（2分）',
  '顾客财产(定制、修理首饰)识别、验证、保护到位\n（2分）',
  '顾客意见薄放置到位，投诉处理及时闭环\n（2分）',
];

// 6 个大类及其列范围（G=7 开始）
const CATEGORY_RANGES = [
  { name: '一、基础管理（20分）', startCol: 7, endCol: 11 },   // G-K (items 1-5)
  { name: '二、环境与设施（10分）', startCol: 12, endCol: 15 },  // L-O (items 6-9)
  { name: '三、货品管理（30分）', startCol: 16, endCol: 26 },    // P-Z (items 10-20)
  { name: '四、安全管理（20分）', startCol: 27, endCol: 32 },    // AA-AF (items 21-26)
  { name: '五、财务管理（10分）', startCol: 33, endCol: 36 },    // AG-AJ (items 27-30)
  { name: '六、服务与售后（10分）', startCol: 37, endCol: 41 },  // AK-AO (items 31-35)
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    // 查询近N天的所有检查记录
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data: inspections, error } = await getSupabaseClient()
      .from('inspections')
      .select('*')
      .gte('inspection_date', cutoffDate.toISOString().split('T')[0])
      .order('inspection_date', { ascending: false });

    if (error) throw error;

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('督导评分记录');

    // 列定义：A=区域, B=编号, C=店铺名, D=责任人, E=日期, F=得分, G-AO=35个检查项
    const columns: Partial<ExcelJS.Column>[] = [
      { header: '', key: 'region', width: 18 },    // A
      { header: '', key: 'num', width: 6 },         // B
      { header: '', key: 'store', width: 22 },      // C
      { header: '', key: 'responsible', width: 10 },// D
      { header: '', key: 'date', width: 14 },       // E
      { header: '', key: 'score', width: 8 },       // F
    ];
    // G-AO: 35个检查项列
    for (let i = 0; i < 35; i++) {
      columns.push({ header: '', key: `item${i + 1}`, width: 18 });
    }
    ws.columns = columns;

    // Row 1: 分类标题（合并单元格）
    ws.getCell('C1').value = '督导项目';
    ws.getCell('C1').font = { bold: true, size: 12 };
    ws.getCell('C1').alignment = { horizontal: 'center', vertical: 'middle' };

    CATEGORY_RANGES.forEach((cat) => {
      const startCol = cat.startCol;
      const endCol = cat.endCol;
      const cell = ws.getCell(1, startCol);
      cell.value = cat.name;
      cell.font = { bold: true, size: 11, color: { argb: 'FFC00000' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF2CC' },
      };
      if (endCol > startCol) {
        ws.mergeCells(1, startCol, 1, endCol);
      }
    });

    // Row 2: 编号行
    ws.getCell('C2').value = '编号';
    ws.getCell('C2').font = { bold: true };
    ws.getCell('C2').alignment = { horizontal: 'center', vertical: 'middle' };
    for (let i = 0; i < 35; i++) {
      const col = 7 + i;
      const cell = ws.getCell(2, col);
      cell.value = i + 1;
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Row 3: 具体评分项内容及分值
    ws.getCell('C3').value = '具体评分项内容及分值';
    ws.getCell('C3').font = { bold: true };
    ws.getCell('C3').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    for (let i = 0; i < 35; i++) {
      const col = 7 + i;
      const cell = ws.getCell(3, col);
      cell.value = ITEM_DESCRIPTIONS[i];
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.font = { size: 9 };
    }
    ws.getRow(3).height = 60;

    // Row 4: 表头（店铺名、责任人、日期、得分）
    const headerRow = ws.getRow(4);
    const headerLabels = ['', '', '店铺名', '责任人', '日期', '得分'];
    headerLabels.forEach((label, idx) => {
      if (label) {
        const cell = headerRow.getCell(idx);
        cell.value = label;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFC00000' },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });

    // 数据行
    let rowNum = 5;
    let num = 1;
    for (const insp of inspections || []) {
      const items = insp.items || [];

      // A列：区域
      ws.getCell(rowNum, 1).value = insp.region || '';
      // B列：编号
      ws.getCell(rowNum, 2).value = num;
      ws.getCell(rowNum, 2).alignment = { horizontal: 'center' };
      // C列：店铺名
      ws.getCell(rowNum, 3).value = insp.store_name || '';
      // D列：责任人
      ws.getCell(rowNum, 4).value = insp.responsible_person || '';
      // E列：日期
      ws.getCell(rowNum, 5).value = insp.inspection_date || '';
      // F列：得分（红色）
      const scoreCell = ws.getCell(rowNum, 6);
      scoreCell.value = insp.total_score;
      scoreCell.font = { color: { argb: 'FFFF0000' } };
      scoreCell.alignment = { horizontal: 'center' };

      // G-AO列：35个检查项的扣分记录
      for (let i = 0; i < 35; i++) {
        const item = items.find((it: any) => it.itemNumber === i + 1);
        const col = 7 + i;
        if (item && item.deduction > 0) {
          const noteText = item.notes
            ? `${item.notes}-${item.deduction}`
            : `-${item.deduction}`;
          const cell = ws.getCell(rowNum, col);
          cell.value = noteText;
          cell.font = { color: { argb: 'FFFF0000' }, size: 9 };
          cell.alignment = { wrapText: true, vertical: 'middle' };
        }
      }

      rowNum++;
      num++;
    }

    // 冻结窗口：冻结前6列（A-F）和前4行
    ws.views = [{ state: 'frozen', xSplit: 6, ySplit: 4 }];

    // 生成 Buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return NextResponse.json({
      success: true,
      filename: `督导评分记录_${new Date().toISOString().split('T')[0]}.xlsx`,
      data: base64,
    });
  } catch (error: any) {
    console.error('生成督导评分记录失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
