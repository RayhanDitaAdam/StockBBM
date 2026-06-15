import fs from 'fs/promises';
import path from 'path';

export interface SPBU {
  id: string;
  name: string;
  brand: 'Pertamina' | 'Shell' | 'BP' | 'Vivo';
  address: string;
  lat: number;
  lng: number;
}

export interface Report {
  id: string;
  spbuId: string;
  queueStatus: 'red' | 'yellow' | 'green';
  emptyBbm: string[];
  photoUrl: string; // base64 data URI
  qrisUrl: string; // base64 data URI
  deviceFingerprint: string;
  createdAt: string;
  confirmsCount: number;
}

export interface Confirmation {
  reportId: string;
  deviceFingerprint: string;
  createdAt: string;
}

export interface DatabaseSchema {
  spbus: SPBU[];
  reports: Report[];
  confirmations: Confirmation[];
}

const DB_PATH = path.join(process.cwd(), 'data', 'stockbbm.json');

// Pre-seeded SPBUs with real locations in Mojokerto
const INITIAL_SPBUS: SPBU[] = [
  {
    id: 'spbu-1',
    name: 'SPBU Pertamina 54.613.01 Bypass',
    brand: 'Pertamina',
    address: 'Jl. Raya By Pass, Kel. Kedundung, Magersari, Mojokerto 61315',
    lat: -7.481500,
    lng: 112.428600,
  },
  {
    id: 'spbu-2',
    name: 'SPBU Pertamina 54.613.02 Jabon',
    brand: 'Pertamina',
    address: 'Jl. Raya Jabon, Gayaman, Mojoanyar, Kab. Mojokerto 61364',
    lat: -7.482800,
    lng: 112.458900,
  },
  {
    id: 'spbu-3',
    name: 'SPBU Pertamina 54.613.06 Bhayangkara',
    brand: 'Pertamina',
    address: 'Jl. Bhayangkara No. 48, Jagalan, Magersari, Kota Mojokerto 61322',
    lat: -7.468200,
    lng: 112.433200,
  },
  {
    id: 'spbu-4',
    name: 'SPBU Pertamina 54.613.27 Jasem Ngoro',
    brand: 'Pertamina',
    address: 'Jl. Jasem, Ngoro, Kab. Mojokerto 61385',
    lat: -7.576800,
    lng: 112.618900,
  },
  {
    id: 'spbu-5',
    name: 'SPBU Pertamina 54.613.28 Gajah Mada',
    brand: 'Pertamina',
    address: 'Jl. Gajah Mada No.55, Gedongan, Magersari, Kota Mojokerto 61314',
    lat: -7.463500,
    lng: 112.441800,
  },
  {
    id: 'spbu-6',
    name: 'SPBU Pertamina 54.613.32 Empunala',
    brand: 'Pertamina',
    address: 'Jl. Empunala No.529, Mergelo, Kedundung, Magersari, Kota Mojokerto 61316',
    lat: -7.468600,
    lng: 112.451200,
  },
  {
    id: 'spbu-7',
    name: 'SPBU Pertamina 54.613.33 Trowulan',
    brand: 'Pertamina',
    address: 'Jl. Domas, Trowulan, Kab. Mojokerto 61362',
    lat: -7.551200,
    lng: 112.378900,
  },
  {
    id: 'spbu-8',
    name: 'SPBU Pertamina 54.613.35 Bypass Lengkong',
    brand: 'Pertamina',
    address: 'Jl. Raya By Pass, Lengkong, Mojoanyar, Kab. Mojokerto 61364',
    lat: -7.461500,
    lng: 112.458200,
  },
  {
    id: 'spbu-9',
    name: 'SPBU Pertamina 58.613.23 Jetis',
    brand: 'Pertamina',
    address: 'Jl. Mager Sari-Ngares Kidul No.14, Jetis, Kab. Mojokerto 61352',
    lat: -7.412500,
    lng: 112.482100,
  },
  {
    id: 'spbu-10',
    name: 'SPBU Pertamina 5461314 Sedati Ngoro',
    brand: 'Pertamina',
    address: 'Jl. Raya Ngoro No.1, Sedati, Ngoro, Kab. Mojokerto 61385',
    lat: -7.581500,
    lng: 112.625600,
  },
  {
    id: 'spbu-11',
    name: 'SPBU Pertamina 5461308 Watesnegoro',
    brand: 'Pertamina',
    address: 'Ds. Watesnegoro, Ngoro, Kab. Mojokerto 61385',
    lat: -7.574200,
    lng: 112.601200,
  },
  {
    id: 'spbu-12',
    name: 'SPBU Pertamina 5461315 Jayanegara',
    brand: 'Pertamina',
    address: 'Jl. Jayanegara No. 30, Banjaragung, Puri, Kab. Mojokerto 61364',
    lat: -7.489500,
    lng: 112.448500,
  },
  {
    id: 'spbu-13',
    name: 'SPBU Pertamina Rest Area 51.611.41 Tol',
    brand: 'Pertamina',
    address: 'Rest Area Tol Surabaya-Mojokerto KM 725A, Jetis, Kab. Mojokerto 61352',
    lat: -7.391200,
    lng: 112.518900,
  },
  {
    id: 'spbu-jakarta-1',
    name: 'SPBU Pertamina 31.107.01 Samanhudi',
    brand: 'Pertamina',
    address: 'Jl. H. Samanhudi No.20, Pasar Baru, Sawah Besar, Kota Jakarta Pusat, DKI Jakarta 10710',
    lat: -6.162700,
    lng: 106.832200,
  },
  {
    id: 'spbu-pekanbaru-1',
    name: 'SPBU Pertamina 14.281.21 Ababil',
    brand: 'Pertamina',
    address: 'Jl. Ababil No.10, Kp. Melayu, Kec. Sukajadi, Kota Pekanbaru, Riau 28122',
    lat: 0.518600,
    lng: 101.439800,
  },
  {
    id: 'spbu-bandung-1',
    name: 'SPBU Pertamina 34.402.02 BKR Lingkar Selatan',
    brand: 'Pertamina',
    address: 'Jl. BKR No.362, Lingkar Selatan, Kec. Regol, Kota Bandung, Jawa Barat 40253',
    lat: -6.937800,
    lng: 107.618600,
  },
  {
    id: 'spbu-balikpapan-1',
    name: 'SPBU Pertamina 64.761.05 DI Panjaitan',
    brand: 'Pertamina',
    address: 'Jl. DI Panjaitan, Gunung Sari Ulu, Kec. Balikpapan Tengah, Kota Balikpapan, Kalimantan Timur 76122',
    lat: -1.246400,
    lng: 116.843000,
  },
  {
    id: 'spbu-aceh-1',
    name: 'SPBU Pertamina 14.237.56 Simpang Kanan',
    brand: 'Pertamina',
    address: 'Jalan Lipat Kajang Atas, Kec. Simpang Kanan, Kab. Aceh Singkil, Aceh 24791',
    lat: 2.378900,
    lng: 98.012500,
  }
];

