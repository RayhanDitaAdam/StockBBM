'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useColorScheme } from '@mui/joy/styles';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormLabel,
  IconButton,
  Input,
  Modal,
  ModalClose,
  ModalDialog,
  Option,
  Radio,
  RadioGroup,
  Select,
  Sheet,
  Stack,
  Typography,
  Checkbox
} from '@mui/joy';
import {
  FaGasPump,
  FaMapMarkerAlt,
  FaCheck,
  FaThumbsUp,
  FaShieldAlt,
  FaSync,
  FaSatellite,
  FaImage,
  FaQrcode,
  FaPaperPlane,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaArrowLeft,
  FaSun,
  FaMoon,
  FaCompass,
  FaTimesCircle,
  FaMap,
  FaPen
} from 'react-icons/fa';

// Dynamically import Leaflet Map Component (Disables SSR for window safety)
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 350 }}>
      <CircularProgress />
      <Typography level="body-sm" sx={{ ml: 2 }} color="neutral">Memuat Peta...</Typography>
    </Box>
  )
});

interface SPBU {
  id: string;
  name: string;
  brand: 'Pertamina' | 'Shell' | 'BP' | 'Vivo';
  address: string;
  lat: number;
  lng: number;
  distanceKm: number | null;
  activeReport: {
    id: string;
    queueStatus: 'red' | 'yellow' | 'green';
    emptyBbm: string[];
    photoUrl: string;
    qrisUrl: string;
    createdAt: string;
    confirmsCount: number;
    deviceFingerprint: string;
    hasConfirmed?: boolean;
  } | null;
}

// Default base64 SVG mock values for easy local testing
const MOCK_QRIS_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 100 100"><rect width="100" height="100" fill="white"/><rect x="10" y="10" width="30" height="30" fill="black"/><rect x="15" y="15" width="20" height="20" fill="white"/><rect x="60" y="10" width="30" height="30" fill="black"/><rect x="65" y="15" width="20" height="20" fill="white"/><rect x="10" y="60" width="30" height="30" fill="black"/><rect x="15" y="65" width="20" height="20" fill="white"/><rect x="42" y="42" width="16" height="16" fill="black"/><rect x="47" y="47" width="6" height="6" fill="white"/><rect x="75" y="75" width="15" height="15" fill="black"/><rect x="60" y="60" width="10" height="10" fill="black"/><rect x="50" y="70" width="10" height="10" fill="black"/><rect x="70" y="50" width="10" height="10" fill="black"/><text x="50" y="93" font-size="6" text-anchor="middle" fill="black" font-family="monospace">P2P DONASI</text></svg>`;

const MOCK_POM_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120" viewBox="0 0 200 120"><rect width="200" height="120" fill="%231e293b"/><circle cx="100" cy="60" r="30" fill="%233b82f6" opacity="0.3"/><rect x="92" y="35" width="16" height="50" fill="%23ef4444" rx="2"/><rect x="85" y="25" width="30" height="10" fill="%233b82f6" rx="1"/><rect x="70" y="85" width="60" height="10" fill="%23475569"/><rect x="96" y="42" width="8" height="10" fill="white"/><text x="100" y="112" font-size="10" fill="white" font-family="sans-serif" text-anchor="middle">BUKTI FISIK SPBU</text></svg>`;

const ThemeToggle = () => {
  const { mode, setMode } = useColorScheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <IconButton size="sm" variant="outlined" color="neutral" sx={{ borderRadius: '50%', minWidth: 40, minHeight: 40 }} />;

  return (
    <IconButton
      size="sm"
      variant="outlined"
      color="neutral"
      onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
      sx={{ borderRadius: '50%', minWidth: 40, minHeight: 40 }}
    >
      {mode === 'dark' ? <FaSun /> : <FaMoon />}
    </IconButton>
  );
};

