import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: reportId } = await params;
    const deviceFingerprint = request.headers.get('x-device-fingerprint');

    if (!deviceFingerprint || typeof deviceFingerprint !== 'string' || deviceFingerprint.trim() === '') {
      return NextResponse.json(
        { error: 'Device fingerprint header (x-device-fingerprint) is required' },
        { status: 400 }
      );
    }

    // Verify report exists and is not expired (TTL 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .gt('created_at', oneHourAgo)
      .maybeSingle();

    if (reportError) {
      console.error('Error fetching report:', reportError);
      return NextResponse.json({ error: 'Failed to verify report' }, { status: 500 });
    }

    if (!report) {
      return NextResponse.json(
        { error: 'Laporan tidak ditemukan atau sudah kadaluarsa (lebih dari 1 jam)' },
        { status: 404 }
      );
    }

    // Anti-Fraud: Check if this device has already confirmed this specific report
    const { data: existingConfirmation, error: confirmCheckError } = await supabase
      .from('confirmations')
      .select('id')
      .eq('report_id', reportId)
      .eq('device_fingerprint', deviceFingerprint)
      .maybeSingle();

    if (confirmCheckError) {
      console.error('Error checking confirmation existence:', confirmCheckError);
      return NextResponse.json({ error: 'Failed to verify duplicate validation' }, { status: 500 });
    }

    if (existingConfirmation) {
      return NextResponse.json(
        { error: 'Lu udah memvalidasi keakuratan data ini sebelumnya, bre.' },
        { status: 400 }
      );
    }

    // Insert confirmation record
    const { error: insertConfirmError } = await supabase
      .from('confirmations')
      .insert({
        report_id: reportId,
        device_fingerprint: deviceFingerprint,
      });

    if (insertConfirmError) {
      if (insertConfirmError.code === '23505') {
        return NextResponse.json(
          { error: 'Lu udah memvalidasi keakuratan data ini sebelumnya, bre.' },
          { status: 400 }
        );
      }
      console.error('Error inserting confirmation:', insertConfirmError);
      return NextResponse.json({ error: 'Failed to record confirmation' }, { status: 500 });
    }

    // Increment confirms_count on the report
    const { data: updatedReport, error: updateError } = await supabase
      .from('reports')
      .update({ confirms_count: report.confirms_count + 1 })
      .eq('id', reportId)
      .select()
      .single();

    if (updateError || !updatedReport) {
      console.error('Error updating report confirms count:', updateError);
      return NextResponse.json({ error: 'Failed to update validation count' }, { status: 500 });
    }

    // Map database snake_case columns back to camelCase for the client
    const returnedReport = {
      id: updatedReport.id,
      spbuId: updatedReport.spbu_id,
      queueStatus: updatedReport.queue_status,
      emptyBbm: updatedReport.empty_bbm,
      photoUrl: updatedReport.photo_url,
      qrisUrl: updatedReport.qris_url,
      deviceFingerprint: updatedReport.device_fingerprint,
      createdAt: updatedReport.created_at,
      confirmsCount: updatedReport.confirms_count,
    };

    return NextResponse.json(returnedReport, { status: 200 });
  } catch (error) {
    console.error('Error in POST /api/reports/[id]/confirm:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
