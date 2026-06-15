import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb, Confirmation } from '@/lib/db';

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

    const db = await getDb();
    const { reports, confirmations } = db;

    // Find the target report
    const reportIndex = reports.findIndex((r) => r.id === reportId);
    if (reportIndex === -1) {
      return NextResponse.json(
        { error: 'Laporan tidak ditemukan atau sudah kadaluarsa (lebih dari 1 jam)' },
        { status: 404 }
      );
    }

    // Anti-Fraud: Check if this device has already confirmed this specific report
    const alreadyConfirmed = confirmations.some(
      (c) => c.reportId === reportId && c.deviceFingerprint === deviceFingerprint
    );

    if (alreadyConfirmed) {
      return NextResponse.json(
        { error: 'Anda sudah melakukan validasi keakuratan untuk laporan ini sebelumnya' },
        { status: 400 }
      );
    }

    // Add confirmation track
    const newConfirmation: Confirmation = {
      reportId,
      deviceFingerprint,
      createdAt: new Date().toISOString(),
    };

    db.confirmations.push(newConfirmation);
    
    // Increment confirmsCount on the report
    db.reports[reportIndex].confirmsCount += 1;
    
    await saveDb(db);

    return NextResponse.json(db.reports[reportIndex], { status: 200 });
  } catch (error) {
    console.error('Error in POST /api/reports/[id]/confirm:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