export default function StockBBMDashboard() {
  // Navigation Flow State: 'home' | 'pengisi' | 'pencari'
  const [viewState, setViewState] = useState<'home' | 'pengisi' | 'pencari'>('home');

  const [spbus, setSpbus] = useState<SPBU[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // GPS Location Simulation State (Used for the Seeker map center)
  const [locationPreset, setLocationPreset] = useState<'mojokerto_kota' | 'mojokerto_ngoro' | 'mojokerto_trowulan' | 'custom'>('mojokerto_kota');
  const [lat, setLat] = useState(-7.481500); // SPBU Pertamina 54.613.01 Bypass (POM)
  const [lng, setLng] = useState(112.428600);
  
  // Selected SPBU details (For Seeker side panel)
  const [selectedSpbuId, setSelectedSpbuId] = useState<string | null>('spbu-1');
  
  // Form reporting states (For Reporter)
  const [reportSpbuId, setReportSpbuId] = useState<string>('');
  const [manualOverride, setManualOverride] = useState<boolean>(false);
  const [reportStep, setReportStep] = useState<1 | 2 | 3>(1);
  const [reportQueue, setReportQueue] = useState<'red' | 'yellow' | 'green'>('green');
  const [emptyFuels, setEmptyFuels] = useState<string[]>([]);
  const [reportPhoto, setReportPhoto] = useState<string>('');
  const [reportQris, setReportQris] = useState<string>('');

  // Tipping and Social Proof Validation States
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [currentQrisUrl, setCurrentQrisUrl] = useState('');
  
  // Stateless Fingerprint ID
  const [deviceId, setDeviceId] = useState<string>('');

  // Generate / Load Device ID from LocalStorage
  useEffect(() => {
    let storedId = localStorage.getItem('stockbbm_device_id');
    if (!storedId) {
      storedId = 'dev-' + Math.random().toString(36).substring(2, 11) + '-' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('stockbbm_device_id', storedId);
    }
    setDeviceId(storedId);
  }, []);

  // Auto-detect closest SPBU for reporting based on client simulated location
  useEffect(() => {
    if (viewState === 'pengisi' && !manualOverride && spbus.length > 0) {
      // Find the closest SPBU (which is spbus[0] since they are sorted by distance)
      const closest = spbus[0];
      if (closest && reportSpbuId !== closest.id) {
        setReportSpbuId(closest.id);
      }
    }
  }, [viewState, spbus, manualOverride, reportSpbuId]);

  // Automatically snap reporter coordinates to the selected SPBU
  useEffect(() => {
    if (viewState === 'pengisi' && reportSpbuId && spbus.length > 0) {
      const found = spbus.find(s => s.id === reportSpbuId);
      if (found) {
        if (lat !== found.lat || lng !== found.lng) {
          setLat(found.lat);
          setLng(found.lng);
          setLocationPreset('custom');
        }
      }
    }
  }, [viewState, reportSpbuId, spbus, lat, lng]);

  // Fetch SPBUs from API based on simulated lat/lng
  const fetchSpbus = async (currentLat: number, currentLng: number) => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      const storedId = localStorage.getItem('stockbbm_device_id') || deviceId;
      if (storedId) {
        headers['x-device-fingerprint'] = storedId;
      }
      const res = await fetch(`/api/spbus?lat=${currentLat}&lng=${currentLng}`, { headers });
      if (!res.ok) throw new Error('Gagal mengambil data SPBU');
      const data = await res.json();
      setSpbus(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch when location parameters or device ID change
  useEffect(() => {
    if (lat && lng) {
      fetchSpbus(lat, lng);
    }
  }, [lat, lng, deviceId]);

  // Request real browser GPS location on mount
  useEffect(() => {
    triggerRealGeolocation(false);
  }, []);

  // Trigger real browser Geolocation
  const triggerRealGeolocation = (forceAlert = false) => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const uLat = position.coords.latitude;
          const uLng = position.coords.longitude;
          
          setLat(uLat);
          setLng(uLng);
          setLocationPreset('custom');
          if (forceAlert) {
            alert(`Lokasi GPS berhasil dideteksi: ${uLat.toFixed(6)}, ${uLng.toFixed(6)}`);
          }
        },
        (error) => {
          console.error('Error fetching real GPS location:', error);
          if (forceAlert) {
            alert('Gagal mengambil lokasi GPS dari browser. Silakan aktifkan izin lokasi.');
          }
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      if (forceAlert) {
        alert('Browser Anda tidak mendukung Geolocation.');
      }
    }
  };

  // Handle location presets (Centered directly on actual SPBUs for the prototype)
  const handleLocationPresetChange = (preset: 'mojokerto_kota' | 'mojokerto_ngoro' | 'mojokerto_trowulan' | 'custom') => {
    setLocationPreset(preset);
    if (preset === 'mojokerto_kota') {
      setLat(-7.481500); // SPBU 1 Bypass
      setLng(112.428600);
    } else if (preset === 'mojokerto_ngoro') {
      setLat(-7.576800); // SPBU 4 Jasem Ngoro
      setLng(112.618900);
    } else if (preset === 'mojokerto_trowulan') {
      setLat(-7.551200); // SPBU 7 Trowulan
      setLng(112.378900);
    }
  };

  // Convert files to base64 dataURI
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportSpbuId || !deviceId) return;

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-fingerprint': deviceId,
        },
        body: JSON.stringify({
          spbuId: reportSpbuId,
          queueStatus: reportQueue,
          emptyBbm: emptyFuels,
          photoUrl: reportPhoto,
          qrisUrl: reportQris,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Gagal mengirim laporan');
      }

      // Reset form fields
      setReportQueue('green');
      setEmptyFuels([]);
      setReportPhoto('');
      setReportQris('');

      // Refresh data and select reported SPBU
      await fetchSpbus(lat, lng);
      setSelectedSpbuId(reportSpbuId);
      
      // Send back to home or directly to map
      setViewState('pencari');
      
      alert('Laporan berhasil dipublikasikan! Aktif selama 1 jam.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Confirm Accuracy (Social Proof Validation)
  const handleConfirmAccuracy = async (reportId: string, qrisUrl: string) => {
    if (!deviceId) return;
    
    try {
      const res = await fetch(`/api/reports/${reportId}/confirm`, {
        method: 'POST',
        headers: {
          'x-device-fingerprint': deviceId,
        },
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Gagal memvalidasi laporan');
      }

      // Refresh list
      await fetchSpbus(lat, lng);

      // Trigger Direct Tipping Modal if the report has a QRIS
      if (qrisUrl) {
        setCurrentQrisUrl(qrisUrl);
        setShowQrisModal(true);
      } else {
        alert('Terima kasih atas validasinya! Laporan ini tidak melampirkan QRIS donasi.');
      }
    } catch (err: any) {
      // If already confirmed, still allow opening QRIS modal for testing purposes if QRIS exists
      if (err.message.includes('udah memvalidasi') && qrisUrl) {
        setCurrentQrisUrl(qrisUrl);
        setShowQrisModal(true);
      } else {
        alert(err.message);
      }
    }
  };

  // Selected SPBU details object
  const selectedSpbu = spbus.find((s) => s.id === selectedSpbuId);

  // Preselected report SPBU object (for Mini Map preview in form)
  const reportingSpbu = spbus.find((s) => s.id === reportSpbuId);

  // Helper date elapsed string
  const timeSince = (dateString: string) => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes < 1) return 'Baru saja';
    return `${minutes} menit yang lalu`;
  };

  return (
    <Sheet
      sx={{
        minHeight: '100vh',
        pb: 6,
        px: { xs: 2, md: 4 },
        background: 'linear-gradient(to bottom right, var(--joy-palette-background-body), var(--joy-palette-background-level1))',
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: 'auto', pt: 4 }}>

        {/* ============================================================== */}
        {/* VIEW 1: HOME (TWO BUTTON UX)                                  */}
        {/* ============================================================== */}
        {viewState === 'home' && (
          <Box sx={{ py: { xs: 4, md: 8 }, px: { xs: 1, sm: 3 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 6 }}>
              <Stack direction="row" alignItems="center" gap={1.5}>
                <Typography level="h1" sx={{ fontSize: '2.5rem', fontWeight: 950, letterSpacing: '-1px', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <FaGasPump /> StockBBM
                </Typography>
              </Stack>
              <ThemeToggle />
            </Stack>

            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <Typography level="h2" sx={{ fontSize: { xs: '2rem', md: '3rem' }, fontWeight: 900, mb: 2, lineHeight: 1.2 }}>
                Peta Antrean & Stok BBM Gotong Royong
              </Typography>
              <Typography level="body-lg" color="neutral" sx={{ maxWidth: 650, mx: 'auto' }}>
                Pantau kondisi SPBU secara real-time dan akurat. Sistem stateless tanpa registrasi, aman dari kecurangan, didukung sistem apresiasi donasi langsung P2P.
              </Typography>
            </Box>

            {/* Twin Navigation Cards */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 4,
                maxWidth: 900,
                mx: 'auto',
                mb: 8
              }}
            >
              {/* Card 1: Pengisi (Reporter) */}
              <Card
                variant="outlined"
                onClick={() => { setReportSpbuId(''); setManualOverride(false); setReportStep(1); setViewState('pengisi'); }}
                sx={{
                  p: 4,
                  cursor: 'pointer',
                  borderRadius: 'xl',
                  borderWidth: 2,
                  boxShadow: 'md',
                  background: 'linear-gradient(135deg, rgba(var(--joy-palette-primary-softBg-rgb), 0.1) 0%, rgba(var(--joy-palette-background-surface-rgb), 0.9) 100%)',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 'lg',
                    borderColor: 'primary.outlinedBorder',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }
                }}
              >
                <CardContent sx={{ alignItems: 'center', textAlign: 'center', py: 2 }}>
                  <Box
                    sx={{
                      width: 70,
                      height: 70,
                      borderRadius: '50%',
                      bgcolor: 'primary.softBg',
                      color: 'primary.solidBg',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 3,
                    }}
                  >
                    <FaPen size={30} />
                  </Box>
                  <Typography level="h3" sx={{ fontSize: '1.8rem', fontWeight: 800, mb: 1.5 }}>
                    PENGISI (Lapor)
                  </Typography>
                  <Typography level="body-md" color="neutral" sx={{ px: 2 }}>
                    Laporkan antrean & ketersediaan BBM di SPBU sekarang untuk membantu pengendara lain. Dapatkan tips donasi langsung via QRIS E-Wallet lu.
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', mt: 2 }}>
                  <Button size="lg" variant="solid" color="primary" sx={{ fontWeight: 700, borderRadius: 'md', px: 4 }}>
                    Buka Form Laporan
                  </Button>
                </CardActions>
              </Card>

              {/* Card 2: Pencari (Consumer) */}
              <Card
                variant="outlined"
                onClick={() => setViewState('pencari')}
                sx={{
                  p: 4,
                  cursor: 'pointer',
                  borderRadius: 'xl',
                  borderWidth: 2,
                  boxShadow: 'md',
                  background: 'linear-gradient(135deg, rgba(var(--joy-palette-success-softBg-rgb), 0.1) 0%, rgba(var(--joy-palette-background-surface-rgb), 0.9) 100%)',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 'lg',
                    borderColor: 'success.outlinedBorder',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }
                }}
              >
                <CardContent sx={{ alignItems: 'center', textAlign: 'center', py: 2 }}>
                  <Box
                    sx={{
                      width: 70,
                      height: 70,
                      borderRadius: '50%',
                      bgcolor: 'success.softBg',
                      color: 'success.solidBg',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 3,
                    }}
                  >
                    <FaMap size={30} />
                  </Box>
                  <Typography level="h3" sx={{ fontSize: '1.8rem', fontWeight: 800, mb: 1.5 }}>
                    PENCARI (Cek Peta)
                  </Typography>
                  <Typography level="body-md" color="neutral" sx={{ px: 2 }}>
                    Cari SPBU terdekat dalam radius 50km dengan indikator warna status antrean ter-update. Kirim ucapan terima kasih via scan QRIS P2P.
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', mt: 2 }}>
                  <Button size="lg" variant="solid" color="success" sx={{ fontWeight: 700, borderRadius: 'md', px: 4 }}>
                    Buka Peta Interaktif
                  </Button>
                </CardActions>
              </Card>
            </Box>

            {/* Anti-Fraud Info Panel */}
            <Card
              variant="outlined"
              sx={{
                p: 3,
                maxWidth: 600,
                mx: 'auto',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 2.5,
                background: 'rgba(var(--joy-palette-background-surface-rgb), 0.5)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <IconButton variant="soft" color="success" size="lg" sx={{ borderRadius: '50%', pointerEvents: 'none' }}>
                <FaShieldAlt />
              </IconButton>
              <Box>
                <Typography level="title-md" sx={{ fontWeight: 700 }}>Sistem Keamanan Anti-Fraud</Typography>
                <Typography level="body-xs" color="neutral">
                  Sistem ini tidak memproses transaksi uang di server. Apresiasi dikirim secara langsung dari e-wallet pencari ke e-wallet pengisi (P2P Donasi). 
                  Dengan menghilangkan koin hadiah dari sistem, celah eksploitasi data palsu berkurang 100%!
                </Typography>
              </Box>
            </Card>
          </Box>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: PENGISI (REPORTER FORM FLOW)                           */}
        {/* ============================================================== */}
        {viewState === 'pengisi' && (
          <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            {/* Header / Nav */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
              <Button
                variant="outlined"
                color="neutral"
                startDecorator={<FaArrowLeft />}
                onClick={() => setViewState('home')}
                sx={{ fontWeight: 600 }}
              >
                Kembali
              </Button>
              <ThemeToggle />
            </Stack>

            {/* Stepper indicator */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4, px: 2 }}>
              <Stack direction="row" alignItems="center" gap={1}>
                <Box sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: reportStep === 1 ? 'primary.solidBg' : reportStep > 1 ? 'success.solidBg' : 'neutral.softBg',
                  color: reportStep >= 1 ? 'white' : 'neutral.softColor',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {reportStep > 1 ? <FaCheck /> : '1'}
                </Box>
                <Typography level="title-sm" color={reportStep === 1 ? 'primary' : 'neutral'} sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 600 }}>Lokasi</Typography>
              </Stack>

              <Box sx={{ flex: 1, height: '2px', bgcolor: reportStep > 1 ? 'success.solidBg' : 'divider', mx: 2 }} />

              <Stack direction="row" alignItems="center" gap={1}>
                <Box sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: reportStep === 2 ? 'primary.solidBg' : reportStep > 2 ? 'success.solidBg' : 'neutral.softBg',
                  color: reportStep >= 2 ? 'white' : 'neutral.softColor',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {reportStep > 2 ? <FaCheck /> : '2'}
                </Box>
                <Typography level="title-sm" color={reportStep === 2 ? 'primary' : 'neutral'} sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 600 }}>Informasi BBM</Typography>
              </Stack>

              <Box sx={{ flex: 1, height: '2px', bgcolor: reportStep > 2 ? 'success.solidBg' : 'divider', mx: 2 }} />

              <Stack direction="row" alignItems="center" gap={1}>
                <Box sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: reportStep === 3 ? 'primary.solidBg' : 'neutral.softBg',
                  color: reportStep >= 3 ? 'white' : 'neutral.softColor',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  3
                </Box>
                <Typography level="title-sm" color={reportStep === 3 ? 'primary' : 'neutral'} sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 600 }}>Unggah Bukti</Typography>
              </Stack>
            </Stack>

            <Card
              variant="outlined"
              sx={{
                p: { xs: 2.5, sm: 4 },
                boxShadow: 'md',
                background: 'rgba(var(--joy-palette-background-surface-rgb), 0.8)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <Typography level="h2" sx={{ fontSize: '1.8rem', fontWeight: 900, mb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <FaPen /> Laporkan Kondisi SPBU
              </Typography>
              
              {/* Mobile current step label helper */}
              <Typography level="body-xs" color="neutral" sx={{ display: { xs: 'block', sm: 'none' }, mb: 3, fontWeight: 600 }}>
                Langkah {reportStep} dari 3: {reportStep === 1 ? 'Pilih Lokasi SPBU' : reportStep === 2 ? 'Informasi Antrean & Ketersediaan' : 'Unggah Foto & QRIS'}
              </Typography>

              <form onSubmit={handleSubmitReport}>
                <Stack gap={3.5}>
                  {/* STEP 1: LOKASI */}
                  {reportStep === 1 && (
                    <Stack gap={3}>
                      {!manualOverride ? (
                        /* Auto Detection Mode */
                        <Stack gap={2.5}>
                          {reportingSpbu ? (
                            <Card
                              variant="soft"
                              color="success"
                              sx={{
                                p: 2.5,
                                border: '1px solid',
                                borderColor: 'success.outlinedBorder',
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(var(--joy-palette-background-surface-rgb), 0.9) 100%)',
                                boxShadow: 'sm',
                                position: 'relative',
                                overflow: 'hidden'
                              }}
                            >
                              {/* Pulsing GPS locator decoration */}
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: 18,
                                  right: 18,
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  bgcolor: 'success.solidBg',
                                  '&::after': {
                                    content: '""',
                                    position: 'absolute',
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '50%',
                                    bgcolor: 'inherit',
                                    animation: 'gps-pulse-form 2s infinite ease-in-out',
                                    left: 0,
                                    top: 0
                                  }
                                }}
                              />

                              <Stack gap={1}>
                                <Typography level="body-xs" sx={{ fontWeight: 800, color: 'success.solidBg', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                  GPS Terdeteksi Otomatis
                                </Typography>
                                
                                <Typography level="h3" sx={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <FaGasPump /> [{reportingSpbu.brand}] {reportingSpbu.name}
                                </Typography>

                                <Typography level="body-sm" color="neutral">
                                  {reportingSpbu.address}
                                </Typography>

                                <Box sx={{ mt: 0.5 }}>
                                  <Chip
                                    size="sm"
                                    variant="solid"
                                    color="success"
                                    sx={{ fontWeight: 700 }}
                                  >
                                    Jarak: {reportingSpbu.distanceKm !== null ? (reportingSpbu.distanceKm <= 1.0 ? `${Math.round(reportingSpbu.distanceKm * 1000)} meter` : `${reportingSpbu.distanceKm} km`) : 'Terdeteksi'}
                                  </Chip>
                                </Box>
                              </Stack>

                              {/* Embedded CSS for animation */}
                              <style jsx global>{`
                                @keyframes gps-pulse-form {
                                  0% { transform: scale(1); opacity: 0.8; }
                                  100% { transform: scale(3.5); opacity: 0; }
                                }
                              `}</style>
                            </Card>
                          ) : (
                            <Sheet
                              variant="outlined"
                              sx={{
                                p: 3,
                                borderRadius: 'md',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 1.5,
                                bgcolor: 'background.level1',
                                borderColor: 'neutral.outlinedBorder',
                              }}
                            >
                              <CircularProgress size="md" color="primary" />
                              <Typography level="body-sm" color="neutral" sx={{ fontWeight: 600 }}>
                                Mendeteksi lokasi GPS Anda...
                              </Typography>
                            </Sheet>
                          )}

                          {reportingSpbu && (
                            <Box sx={{ height: 180, width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
                              <MapComponent
                                spbus={[reportingSpbu]}
                                center={[reportingSpbu.lat, reportingSpbu.lng]}
                                zoom={15}
                                height="100%"
                              />
                            </Box>
                          )}

                          <Button
                            variant="plain"
                            color="primary"
                            size="sm"
                            onClick={() => setManualOverride(true)}
                            sx={{ alignSelf: 'center', fontWeight: 600 }}
                          >
                            Bukan SPBU ini? Pilih secara manual
                          </Button>
                        </Stack>
                      ) : (
                        /* Manual Selection Mode */
                        <Stack gap={2.5}>
                          <FormControl required>
                            <FormLabel sx={{ fontWeight: 700 }}>Pilih Lokasi SPBU (Manual)</FormLabel>
                            <Select
                              placeholder="Pilih SPBU terdekat..."
                              value={reportSpbuId || null}
                              onChange={(_, val) => setReportSpbuId(val || '')}
                              size="lg"
                              disabled={loading}
                            >
                              {spbus.map((s) => (
                                <Option key={s.id} value={s.id}>
                                  [{s.brand}] {s.name} - {s.address.split(',')[0]}
                                </Option>
                              ))}
                            </Select>
                          </FormControl>

                          {reportingSpbu ? (
                            <Box sx={{ height: 180, width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
                              <MapComponent
                                spbus={[reportingSpbu]}
                                center={[reportingSpbu.lat, reportingSpbu.lng]}
                                zoom={15}
                                height="100%"
                              />
                            </Box>
                          ) : (
                            <Sheet
                              variant="outlined"
                              sx={{
                                height: 180,
                                borderRadius: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 1.5,
                                bgcolor: 'background.level1',
                                borderColor: 'neutral.outlinedBorder',
                              }}
                            >
                              <FaMapMarkerAlt size={32} style={{ color: 'var(--joy-palette-neutral-plainColor)' }} />
                              <Typography level="body-sm" color="neutral" sx={{ fontWeight: 600 }}>
                                Pilih SPBU untuk menampilkan pratinjau peta
                              </Typography>
                            </Sheet>
                          )}

                          <Button
                            variant="plain"
                            color="success"
                            size="sm"
                            onClick={() => {
                              setManualOverride(false);
                              if (spbus.length > 0) {
                                setReportSpbuId(spbus[0].id);
                              }
                            }}
                            sx={{ alignSelf: 'center', fontWeight: 600 }}
                          >
                            Kembali ke deteksi otomatis GPS
                          </Button>
                        </Stack>
                      )}

                      <Divider sx={{ my: 1 }} />

                      <Stack direction="row" gap={2} justifyContent="space-between">
                        <Button variant="outlined" color="neutral" size="lg" onClick={() => setViewState('home')} sx={{ fontWeight: 600, flex: 1 }}>
                          Batal
                        </Button>
                        <Button
                          variant="solid"
                          color="primary"
                          size="lg"
                          disabled={!reportSpbuId}
                          onClick={() => setReportStep(2)}
                          sx={{ fontWeight: 600, flex: 1 }}
                        >
                          Lanjut
                        </Button>
                      </Stack>
                    </Stack>
                  )}

                  {/* STEP 2: INFORMASI BBM */}
                  {reportStep === 2 && (
                    <Stack gap={3.5}>
                      <FormControl required>
                        <FormLabel sx={{ fontWeight: 700, mb: 1.5 }}>Kondisi Antrean Motor</FormLabel>
                        <RadioGroup
                          orientation="horizontal"
                          name="queueStatus"
                          value={reportQueue}
                          onChange={(e) => setReportQueue(e.target.value as any)}
                          sx={{
                            gap: 2,
                            display: 'flex',
                            flexWrap: 'wrap',
                          }}
                        >
                          <Radio
                            value="green"
                            label="Lancar (Hijau)"
                            color="success"
                            variant="outlined"
                            slotProps={{
                              action: ({ checked }) => ({
                                sx: {
                                  ...(checked && {
                                    boxShadow: '0 0 12px rgba(16, 185, 129, 0.25)',
                                    borderColor: 'success.solidBg',
                                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                  }),
                                },
                              }),
                            }}
                            sx={{
                              p: 2,
                              borderRadius: 'md',
                              flex: 1,
                              minWidth: { xs: '100%', sm: 150 },
                              fontWeight: 700,
                              transition: 'all 0.2s',
                              '&:hover': {
                                backgroundColor: 'rgba(16, 185, 129, 0.04)',
                              }
                            }}
                          />
                          <Radio
                            value="yellow"
                            label="Sedang (Kuning)"
                            color="warning"
                            variant="outlined"
                            slotProps={{
                              action: ({ checked }) => ({
                                sx: {
                                  ...(checked && {
                                    boxShadow: '0 0 12px rgba(245, 158, 11, 0.25)',
                                    borderColor: 'warning.solidBg',
                                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                                  }),
                                },
                              }),
                            }}
                            sx={{
                              p: 2,
                              borderRadius: 'md',
                              flex: 1,
                              minWidth: { xs: '100%', sm: 150 },
                              fontWeight: 700,
                              transition: 'all 0.2s',
                              '&:hover': {
                                backgroundColor: 'rgba(245, 158, 11, 0.04)',
                              }
                            }}
                          />
                          <Radio
                            value="red"
                            label="Panjang (Merah)"
                            color="danger"
                            variant="outlined"
                            slotProps={{
                              action: ({ checked }) => ({
                                sx: {
                                  ...(checked && {
                                    boxShadow: '0 0 12px rgba(239, 68, 68, 0.25)',
                                    borderColor: 'danger.solidBg',
                                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                  }),
                                },
                              }),
                            }}
                            sx={{
                              p: 2,
                              borderRadius: 'md',
                              flex: 1,
                              minWidth: { xs: '100%', sm: 150 },
                              fontWeight: 700,
                              transition: 'all 0.2s',
                              '&:hover': {
                                backgroundColor: 'rgba(239, 68, 68, 0.04)',
                              }
                            }}
                          />
                        </RadioGroup>
                      </FormControl>

                      <Box>
                        <FormLabel sx={{ fontWeight: 700, mb: 1.5 }}>Ceklist BBM yang Habis/Kosong (Opsional)</FormLabel>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                          {['Pertalite', 'Pertamax', 'Solar', 'Dexlite'].map((bbm) => (
                            <Sheet
                              key={bbm}
                              variant="outlined"
                              sx={{
                                p: 1.5,
                                borderRadius: 'md',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                ...(emptyFuels.includes(bbm) && {
                                  borderColor: 'danger.outlinedBorder',
                                  bgcolor: 'rgba(239, 68, 68, 0.05)',
                                }),
                                '&:hover': {
                                  bgcolor: 'background.level1',
                                }
                              }}
                            >
                              <Checkbox
                                label={`${bbm} Kosong`}
                                checked={emptyFuels.includes(bbm)}
                                color="danger"
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEmptyFuels([...emptyFuels, bbm]);
                                  } else {
                                    setEmptyFuels(emptyFuels.filter((x) => x !== bbm));
                                  }
                                }}
                                slotProps={{
                                  action: {
                                    sx: { borderRadius: 'md' }
                                  }
                                }}
                                sx={{ fontWeight: 700, width: '100%' }}
                              />
                            </Sheet>
                          ))}
                        </Box>
                      </Box>

                      <Divider sx={{ my: 1 }} />

                      <Stack direction="row" gap={2} justifyContent="space-between">
                        <Button variant="outlined" color="neutral" size="lg" onClick={() => setReportStep(1)} sx={{ fontWeight: 600, flex: 1 }}>
                          Kembali
                        </Button>
                        <Button variant="solid" color="primary" size="lg" onClick={() => setReportStep(3)} sx={{ fontWeight: 600, flex: 1 }}>
                          Lanjut
                        </Button>
                      </Stack>
                    </Stack>
                  )}

                  {/* STEP 3: UNGGAH BUKTI */}
                  {reportStep === 3 && (
                    <Stack gap={3.5}>
                      <Box>
                        <FormLabel sx={{ fontWeight: 700, mb: 1.5 }}>Foto Kondisi Fisik POM (Opsional)</FormLabel>
                        {!reportPhoto ? (
                          <Sheet
                            variant="outlined"
                            sx={{
                              p: 3,
                              borderRadius: 'md',
                              borderStyle: 'dashed',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 1.5,
                              bgcolor: 'background.level1',
                              transition: 'all 0.2s',
                              '&:hover': {
                                bgcolor: 'background.level2',
                                borderColor: 'neutral.outlinedBorder',
                              }
                            }}
                          >
                            <FaImage size={28} style={{ color: 'var(--joy-palette-neutral-plainColor)' }} />
                            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} alignItems="center">
                              <Button
                                component="label"
                                role={undefined}
                                variant="solid"
                                color="neutral"
                                size="sm"
                                sx={{ fontWeight: 600 }}
                              >
                                Upload Foto Bukti
                                <input
                                  type="file"
                                  accept="image/*"
                                  hidden
                                  onChange={(e) => handleFileChange(e, setReportPhoto)}
                                />
                              </Button>
                              <Typography level="body-xs" color="neutral">atau</Typography>
                              <Button
                                variant="plain"
                                color="primary"
                                size="sm"
                                startDecorator={<FaImage />}
                                onClick={() => setReportPhoto(MOCK_POM_SVG)}
                                sx={{ fontWeight: 600 }}
                              >
                                Gunakan Foto Mockup
                              </Button>
                            </Stack>
                            <Typography level="body-xs" color="neutral">
                              Format JPG/PNG/SVG, Maks 5MB
                            </Typography>
                          </Sheet>
                        ) : (
                          <Box sx={{ position: 'relative', width: '100%', height: 180, borderRadius: 'md', border: '1px solid var(--joy-palette-divider)', overflow: 'hidden', bgcolor: 'background.level2', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <img src={reportPhoto} alt="Preview Bukti POM" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            <IconButton
                              size="sm"
                              variant="solid"
                              color="danger"
                              onClick={() => setReportPhoto('')}
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                borderRadius: '50%',
                                zIndex: 10,
                                boxShadow: 'sm'
                              }}
                            >
                              <FaTimesCircle />
                            </IconButton>
                          </Box>
                        )}
                      </Box>

                      <Box>
                        <FormLabel sx={{ fontWeight: 700, mb: 1.5 }}>QRIS E-Wallet untuk Menerima Tips (Opsional)</FormLabel>
                        {!reportQris ? (
                          <Sheet
                            variant="outlined"
                            sx={{
                              p: 3,
                              borderRadius: 'md',
                              borderStyle: 'dashed',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 1.5,
                              bgcolor: 'background.level1',
                              transition: 'all 0.2s',
                              '&:hover': {
                                bgcolor: 'background.level2',
                                borderColor: 'neutral.outlinedBorder',
                              }
                            }}
                          >
                            <FaQrcode size={28} style={{ color: 'var(--joy-palette-neutral-plainColor)' }} />
                            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} alignItems="center">
                              <Button
                                component="label"
                                role={undefined}
                                variant="solid"
                                color="neutral"
                                size="sm"
                                sx={{ fontWeight: 600 }}
                              >
                                Upload QRIS E-Wallet
                                <input
                                  type="file"
                                  accept="image/*"
                                  hidden
                                  onChange={(e) => handleFileChange(e, setReportQris)}
                                />
                              </Button>
                              <Typography level="body-xs" color="neutral">atau</Typography>
                              <Button
                                variant="plain"
                                color="primary"
                                size="sm"
                                startDecorator={<FaQrcode />}
                                onClick={() => setReportQris(MOCK_QRIS_SVG)}
                                sx={{ fontWeight: 600 }}
                              >
                                Gunakan QRIS Mockup
                              </Button>
                            </Stack>
                            <Typography level="body-xs" color="neutral">
                              Upload screenshot QRIS Dana, Gopay, OVO, atau LinkAja
                            </Typography>
                          </Sheet>
                        ) : (
                          <Box sx={{ position: 'relative', width: '100%', height: 180, borderRadius: 'md', border: '1px solid var(--joy-palette-divider)', overflow: 'hidden', bgcolor: 'background.level2', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <img src={reportQris} alt="Preview QRIS" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            <IconButton
                              size="sm"
                              variant="solid"
                              color="danger"
                              onClick={() => setReportQris('')}
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                borderRadius: '50%',
                                zIndex: 10,
                                boxShadow: 'sm'
                              }}
                            >
                              <FaTimesCircle />
                            </IconButton>
                          </Box>
                        )}
                      </Box>

                      <Divider sx={{ my: 1 }} />

                      <Stack direction="row" gap={2} justifyContent="space-between">
                        <Button variant="outlined" color="neutral" size="lg" onClick={() => setReportStep(2)} sx={{ fontWeight: 600, flex: 1 }}>
                          Kembali
                        </Button>
                        <Button type="submit" variant="solid" color="primary" size="lg" startDecorator={<FaPaperPlane />} sx={{ fontWeight: 700, flex: 1 }}>
                          Kirim Laporan
                        </Button>
                      </Stack>
                    </Stack>
                  )}
                </Stack>
              </form>
            </Card>
          </Box>
        )}

        {/* ============================================================== */}
        {/* VIEW 3: PENCARI (SEEKER LEAFLET MAP VIEW)                      */}
        {/* ============================================================== */}
        {viewState === 'pencari' && (
          <Box>
            {/* Header Navigation */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
              <Button
                variant="outlined"
                color="neutral"
                startDecorator={<FaArrowLeft />}
                onClick={() => setViewState('home')}
                sx={{ fontWeight: 600 }}
              >
                Menu Utama
              </Button>
              <ThemeToggle />
            </Stack>

            {/* Sleek GPS Status Bar */}
            <Card
              variant="outlined"
              sx={{
                p: 2,
                mb: 3,
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: 2,
                boxShadow: 'sm',
                background: 'rgba(var(--joy-palette-background-surface-rgb), 0.8)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <Stack direction="row" alignItems="center" gap={1.5}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: 'primary.solidBg',
                    position: 'relative',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      bgcolor: 'inherit',
                      animation: 'gps-pulse-form 2s infinite ease-in-out',
                      left: 0,
                      top: 0
                    }
                  }}
                />
                <Box>
                  <Typography level="title-sm" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FaCompass /> <b>Lokasi GPS Terdeteksi</b>
                  </Typography>
                  <Typography level="body-xs" color="neutral">
                    Koordinat: <code>{lat.toFixed(6)}, {lng.toFixed(6)}</code> (Mencari SPBU terdekat dalam radius 50km)
                  </Typography>
                </Box>
              </Stack>
              
              <Stack direction="row" gap={1.5} alignSelf={{ xs: 'stretch', sm: 'auto' }} alignItems="center" flexWrap="wrap">
                <Button
                  variant="outlined"
                  color="primary"
                  size="sm"
                  startDecorator={<FaSync />}
                  onClick={() => triggerRealGeolocation(true)}
                  sx={{ fontWeight: 600, flex: { xs: 1, sm: 'none' } }}
                >
                  Pusatkan GPS
                </Button>
                
                <Select
                  size="sm"
                  variant="plain"
                  color="neutral"
                  value={locationPreset}
                  onChange={(_, val) => handleLocationPresetChange(val || 'mojokerto_kota')}
                  sx={{ fontWeight: 600, width: { xs: '100%', sm: 150 }, flex: { xs: 1, sm: 'none' } }}
                >
                  <Option value="mojokerto_kota">Simulasi Kota</Option>
                  <Option value="mojokerto_ngoro">Simulasi Ngoro</Option>
                  <Option value="mojokerto_trowulan">Simulasi Trowulan</Option>
                  <Option value="custom">Koordinat Custom</Option>
                </Select>
              </Stack>

              {/* Embedded CSS for GPS pulse */}
              <style jsx global>{`
                @keyframes gps-pulse-form {
                  0% { transform: scale(1); opacity: 0.8; }
                  100% { transform: scale(3.5); opacity: 0; }
                }
              `}</style>
            </Card>

            {/* Grid Layout: Map & Details */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: '1fr 400px' },
                gap: 4,
              }}
            >
              {/* Map Canvas Card */}
              <Card
                variant="outlined"
                sx={{
                  p: 1.5,
                  minHeight: 450,
                  boxShadow: 'md',
                  background: 'rgba(var(--joy-palette-background-surface-rgb), 0.8)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <Typography level="title-md" sx={{ px: 1, mb: 1.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FaSatellite /> Peta Pemantauan SPBU Terdekat
                </Typography>
                
                {/* Dynamically Loaded Leaflet Map */}
                <Box sx={{ flex: 1, minHeight: 400, borderRadius: '8px', overflow: 'hidden' }}>
                  <MapComponent
                    spbus={spbus}
                    center={[lat, lng]}
                    onSelectSpbu={(id) => {
                      setSelectedSpbuId(id);
                      if (id) {
                        const found = spbus.find(s => s.id === id);
                        if (found) {
                          setLat(found.lat);
                          setLng(found.lng);
                          setLocationPreset('custom');
                        }
                      }
                    }}
                    selectedSpbuId={selectedSpbuId}
                    height="400px"
                  />
                </Box>
                
                <Stack direction="row" gap={1.5} justifyContent="center" flexWrap="wrap" sx={{ mt: 1.5, width: '100%' }}>
                  <Stack direction="row" alignItems="center" gap={0.5}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
                    <Typography level="body-xs">Tidak Antre</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" gap={0.5}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                    <Typography level="body-xs">Antrean Sedang</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" gap={0.5}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444' }} />
                    <Typography level="body-xs">Antrean Panjang</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" gap={0.5}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#6b7280' }} />
                    <Typography level="body-xs">Belum Ada Laporan</Typography>
                  </Stack>
                </Stack>
              </Card>

              {/* Details and Actions Sidebar */}
              <Box>
                {!selectedSpbu ? (
                  <Card variant="outlined" sx={{ p: 4, textAlign: 'center', boxShadow: 'md' }}>
                    <Typography level="title-md">Pilih salah satu pin SPBU di peta untuk memeriksa kondisi antrean.</Typography>
                  </Card>
                ) : (
                  <Card
                    variant="outlined"
                    sx={{
                      p: 3,
                      boxShadow: 'md',
                      background: 'rgba(var(--joy-palette-background-surface-rgb), 0.8)',
                      backdropFilter: 'blur(8px)',
                      borderColor: selectedSpbu.activeReport ? getQueueBorderColor(selectedSpbu.activeReport.queueStatus) : 'divider',
                    }}
                  >
                    {/* SPBU Header */}
                    <Box>
                      <Chip
                        size="sm"
                        variant="solid"
                        color={
                          selectedSpbu.brand === 'Pertamina' ? 'danger' :
                          selectedSpbu.brand === 'Shell' ? 'warning' : 'primary'
                        }
                        sx={{ mb: 1, fontWeight: 700 }}
                      >
                        {selectedSpbu.brand}
                      </Chip>
                      <Typography level="h2" sx={{ fontSize: '1.5rem', fontWeight: 800, mb: 0.5 }}>
                        {selectedSpbu.name}
                      </Typography>
                      <Typography level="body-sm" color="neutral" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <FaMapMarkerAlt /> {selectedSpbu.address}
                      </Typography>
                      {selectedSpbu.distanceKm !== null && (
                        <Chip size="sm" variant="soft" color="neutral" sx={{ fontWeight: 600 }}>
                          Jarak dari lu: {selectedSpbu.distanceKm} km {selectedSpbu.distanceKm > 50 && '(Di luar radius 50km)'}
                        </Chip>
                      )}
                    </Box>

                    <Divider sx={{ my: 2.5 }} />

                    {/* Active Queue Status */}
                    <Box sx={{ mb: 3 }}>
                      <Typography level="title-sm" color="neutral" sx={{ mb: 1 }}>KONDISI ANTREAN MOTOR</Typography>
                      {selectedSpbu.activeReport ? (
                        <Chip
                          size="lg"
                          variant="solid"
                          color={getQueueColor(selectedSpbu.activeReport.queueStatus)}
                          startDecorator={
                            selectedSpbu.activeReport.queueStatus === 'green' ? <FaCheckCircle /> :
                            selectedSpbu.activeReport.queueStatus === 'yellow' ? <FaExclamationTriangle /> : <FaTimesCircle />
                          }
                          sx={{ px: 2, py: 1, width: '100%', height: 'auto', borderRadius: 'md', fontSize: '1rem', fontWeight: 800, justifyContent: 'center' }}
                        >
                          {selectedSpbu.activeReport.queueStatus === 'green' && 'Tidak Antre'}
                          {selectedSpbu.activeReport.queueStatus === 'yellow' && 'Antrean Sedang'}
                          {selectedSpbu.activeReport.queueStatus === 'red' && 'Antrean Panjang'}
                        </Chip>
                      ) : (
                        <Chip
                          size="lg"
                          variant="soft"
                          color="neutral"
                          startDecorator={<FaInfoCircle />}
                          sx={{ px: 2, py: 1, width: '100%', height: 'auto', borderRadius: 'md', fontSize: '1rem', fontWeight: 800, justifyContent: 'center' }}
                        >
                          Belum Ada Laporan
                        </Chip>
                      )}
                    </Box>

                    {/* Active Report Details */}
                    {selectedSpbu.activeReport ? (
                      <Stack gap={2.5}>
                        <Box>
                          <Typography level="title-sm" color="neutral" sx={{ mb: 0.5 }}>DILAPORKAN PADA</Typography>
                          <Typography level="body-md" sx={{ fontWeight: 600 }}>
                            {timeSince(selectedSpbu.activeReport.createdAt)}
                          </Typography>
                          <Typography level="body-xs" color="neutral">
                            Aktif sampai {new Date(new Date(selectedSpbu.activeReport.createdAt).getTime() + 60 * 60 * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} (TTL 1 Jam)
                          </Typography>
                        </Box>

                        <Box>
                          <Typography level="title-sm" color="neutral" sx={{ mb: 0.5 }}>STATUS BBM KOSONG</Typography>
                          <Stack direction="row" gap={1} flexWrap="wrap">
                            {selectedSpbu.activeReport.emptyBbm.length > 0 ? (
                              selectedSpbu.activeReport.emptyBbm.map((bbm) => (
                                <Chip key={bbm} size="sm" variant="soft" color="danger" startDecorator={<FaTimesCircle />} sx={{ fontWeight: 600 }}>
                                  {bbm} Habis
                                </Chip>
                              ))
                            ) : (
                              <Chip size="sm" variant="soft" color="success" startDecorator={<FaCheckCircle />} sx={{ fontWeight: 600 }}>
                                Semua BBM Tersedia
                              </Chip>
                            )}
                          </Stack>
                        </Box>

                        <Box>
                          <Typography level="title-sm" color="neutral" sx={{ mb: 0.5 }}>VALIDASI SOSIAL</Typography>
                          <Typography level="body-lg" color="success" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <FaThumbsUp /> {selectedSpbu.activeReport.confirmsCount} Akurat
                          </Typography>
                        </Box>

                        {/* Evidence Photo */}
                        {selectedSpbu.activeReport.photoUrl && (
                          <Box>
                            <Typography level="title-sm" color="neutral" sx={{ mb: 1 }}>BUKTI FOTO KONDISI POM</Typography>
                            <Box
                              sx={{
                                width: '100%',
                                height: 180,
                                borderRadius: 'md',
                                border: '1px solid',
                                borderColor: 'divider',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'background.level2',
                              }}
                            >
                              <img
                                src={selectedSpbu.activeReport.photoUrl}
                                alt="Bukti Fisik POM"
                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                              />
                            </Box>
                          </Box>
                        )}

                        {/* Social Proof Accuracy Confirmer / Already Confirmed state */}
                        {selectedSpbu.activeReport.hasConfirmed ? (
                          <Card variant="soft" color="success" sx={{ p: 2.5, mt: 1, border: '1px solid', borderColor: 'success.outlinedBorder', textAlign: 'center' }}>
                            <Typography level="title-md" color="success" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                              <FaCheckCircle /> Data Telah Divalidasi!
                            </Typography>
                            <Typography level="body-xs" color="neutral" sx={{ mt: 0.5, mb: selectedSpbu.activeReport.qrisUrl ? 1.5 : 0 }}>
                              Anda telah memverifikasi bahwa laporan kondisi SPBU ini akurat.
                            </Typography>
                            {selectedSpbu.activeReport.qrisUrl && (
                              <Button
                                variant="solid"
                                color="success"
                                startDecorator={<FaQrcode />}
                                onClick={() => {
                                  setCurrentQrisUrl(selectedSpbu.activeReport!.qrisUrl);
                                  setShowQrisModal(true);
                                }}
                                sx={{ fontWeight: 700, width: '100%' }}
                              >
                                Tampilkan QRIS Donasi Lagi
                              </Button>
                            )}
                          </Card>
                        ) : (
                          <Card variant="soft" color="primary" sx={{ p: 2, mt: 1 }}>
                            <Typography level="title-md" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
                              Apakah data ini akurat?
                            </Typography>
                            <Button
                              variant="solid"
                              color="success"
                              startDecorator={<FaThumbsUp />}
                              onClick={() =>
                                handleConfirmAccuracy(
                                  selectedSpbu.activeReport!.id,
                                  selectedSpbu.activeReport!.qrisUrl
                                )
                              }
                              sx={{ fontWeight: 700, width: '100%' }}
                            >
                              Ya, Data Akurat
                            </Button>
                          </Card>
                        )}

                        {/* Button to report new info if data feels outdated */}
                        <Button
                          variant="outlined"
                          color="neutral"
                          startDecorator={<FaPen />}
                          onClick={() => {
                            setReportSpbuId(selectedSpbu.id);
                            setManualOverride(true);
                            setReportStep(1);
                            setViewState('pengisi');
                          }}
                          sx={{ fontWeight: 600, mt: 1 }}
                        >
                          Laporkan Info Baru (Timpa)
                        </Button>
                      </Stack>
                    ) : (
                      /* No active report details */
                      <Stack alignItems="center" sx={{ py: 3, textAlign: 'center' }}>
                        <Typography level="title-md" sx={{ mb: 1, fontWeight: 700 }}>
                          Belum Ada Laporan Aktif
                        </Typography>
                        <Typography level="body-xs" color="neutral" sx={{ mb: 3 }}>
                          Kondisi SPBU ini belum dilaporkan dalam 1 jam terakhir. Ayo infokan pengendara lain dengan melapor!
                        </Typography>
                        <Button
                          variant="solid"
                          color="primary"
                          startDecorator={<FaPen />}
                          onClick={() => {
                            setReportSpbuId(selectedSpbu.id);
                            setManualOverride(true);
                            setReportStep(1);
                            setViewState('pengisi');
                          }}
                          sx={{ fontWeight: 700, width: '100%' }}
                        >
                          Laporkan Kondisi SPBU
                        </Button>
                      </Stack>
                    )}
                  </Card>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {/* ============================================================== */}
        {/* FOOTER & GLOBAL MODALS                                         */}
        {/* ============================================================== */}
        <Divider sx={{ my: 6 }} />
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" gap={2}>
          <Typography level="body-xs" color="neutral">
            © 2026 StockBBM crowdsourcing monitor. Desain minimalis, bebas fraud & stateless.
          </Typography>
          {deviceId && (
            <Card
              variant="soft"
              sx={{
                py: 0.5,
                px: 2,
                borderRadius: 'md',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.solidBg' }} />
              <Typography level="body-xs" color="neutral">
                ID Perangkat Stateless: <code>{deviceId}</code>
              </Typography>
            </Card>
          )}
        </Stack>

        {/* Modal: Direct P2P Tipping */}
        <Modal open={showQrisModal} onClose={() => setShowQrisModal(false)}>
          <ModalDialog
            sx={{
              maxWidth: 450,
              width: '100%',
              textAlign: 'center',
              p: 3,
              boxShadow: 'lg',
              borderRadius: 'lg',
            }}
          >
            <ModalClose />
            <Typography level="h3" sx={{ mb: 1, fontWeight: 900, color: 'success.plainColor', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <FaCheckCircle /> Validasi Sukses!
            </Typography>
            <Typography level="title-md" sx={{ mb: 2, fontWeight: 600 }}>
              Kirim Donasi Sukarela P2P
            </Typography>
            <Typography level="body-sm" color="neutral" sx={{ mb: 3 }}>
              Silahkan scan QRIS E-Wallet milik pelapor di bawah ini jika lu merasa info real-time yang diberikannya bermanfaat. 
              **100% donasi masuk langsung ke rekening pelapor.**
            </Typography>

            <Box
              sx={{
                width: 220,
                height: 220,
                mx: 'auto',
                p: 2,
                borderRadius: 'md',
                border: '2px solid',
                borderColor: 'success.outlinedBorder',
                bgcolor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'sm',
                mb: 3,
              }}
            >
              {currentQrisUrl ? (
                <img
                  src={currentQrisUrl}
                  alt="QRIS Donasi"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <Typography level="body-xs" color="neutral">
                  Gambar QRIS tidak dapat dimuat.
                </Typography>
              )}
            </Box>

            <Stack gap={1.5}>
              <Button variant="solid" color="success" onClick={() => setShowQrisModal(false)} sx={{ fontWeight: 700 }}>
                Selesai / Tutup
              </Button>
              <Typography level="body-xs" color="neutral">
                *Donasi bersifat sukarela. Terima kasih atas gotong-royong berkendaranya, bre!
              </Typography>
            </Stack>
          </ModalDialog>
        </Modal>

      </Box>
    </Sheet>
  );
}

// Helpers for Queue styling
function getQueueColor(status: 'red' | 'yellow' | 'green'): 'danger' | 'warning' | 'success' | 'neutral' {
  if (status === 'red') return 'danger';
  if (status === 'yellow') return 'warning';
  if (status === 'green') return 'success';
  return 'neutral';
}

function getQueueBorderColor(status: 'red' | 'yellow' | 'green'): string {
  if (status === 'red') return 'var(--joy-palette-danger-outlinedBorder)';
  if (status === 'yellow') return 'var(--joy-palette-warning-outlinedBorder)';
  if (status === 'green') return 'var(--joy-palette-success-outlinedBorder)';
  return 'var(--joy-palette-divider)';
}