// Ensure database file and directory exist
async function ensureDb(): Promise<void> {
  const dir = path.dirname(DB_PATH);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {}

  try {
    await fs.access(DB_PATH);
  } catch (err) {
    const initialDb: DatabaseSchema = {
      spbus: INITIAL_SPBUS,
      reports: [],
      confirmations: []
    };
    await fs.writeFile(DB_PATH, JSON.stringify(initialDb, null, 2), 'utf-8');
  }
}

// Read and automatically prune expired reports (TTL 1 hour)
export async function getDb(): Promise<DatabaseSchema> {
  await ensureDb();
  const rawData = await fs.readFile(DB_PATH, 'utf-8');
  let db: DatabaseSchema;
  
  try {
    db = JSON.parse(rawData);
  } catch (err) {
    // If corrupted, reset
    db = { spbus: INITIAL_SPBUS, reports: [], confirmations: [] };
  }

  // Overwrite or update SPBUs in existing database if new ones were added in code
  if (!db.spbus || db.spbus.length < INITIAL_SPBUS.length) {
    db.spbus = INITIAL_SPBUS;
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  }

  // TTL: 1 Hour (3,600,000 milliseconds)
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const now = new Date();
  
  const activeReports = db.reports.filter(report => {
    const reportTime = new Date(report.createdAt);
    return now.getTime() - reportTime.getTime() < ONE_HOUR_MS;
  });

  const activeReportIds = new Set(activeReports.map(r => r.id));

  // Prune confirmations associated with deleted/expired reports
  const activeConfirmations = db.confirmations.filter(conf => 
    activeReportIds.has(conf.reportId)
  );

  // If any reports were pruned, write back to disk to save space
  if (activeReports.length !== db.reports.length) {
    db.reports = activeReports;
    db.confirmations = activeConfirmations;
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  }

  return db;
}

// Write database back to disk
export async function saveDb(db: DatabaseSchema): Promise<void> {
  await ensureDb();
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}
