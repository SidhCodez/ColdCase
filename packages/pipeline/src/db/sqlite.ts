import initSqlJs, { Database } from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';

let dbInstance: Database | null = null;
let dbPathInstance: string = '.cache/coldcase.db';

export async function getDatabase(dbPath: string = '.cache/coldcase.db'): Promise<Database> {
  if (dbInstance && dbPathInstance === dbPath) {
    return dbInstance;
  }

  const SQL = await initSqlJs();
  dbPathInstance = dbPath;

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  initTables(dbInstance);
  saveDatabase(dbInstance, dbPath);
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function saveDatabase(db: Database, dbPath: string = dbPathInstance): void {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}


function initTables(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS repositories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner TEXT NOT NULL,
      name TEXT NOT NULL,
      default_branch TEXT NOT NULL,
      last_fetched_sha TEXT NULL,
      fetched_at TEXT NOT NULL,
      UNIQUE (owner, name)
    );

    CREATE TABLE IF NOT EXISTS commits (
      repo_id INTEGER NOT NULL,
      sha TEXT NOT NULL,
      author TEXT NULL,
      message TEXT NOT NULL,
      committed_at TEXT NOT NULL,
      files_changed INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (repo_id, sha)
    );

    CREATE TABLE IF NOT EXISTS file_history (
      repo_id INTEGER NOT NULL,
      path TEXT NOT NULL,
      current_sha TEXT NOT NULL,
      rename_history TEXT NOT NULL DEFAULT '[]',
      change_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (repo_id, path)
    );

    CREATE TABLE IF NOT EXISTS blame (
      repo_id INTEGER NOT NULL,
      path TEXT NOT NULL,
      line_number INTEGER NOT NULL,
      commit_sha TEXT NOT NULL,
      author TEXT NULL,
      content TEXT NOT NULL,
      PRIMARY KEY (repo_id, path, line_number)
    );

    CREATE TABLE IF NOT EXISTS prs (
      repo_id INTEGER NOT NULL,
      number INTEGER NOT NULL,
      title TEXT NULL,
      body TEXT NOT NULL DEFAULT '',
      merged_at TEXT NULL,
      author TEXT NULL,
      linked_commits TEXT NOT NULL DEFAULT '[]',
      PRIMARY KEY (repo_id, number)
    );

    CREATE TABLE IF NOT EXISTS issues (
      repo_id INTEGER NOT NULL,
      number INTEGER NOT NULL,
      title TEXT NULL,
      body TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL CHECK (state IN ('open', 'closed')),
      linked_commits TEXT NOT NULL DEFAULT '[]',
      PRIMARY KEY (repo_id, number)
    );

    CREATE TABLE IF NOT EXISTS review_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_id INTEGER NOT NULL,
      pr_number INTEGER NOT NULL,
      author TEXT NULL,
      body TEXT NOT NULL,
      path TEXT NULL,
      line INTEGER NULL,
      created_at TEXT NOT NULL,
      gh_comment_id TEXT NULL,
      UNIQUE (repo_id, gh_comment_id)
    );

    CREATE TABLE IF NOT EXISTS hotspots (
      repo_id INTEGER NOT NULL,
      path TEXT NOT NULL,
      change_count INTEGER NOT NULL,
      rank INTEGER NOT NULL,
      selected_for_analysis INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (repo_id, path)
    );

    CREATE TABLE IF NOT EXISTS narratives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_id INTEGER NOT NULL,
      path TEXT NOT NULL,
      narrative_json TEXT NOT NULL,
      model_used TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      UNIQUE (repo_id, path)
    );

    CREATE TABLE IF NOT EXISTS repo_synthesis (
      repo_id INTEGER PRIMARY KEY,
      timeline_json TEXT NOT NULL,
      model_used TEXT NOT NULL,
      generated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS verification (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      narrative_id INTEGER NOT NULL,
      claim_id TEXT NOT NULL,
      verdict TEXT NOT NULL CHECK (verdict IN ('supported', 'partial', 'unsupported')),
      reason TEXT NULL,
      verified_at TEXT NOT NULL,
      UNIQUE (narrative_id, claim_id)
    );

    CREATE TABLE IF NOT EXISTS cache_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}
