import { openDB, DBSchema } from 'idb';

interface DamageMapperDB extends DBSchema {
  offline_reports: {
    key: string;
    value: {
      id: string;
      raw_description: string;
      latitude?: number;
      longitude?: number;
      is_gps: boolean;
      is_reporting_for_other: boolean;
      reporter_contact?: string;
      photo_blob?: Blob;
      created_at: number;
    };
  };
  sos_dispatches: {
    key: string;
    value: {
      id: string;
      description: string;
      latitude?: number;
      longitude?: number;
      accuracy?: number;
      timestamp: string;
      created_at: number;
      recipients: string;
      message_body: string;
    };
  };
}

const DB_NAME = 'damage-mapper-offline-db';
const DB_VERSION = 2;

export async function getOfflineDB() {
  return openDB<DamageMapperDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('offline_reports')) {
        db.createObjectStore('offline_reports', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('sos_dispatches')) {
        db.createObjectStore('sos_dispatches', { keyPath: 'id' });
      }
    },
  });
}

export async function saveReportOffline(report: {
  raw_description: string;
  latitude?: number;
  longitude?: number;
  is_gps: boolean;
  is_reporting_for_other: boolean;
  reporter_contact?: string;
  photo_blob?: Blob;
}) {
  const db = await getOfflineDB();
  const id = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  await db.put('offline_reports', {
    ...report,
    id,
    created_at: Date.now(),
  });
  return id;
}

export async function getPendingOfflineReports() {
  const db = await getOfflineDB();
  return db.getAll('offline_reports');
}

export async function removeOfflineReport(id: string) {
  const db = await getOfflineDB();
  return db.delete('offline_reports', id);
}

export async function saveSosDispatchOffline(dispatch: {
  description: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  timestamp: string;
  recipients: string;
  message_body: string;
}) {
  const db = await getOfflineDB();
  const id = `sos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  await db.put('sos_dispatches', {
    ...dispatch,
    id,
    created_at: Date.now(),
  });
  return id;
}

export async function getOfflineSosDispatches() {
  const db = await getOfflineDB();
  return db.getAll('sos_dispatches');
}
