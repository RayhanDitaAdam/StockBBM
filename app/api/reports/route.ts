import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const deviceFingerprint = request.headers.get('x-device-fingerprint');
    
    if (!deviceFingerprint || typeof deviceFingerprint !== 'string' || deviceFingerprint.trim() === '') {
      return NextResponse.json(
        { error: 'Device fingerprint header (x-device-fingerprint) is required for stateless security' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { spbuId, queueStatus, emptyBbm, photoUrl, qrisUrl } = body;

    // Basic Validation
    if (!spbuId || typeof spbuId !== 'string') {
      return NextResponse.json({ error: 'SPBU ID is required' }, { status: 400 });
    }

    if (!queueStatus || !['red', 'yellow', 'green'].includes(queueStatus)) {
      return NextResponse.json({ error: 'Queue status must be red, yellow, or green' }, { status: 400 });
    }

    // Verify SPBU exists in Supabase
    const { data: spbu, error: spbuError } = await supabase
      .from('spbus')
      .select('id')
      .eq('id', spbuId)
      .maybeSingle();

    if (spbuError) {
      console.error('Error checking SPBU existence:', spbuError);
      return NextResponse.json({ error: 'Failed to verify SPBU' }, { status: 500 });
    }

    if (!spbu) {
      return NextResponse.json({ error: 'SPBU not found' }, { status: 404 });
    }

    // Anti-Fraud: Rate limiting check (1 report per SPBU per device every 30 minutes)
    const THIRTY_MINUTES_MS = 30 * 60 * 1000;
    const now = Date.now();
    const thirtyMinutesAgo = new Date(now - THIRTY_MINUTES_MS).toISOString();

    const { data: recentReports, error: recentError } = await supabase
      .from('reports')
      .select('created_at')
      .eq('spbu_id', spbuId)
      .eq('device_fingerprint', deviceFingerprint)
      .gt('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false });

    if (recentError) {
      console.error('Error checking recent reports:', recentError);
      return NextResponse.json({ error: 'Failed to check report rate limiting' }, { status: 500 });
    }

    if (recentReports && recentReports.length > 0) {
      const recentReport = recentReports[0];
      const timeDiff = now - new Date(recentReport.created_at).getTime();
      const minutesLeft = Math.ceil((THIRTY_MINUTES_MS - timeDiff) / (60 * 1000));
      return NextResponse.json(
        { error: `Lu baru aja ngirim laporan buat SPBU ini. Tunggu ${minutesLeft} menit lagi bre.` },
        { status: 429 }
      );
    }

    // Create report in Supabase
    const { data: newReport, error: insertError } = await supabase
      .from('reports')
      .insert({
        spbu_id: spbuId,
        queue_status: queueStatus,
        empty_bbm: Array.isArray(emptyBbm) ? emptyBbm : [],
        photo_url: photoUrl || '',
        qris_url: qrisUrl || '',
        device_fingerprint: deviceFingerprint,
      })
      .select()
      .single();

    if (insertError || !newReport) {
      console.error('Error inserting report:', insertError);
      return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
    }

    // Map database snake_case columns back to camelCase for the client
    const returnedReport = {
      id: newReport.id,
      spbuId: newReport.spbu_id,
      queueStatus: newReport.queue_status,
      emptyBbm: newReport.empty_bbm,
      photoUrl: newReport.photo_url,
      qrisUrl: newReport.qris_url,
      deviceFingerprint: newReport.device_fingerprint,
      createdAt: newReport.created_at,
      confirmsCount: newReport.confirms_count,
    };

    return NextResponse.json(returnedReport, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/reports:', error);
    return NextResponse.json(
      { error: 'Invalid request body or Internal Server Error' },
      { status: 500 }
    );
  }
}
