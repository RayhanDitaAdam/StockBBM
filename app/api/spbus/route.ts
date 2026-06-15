import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

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

    // Fetch SPBUs from Supabase
    const { data: spbus, error: spbusError } = await supabase
      .from('spbus')
      .select('*');

    if (spbusError || !spbus) {
      console.error('Error fetching SPBUs:', spbusError);
      return NextResponse.json({ error: 'Failed to fetch SPBUs' }, { status: 500 });
    }

    // Fetch reports created in the last 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select('*')
      .gt('created_at', oneHourAgo);

    if (reportsError || !reports) {
      console.error('Error fetching reports:', reportsError);
      return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }

    // Fetch confirmations for current user if clientFingerprint is provided
    let confirmedReportIds = new Set<string>();
    if (clientFingerprint) {
      const { data: confirmations, error: confirmationsError } = await supabase
        .from('confirmations')
        .select('report_id')
        .eq('device_fingerprint', clientFingerprint);

      if (confirmationsError) {
        console.error('Error fetching confirmations:', confirmationsError);
      } else if (confirmations) {
        confirmations.forEach((c) => {
          if (c.report_id) {
            confirmedReportIds.add(c.report_id);
          }
        });
      }
    }

    const spbusWithStatus = spbus.map((spbu) => {
      // Find the latest active report for this SPBU
      const spbuReports = reports.filter((r) => r.spbu_id === spbu.id);
      const latestReport =
        spbuReports.length > 0
          ? spbuReports.sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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

      const hasConfirmed = latestReport ? confirmedReportIds.has(latestReport.id) : false;

      return {
        id: spbu.id,
        name: spbu.name,
        brand: spbu.brand,
        address: spbu.address,
        lat: spbu.lat,
        lng: spbu.lng,
        distanceKm: distanceKm !== null ? parseFloat(distanceKm.toFixed(2)) : null,
        activeReport: latestReport
          ? {
              id: latestReport.id,
              spbuId: latestReport.spbu_id,
              queueStatus: latestReport.queue_status,
              emptyBbm: latestReport.empty_bbm || [],
              photoUrl: latestReport.photo_url || '',
              qrisUrl: latestReport.qris_url || '',
              deviceFingerprint: latestReport.device_fingerprint,
              createdAt: latestReport.created_at,
              confirmsCount: latestReport.confirms_count,
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
