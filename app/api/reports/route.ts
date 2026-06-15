import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb, Report } from '@/lib/db';

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

    const db = await getDb();
    const { spbus, reports } = db;

    // Verify SPBU exists
    const spbuExists = spbus.some(s => s.id === spbuId);
    if (!spbuExists) {
      return NextResponse.json({ error: 'SPBU not found' }, { status: 404 });
    }

    // Anti-Fraud: Rate limiting check (1 report per SPBU per device every 30 minutes)
    const THIRTY_MINUTES_MS = 30 * 60 * 1000;
    const now = new Date().getTime();
    
    const recentReport = reports.find(
      r => r.spbuId === spbuId && 
           r.deviceFingerprint === deviceFingerprint &&
           (now - new Date(r.createdAt).getTime()) < THIRTY_MINUTES_MS
    );

    if (recentReport) {
      const minutesLeft = Math.ceil(
        (THIRTY_MINUTES_MS - (now - new Date(recentReport.createdAt).getTime())) / (60 * 1000)
      );
      return NextResponse.json(
        { error: `Anda baru saja mengirimkan laporan untuk SPBU ini. Silakan tunggu ${minutesLeft} menit lagi` },
        { status: 429 }
      );
    }

    // Create report
    const newReport: Report = {
      id: crypto.randomUUID(),
      spbuId,
      queueStatus,
      emptyBbm: Array.isArray(emptyBbm) ? emptyBbm : [],
      photoUrl: photoUrl || '',
      qrisUrl: qrisUrl || '',
      deviceFingerprint,
      createdAt: new Date().toISOString(),
      confirmsCount: 0,
    };

    db.reports.push(newReport);
    await saveDb(db);

    return NextResponse.json(newReport, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/reports:', error);
    return NextResponse.json(
      { error: 'Invalid request body or Internal Server Error' },
      { status: 500 }
    );
  }
}
