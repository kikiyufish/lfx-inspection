// 老凤祥督导巡店检查表(2026版) - 检查项目数据
export interface InspectionCategory {
  id: string;
  name: string;
  maxScore: number;
  items: InspectionItem[];
}

export interface InspectionItem {
  itemNumber: number;
  category: string;
  description: string;
  maxScore: number;
}

export const inspectionCategories: InspectionCategory[] = [
  {
    id: "basic_management",
    name: "基础管理",
    maxScore: 20,
    items: [
      {
        itemNumber: 1,
        category: "基础管理",
        description: "员工仪表仪容规范，佩戴统一工号牌，精神面貌良好，所有员工健康证在有效期内，无缺失或过期",
        maxScore: 5,
      },
      {
        itemNumber: 2,
        category: "基础管理",
        description: "招呼，举止得当，礼貌诚信，一人一客一物，接待顾客微笑耐心回答，规范使用托盘、手套、放大镜等",
        maxScore: 5,
      },
      {
        itemNumber: 3,
        category: "基础管理",
        description: "每月职工安全生产记录卡按时填写",
        maxScore: 3,
      },
      {
        itemNumber: 4,
        category: "基础管理",
        description: "营业准备工作到位，柜台整洁，无私人物品摆放",
        maxScore: 2,
      },
      {
        itemNumber: 5,
        category: "基础管理",
        description: "公司安排的各类培训、新品推广及其他工作按要求完成",
        maxScore: 5,
      },
    ],
  },
  {
    id: "environment_facilities",
    name: "环境与设施",
    maxScore: 10,
    items: [
      {
        itemNumber: 6,
        category: "环境与设施",
        description: "店铺环境整洁，营业区域无杂物、无卫生死角",
        maxScore: 2,
      },
      {
        itemNumber: 7,
        category: "环境与设施",
        description: "售货环境清洁、明亮、通风，温度保持在16℃-26℃",
        maxScore: 2,
      },
      {
        itemNumber: 8,
        category: "环境与设施",
        description: "电子天平校准正常，水平仪气泡在正中间",
        maxScore: 3,
      },
      {
        itemNumber: 9,
        category: "环境与设施",
        description: "服务公约、当日金价、维修价目表按规定上墙公示，大额现金登记告知需公示",
        maxScore: 3,
      },
    ],
  },
  {
    id: "product_management",
    name: "货品管理",
    maxScore: 30,
    items: [
      {
        itemNumber: 10,
        category: "货品管理",
        description: "产品标签按规定串绳，陈列整齐美观",
        maxScore: 2,
      },
      {
        itemNumber: 11,
        category: "货品管理",
        description: "商品印记、吊牌、证书与产品相符",
        maxScore: 3,
      },
      {
        itemNumber: 12,
        category: "货品管理",
        description: "所有商品使用专用道具，做好防护措施（台面与库存）",
        maxScore: 2,
      },
      {
        itemNumber: 13,
        category: "货品管理",
        description: "每日库存记录本规范填写，台账准确，早、晚各确认签名，两班交接签名一次",
        maxScore: 4,
      },
      {
        itemNumber: 14,
        category: "货品管理",
        description: "商品抽查任务表按时填写，已抽查一盘货品（双人双签）",
        maxScore: 3,
      },
      {
        itemNumber: 15,
        category: "货品管理",
        description: "产品进出库记录（双人双签）、进销存月报表、收付存月报表完整",
        maxScore: 4,
      },
      {
        itemNumber: 16,
        category: "货品管理",
        description: "截料、旧金登记规范，添金调换服务流程规范",
        maxScore: 4,
      },
      {
        itemNumber: 17,
        category: "货品管理",
        description: "所有销售折扣优惠需公示",
        maxScore: 2,
      },
      {
        itemNumber: 18,
        category: "货品管理",
        description: "黄金类赠品做好表格登记",
        maxScore: 2,
      },
      {
        itemNumber: 19,
        category: "货品管理",
        description: "商品检验报告齐全，吊牌有成色记录",
        maxScore: 2,
      },
      {
        itemNumber: 20,
        category: "货品管理",
        description: "无不合格商品上柜",
        maxScore: 2,
      },
    ],
  },
  {
    id: "safety_management",
    name: "安全管理",
    maxScore: 20,
    items: [
      {
        itemNumber: 21,
        category: "安全管理",
        description: "灭火器能正常使用，在有效期内，每月有检查签字",
        maxScore: 3,
      },
      {
        itemNumber: 22,
        category: "安全管理",
        description: "消防器材存放无杂物、整洁，员工知晓\u201C四防\u201D应急操作",
        maxScore: 3,
      },
      {
        itemNumber: 23,
        category: "安全管理",
        description: "保险柜开库关闭后及时锁好并打乱密码",
        maxScore: 5,
      },
      {
        itemNumber: 24,
        category: "安全管理",
        description: "所有商品存放于专用保险柜，实行双人双锁管理（签字表）",
        maxScore: 5,
      },
      {
        itemNumber: 25,
        category: "安全管理",
        description: "红外线报警系统正常并与110联网",
        maxScore: 2,
      },
      {
        itemNumber: 26,
        category: "安全管理",
        description: "监控设备正常运行，录像保留不少于30日",
        maxScore: 2,
      },
    ],
  },
  {
    id: "financial_management",
    name: "财务管理",
    maxScore: 10,
    items: [
      {
        itemNumber: 27,
        category: "财务管理",
        description: "每日（下限1000元）按时解款，上交解款凭证",
        maxScore: 2,
      },
      {
        itemNumber: 28,
        category: "财务管理",
        description: "无坐支现金、私设小金库情况",
        maxScore: 3,
      },
      {
        itemNumber: 29,
        category: "财务管理",
        description: "销售凭证规范，发票联和财务记账联加盖\u201C印记、已复秤\u201D印章，顾客和营业员双签",
        maxScore: 3,
      },
      {
        itemNumber: 30,
        category: "财务管理",
        description: "每日销售与资金数据核对一致",
        maxScore: 2,
      },
    ],
  },
  {
    id: "service_aftersales",
    name: "服务与售后",
    maxScore: 10,
    items: [
      {
        itemNumber: 31,
        category: "服务与售后",
        description: "店铺营业日记规范填写，做好重要事项记录，交接班内容填写清晰",
        maxScore: 2,
      },
      {
        itemNumber: 32,
        category: "服务与售后",
        description: "企业微信内任务应及时完成",
        maxScore: 2,
      },
      {
        itemNumber: 33,
        category: "服务与售后",
        description: "修理、售后登记完整，《售后服务处理表》规范填写并上传",
        maxScore: 2,
      },
      {
        itemNumber: 34,
        category: "服务与售后",
        description: "顾客财产（定制、修理首饰）识别、验证、保护到位",
        maxScore: 2,
      },
      {
        itemNumber: 35,
        category: "服务与售后",
        description: "顾客意见薄放置到位，投诉处理及时闭环",
        maxScore: 2,
      },
    ],
  },
];

// 获取所有检查项的扁平列表
export function getAllItems(): InspectionItem[] {
  return inspectionCategories.flatMap((cat) => cat.items);
}

// 获取评级信息
export function getRatingInfo(score: number): { label: string; color: string; description: string } {
  if (score >= 90) {
    return {
      label: "优秀",
      color: "#10b981",
      description: "各项工作落实到位，无安全隐患和管理漏洞",
    };
  } else if (score >= 70) {
    return {
      label: "良好",
      color: "#f59e0b",
      description: "基本符合要求，存在部分需改进问题",
    };
  } else {
    return {
      label: "较差",
      color: "#ef4444",
      description: "存在重大安全隐患或严重管理问题，立即责令整改",
    };
  }
}
