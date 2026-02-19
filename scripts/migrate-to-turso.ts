import { createClient } from "@libsql/client";

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// SQL to create tables (SQLite syntax)
const createTablesSql = `
-- User table
CREATE TABLE IF NOT EXISTS User (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  createdAt TEXT DEFAULT (datetime('now'))
);

-- Project table
CREATE TABLE IF NOT EXISTS Project (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nameTranslations TEXT,
  description TEXT,
  descriptionTranslations TEXT,
  address TEXT,
  addressTranslations TEXT,
  coverImage TEXT,
  topViewImage TEXT,
  latitude REAL,
  longitude REAL,
  infrastructure TEXT,
  createdAt TEXT DEFAULT (datetime('now'))
);

-- Building table
CREATE TABLE IF NOT EXISTS Building (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nameTranslations TEXT,
  projectId TEXT NOT NULL,
  frontViewImage TEXT,
  backViewImage TEXT,
  leftViewImage TEXT,
  rightViewImage TEXT,
  positionData TEXT,
  polygonData TEXT,
  sortOrder INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE
);

-- Floor table
CREATE TABLE IF NOT EXISTS Floor (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL,
  buildingId TEXT NOT NULL,
  basePricePerM2 REAL,
  floorPlanImage TEXT,
  positionData TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (buildingId) REFERENCES Building(id) ON DELETE CASCADE
);

-- Unit table
CREATE TABLE IF NOT EXISTS Unit (
  id TEXT PRIMARY KEY,
  unitNumber TEXT NOT NULL,
  floorId TEXT NOT NULL,
  rooms INTEGER NOT NULL,
  area REAL NOT NULL,
  status TEXT DEFAULT 'available',
  pricePerM2 REAL,
  totalPrice REAL,
  svgPathId TEXT,
  polygonData TEXT,
  labelX REAL,
  labelY REAL,
  sketchImage TEXT,
  sketchImage2 TEXT,
  sketchImage3 TEXT,
  sketchImage4 TEXT,
  description TEXT,
  descriptionTranslations TEXT,
  features TEXT,
  customerName TEXT,
  customerPhone TEXT,
  customerNotes TEXT,
  statusChangedAt TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (floorId) REFERENCES Floor(id) ON DELETE CASCADE
);

-- Lead table
CREATE TABLE IF NOT EXISTS Lead (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  projectId TEXT,
  projectName TEXT,
  unitId TEXT,
  unitNumber TEXT,
  status TEXT DEFAULT 'new',
  notes TEXT,
  createdAt TEXT DEFAULT (datetime('now'))
);

-- HeroImage table
CREATE TABLE IF NOT EXISTS HeroImage (
  id TEXT PRIMARY KEY,
  imageUrl TEXT NOT NULL,
  sortOrder INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now'))
);

-- FAQ table
CREATE TABLE IF NOT EXISTS FAQ (
  id TEXT PRIMARY KEY,
  questionUz TEXT NOT NULL,
  questionEn TEXT NOT NULL,
  questionRu TEXT NOT NULL,
  answerUz TEXT NOT NULL,
  answerEn TEXT NOT NULL,
  answerRu TEXT NOT NULL,
  sortOrder INTEGER DEFAULT 0,
  isActive INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (datetime('now'))
);
`;

async function main() {
  console.log("🚀 Setting up Turso database...\n");

  // Execute each CREATE TABLE statement separately
  const tableStatements = [
    `CREATE TABLE IF NOT EXISTS User (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL, role TEXT DEFAULT 'admin', createdAt TEXT)`,
    `CREATE TABLE IF NOT EXISTS Project (id TEXT PRIMARY KEY, name TEXT NOT NULL, nameTranslations TEXT, description TEXT, descriptionTranslations TEXT, address TEXT, addressTranslations TEXT, coverImage TEXT, topViewImage TEXT, latitude REAL, longitude REAL, infrastructure TEXT, createdAt TEXT)`,
    `CREATE TABLE IF NOT EXISTS Building (id TEXT PRIMARY KEY, name TEXT NOT NULL, nameTranslations TEXT, projectId TEXT NOT NULL, frontViewImage TEXT, backViewImage TEXT, leftViewImage TEXT, rightViewImage TEXT, positionData TEXT, polygonData TEXT, sortOrder INTEGER DEFAULT 0, createdAt TEXT)`,
    `CREATE TABLE IF NOT EXISTS Floor (id TEXT PRIMARY KEY, number INTEGER NOT NULL, buildingId TEXT NOT NULL, basePricePerM2 REAL, floorPlanImage TEXT, positionData TEXT, createdAt TEXT)`,
    `CREATE TABLE IF NOT EXISTS Unit (id TEXT PRIMARY KEY, unitNumber TEXT NOT NULL, floorId TEXT NOT NULL, rooms INTEGER NOT NULL, area REAL NOT NULL, status TEXT DEFAULT 'available', pricePerM2 REAL, totalPrice REAL, svgPathId TEXT, polygonData TEXT, labelX REAL, labelY REAL, sketchImage TEXT, sketchImage2 TEXT, sketchImage3 TEXT, sketchImage4 TEXT, description TEXT, descriptionTranslations TEXT, features TEXT, customerName TEXT, customerPhone TEXT, customerNotes TEXT, statusChangedAt TEXT, createdAt TEXT, updatedAt TEXT)`,
    `CREATE TABLE IF NOT EXISTS Lead (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, projectId TEXT, projectName TEXT, unitId TEXT, unitNumber TEXT, status TEXT DEFAULT 'new', notes TEXT, createdAt TEXT)`,
    `CREATE TABLE IF NOT EXISTS HeroImage (id TEXT PRIMARY KEY, imageUrl TEXT NOT NULL, sortOrder INTEGER DEFAULT 0, createdAt TEXT)`,
    `CREATE TABLE IF NOT EXISTS FAQ (id TEXT PRIMARY KEY, questionUz TEXT NOT NULL, questionEn TEXT NOT NULL, questionRu TEXT NOT NULL, answerUz TEXT NOT NULL, answerEn TEXT NOT NULL, answerRu TEXT NOT NULL, sortOrder INTEGER DEFAULT 0, isActive INTEGER DEFAULT 1, createdAt TEXT)`,
  ];

  for (const sql of tableStatements) {
    try {
      await turso.execute(sql);
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
      console.log(`✅ Created table: ${tableName}`);
    } catch (error: any) {
      console.error(`❌ Error:`, error.message);
    }
  }

  console.log("\n✅ Turso database setup complete!");
}

main().catch(console.error);
