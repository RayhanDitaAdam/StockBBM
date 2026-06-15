import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// Haversine formula to calculate distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientLatStr = searchParams.get('lat');
    const clientLngStr = searchParams.get('lng');
    const clientFingerprint = request.headers.get('x-device-fingerprint');

    const db = await getDb();
    const { spbus, reports, confirmations } = db;

    const spbusWithStatus = spbus.map((spbu) => {
      // Find the latest active report for this SPBU
      const spbuReports = reports.filter((r) => r.spbuId === spbu.id);
      const latestReport =
        spbuReports.length > 0
          ? spbuReports.sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0]
          : null;

      // Calculate distance if client coordinates are provided
      let distanceKm: number | null = null;
      if (clientLatStr && clientLngStr) {
        const cLat = parseFloat(clientLatStr);
        const cLng = parseFloat(clientLngStr);
        if (!isNaN(cLat) && !isNaN(cLng)) {
          distanceKm = calculateDistance(cLat, cLng, spbu.lat, spbu.lng);
        }
      }

      let hasConfirmed = false;
      if (latestReport && clientFingerprint) {
        hasConfirmed = confirmations.some(
          (c) => c.reportId === latestReport.id && c.deviceFingerprint === clientFingerprint
        );
      }

      return {
        ...spbu,
        distanceKm: distanceKm !== null ? parseFloat(distanceKm.toFixed(2)) : null,
        activeReport: latestReport
          ? {
              ...latestReport,
              hasConfirmed,
            }
          : null,
      };
    });

    // Sort by distance if available, otherwise keep default order
    if (clientLatStr && clientLngStr) {
      spbusWithStatus.sort((a, b) => {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

    return NextResponse.json(spbusWithStatus, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/spbus:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
