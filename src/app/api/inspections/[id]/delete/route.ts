import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { validateToken } from '@/lib/admin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员身份
    const token = request.cookies.get('admin_token')?.value;
    if (!token || !validateToken(token)) {
      return NextResponse.json(
        { error: '未授权，请先登录管理员账号' },
        { status: 401 }
      );
    }

    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: '无效的记录ID' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 先删除关联的检查项
    const { error: itemsError } = await supabase
      .from('inspection_items')
      .delete()
      .eq('inspection_id', id);

    if (itemsError) {
      console.error('Failed to delete inspection items:', itemsError);
      return NextResponse.json(
        { error: '删除检查项失败' },
        { status: 500 }
      );
    }

    // 删除检查记录
    const { error: inspectionError } = await supabase
      .from('inspections')
      .delete()
      .eq('id', id);

    if (inspectionError) {
      console.error('Failed to delete inspection:', inspectionError);
      return NextResponse.json(
        { error: '删除检查记录失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('Delete inspection error:', error);
    return NextResponse.json(
      { error: '删除失败，请稍后重试' },
      { status: 500 }
    );
  }
}
