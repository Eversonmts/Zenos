
import { openDB, IDBPDatabase } from 'idb';
import { FinancialData } from '../types';

const DB_NAME = 'zenos_test_db';
const STORE_NAME = 'test_data';
const DB_VERSION = 1;

interface ZenosTestDB extends IDBPDatabase {
  test_data: {
    key: string;
    value: FinancialData;
  };
}

class TestDbService {
  private dbPromise: Promise<IDBPDatabase>;

  constructor() {
    this.dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }

  async saveData(userId: string, data: FinancialData): Promise<void> {
    const db = await this.dbPromise;
    await db.put(STORE_NAME, data, userId);
  }

  async getData(userId: string): Promise<FinancialData | null> {
    const db = await this.dbPromise;
    return (await db.get(STORE_NAME, userId)) || null;
  }

  async clearData(userId: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete(STORE_NAME, userId);
  }
}

export const testDb = new TestDbService();
