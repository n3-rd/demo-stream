import type { RequestEvent } from '@sveltejs/kit';
import { query } from './db';
import crypto from 'crypto';
import argon2 from 'argon2';

// simple in-memory session store (dev only)
const sessionStore: Map<string, any> = new Map();
// cache table columns to filter unknown fields
const tableColumnsCache: Map<string, Set<string>> = new Map();

async function getTableColumns(table: string): Promise<Set<string>> {
  const cached = tableColumnsCache.get(table);
  if (cached) return cached;
  const { rows } = await query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
    [table]
  );
  const set = new Set(rows.map((r) => r.column_name));
  tableColumnsCache.set(table, set);
  return set;
}

// Minimal auth store compatible with existing code expectations
class AuthStoreShim {
  token: string | null = null;
  model: any = null;

  get isValid() {
    return !!this.model && !!this.token;
  }

  loadFromCookie(cookieHeader: string | null) {
    if (!cookieHeader) return;
    const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
      const [k, ...rest] = c.trim().split('=');
      return [decodeURIComponent(k), decodeURIComponent(rest.join('='))];
    }));
    this.token = cookies['session'] || null;
    if (this.token) {
      const user = sessionStore.get(this.token);
      if (user) this.model = user;
    }
  }

  exportToCookie({ secure = true, maxAge = 1800 }: { secure?: boolean; maxAge?: number } = {}) {
    if (!this.token) return '';
    const parts = [
      `session=${encodeURIComponent(this.token)}`,
      'Path=/',
      'HttpOnly',
      `Max-Age=${maxAge}`,
      secure ? 'Secure' : ''
    ].filter(Boolean);
    return parts.join('; ');
  }

  clear() {
    this.token = null;
    this.model = null;
  }

  save(token: string, model: any) {
    this.token = token;
    this.model = model;
  }
}

function splitExpand(expand?: string): string[] {
  if (!expand) return [];
  return expand.split(',').map(s => s.trim()).filter(Boolean);
}

function mapSortField(sort?: string): string | undefined {
  if (!sort) return undefined;
  const field = sort.replace('-', '');
  const mapped = field === 'created' ? 'created_at' : field === 'updated' ? 'updated_at' : field;
  const direction = sort.startsWith('-') ? 'DESC' : 'ASC';
  return `${mapped} ${direction}`;
}

async function fetchByIds(table: string, ids: string[], fields?: string) {
  if (!ids.length) return [];
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
  const columns = fields || '*';
  const { rows } = await query(`SELECT ${columns} FROM ${table} WHERE id IN (${placeholders})`, ids);
  return rows;
}

function resolveRelatedTable(parent: string, key: string): string | null {
  // explicit mappings first
  if (key === 'representative') return 'representatives';
  if (key === 'company' || key === 'owner_company' || key === 'user_id') return 'users';
  if (key === 'location') return 'locations';
  if (key === 'host_content' || key === 'representative_content' || key === 'connected_content') return 'content_library';
  if (key === 'training_files') return 'content_library';
  // naive pluralization fallback: add 's'
  if (key && key[key.length - 1] !== 's') return `${key}s`;
  return key || null;
}

// Simple query builder per-collection
class CollectionShim {
  constructor(private name: string) {}

  async getFullList<T = any>({ filter, sort, fields, expand }: { filter?: string; sort?: string; fields?: string; expand?: string } = {}): Promise<T[]> {
    // equality-only filters joined by &&
    let where = '';
    const params: any[] = [];
    if (filter) {
      const clauses = filter.split('&&').map(s => s.trim()).filter(Boolean);
      if (clauses.length) {
        const sqlClauses = clauses.map((clause) => {
          const m = clause.match(/^(\w+)\s*=\s*"([^"]*)"$/);
          if (!m) return null;
          const [, field, value] = m;
          params.push(value);
          return `${field} = $${params.length}`;
        }).filter(Boolean) as string[];
        if (sqlClauses.length) where = `WHERE ${sqlClauses.join(' AND ')}`;
      }
    }
    const orderExpr = mapSortField(sort);
    const order = orderExpr ? `ORDER BY ${orderExpr}` : '';
    const columns = fields || '*';
    const { rows } = await query(`SELECT ${columns} FROM ${this.name} ${where} ${order}`.trim(), params);

    // inject collectionId and created/updated aliases for UI compatibility
    const withCollectionId = (rows as any[]).map(r => ({
      ...r,
      collectionId: this.name,
      created: (r as any).created_at ?? (r as any).created,
      updated: (r as any).updated_at ?? (r as any).updated
    }));

    const expandKeys = splitExpand(expand);
    if (!expandKeys.length) return withCollectionId as T[];

    const expandedRows = [] as any[];
    for (const row of withCollectionId) {
      const expandObj: Record<string, any> = {};
      for (const key of expandKeys) {
        const value = (row as any)[key];
        if (!value) continue;
        const relatedTable = resolveRelatedTable(this.name, key);
        if (!relatedTable) continue;
        try {
          if (Array.isArray(value)) {
            expandObj[key] = await fetchByIds(relatedTable, value.map(String));
          } else {
            const list = await fetchByIds(relatedTable, [String(value)]);
            expandObj[key] = list[0] || null;
          }
        } catch (e) {
          // skip unknown table/expand errors to avoid breaking list
          continue;
        }
      }
      expandedRows.push({ ...row, expand: expandObj });
    }
    return expandedRows as T[];
  }

  async getList<T = any>(page = 1, perPage = 20, opts: { filter?: string; sort?: string; fields?: string; expand?: string } = {}) {
    const items = await this.getFullList<T>({ filter: opts.filter, sort: opts.sort, fields: opts.fields, expand: opts.expand });
    return {
      page,
      perPage,
      totalItems: items.length as number,
      totalPages: Math.max(1, Math.ceil((items.length as number) / perPage)),
      items: (items as any[]).slice((page - 1) * perPage, (page - 1) * perPage + perPage),
    };
  }

  async getOne<T = any>(id: string, { fields, expand }: { fields?: string; expand?: string } = {}): Promise<T> {
    const columns = fields || '*';
    const { rows } = await query(`SELECT ${columns} FROM ${this.name} WHERE id = $1 LIMIT 1`, [id]);
    if (!rows[0]) throw new Error('not found');
    const rowBase = rows[0] as any;
    const row = { ...rowBase, collectionId: this.name, created: rowBase.created_at ?? rowBase.created, updated: rowBase.updated_at ?? rowBase.updated };
    const expandKeys = splitExpand(expand);
    if (!expandKeys.length) return row as T;
    const expandObj: Record<string, any> = {};
    for (const key of expandKeys) {
      const value = (row as any)[key];
      if (!value) continue;
      const relatedTable = resolveRelatedTable(this.name, key);
      if (!relatedTable) continue;
      try {
        if (Array.isArray(value)) {
          expandObj[key] = await fetchByIds(relatedTable, value.map(String));
        } else {
          const list = await fetchByIds(relatedTable, [String(value)]);
          expandObj[key] = list[0] || null;
        }
      } catch (e) {
        // ignore
      }
    }
    return { ...row, expand: expandObj } as T;
  }

  async getFirstListItem<T = any>(filter: string, { fields, sort, expand }: { fields?: string; sort?: string; expand?: string } = {}): Promise<T> {
    const list = await this.getFullList<T>({ filter, fields, sort, expand });
    if (!list[0]) throw new Error('not found');
    return list[0];
  }

  async create<T = any>(data: any): Promise<T> {
    const columnsSet = await getTableColumns(this.name);
    const copy: Record<string, any> = { ...data };
    // hash password for users table
    if (this.name === 'users' && typeof copy.password === 'string' && copy.password.length > 0) {
      copy.password = await argon2.hash(copy.password);
    }
    const filteredEntries = Object.entries(copy).filter(([k]) => columnsSet.has(k));
    const keys = filteredEntries.map(([k]) => k);
    const values = filteredEntries.map(([, v]) => v);
    if (keys.length === 0) throw new Error('no valid columns in create payload');
    const placeholders = values.map((_, i) => `$${i + 1}`);
    const { rows } = await query(
      `INSERT INTO ${this.name} (${keys.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
      values
    );
    const row = rows[0] as any;
    return { ...row, collectionId: this.name } as T;
  }

  async update<T = any>(id: string, data: any): Promise<T> {
    const columnsSet = await getTableColumns(this.name);
    const copy: Record<string, any> = { ...data };
    if (this.name === 'users' && typeof copy.password === 'string' && copy.password.length > 0) {
      copy.password = await argon2.hash(copy.password);
    }
    const filteredEntries = Object.entries(copy).filter(([k]) => columnsSet.has(k));
    if (filteredEntries.length === 0) {
      // nothing to update; return current row
      return await this.getOne<T>(id);
    }
    const keys = filteredEntries.map(([k]) => k);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`);
    const values = filteredEntries.map(([, v]) => v);
    values.push(id);
    const { rows } = await query(
      `UPDATE ${this.name} SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    const row = rows[0] as any;
    return { ...row, collectionId: this.name } as T;
  }

  async delete(id: string): Promise<void> {
    await query(`DELETE FROM ${this.name} WHERE id = $1`, [id]);
  }
}

class PBShim {
  authStore = new AuthStoreShim();

  collection(name: string) {
    return new CollectionShim(name);
  }

  // Only used by login flows in codebase
  async authWithPassword(email: string, password: string) {
    const { rows } = await query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
    const user = rows[0];
    if (!user) throw new Error('invalid credentials');
    // verify argon2 password
    if (!(await argon2.verify(user.password, password))) throw new Error('invalid credentials');
    const token = crypto.randomBytes(32).toString('hex');
    sessionStore.set(token, user);
    this.authStore.save(token, user);
    return { token, record: user };
  }

  async createSessionForUser(userId: string) {
    const { rows } = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
    const user = rows[0];
    if (!user) throw new Error('user not found');
    const token = crypto.randomBytes(32).toString('hex');
    sessionStore.set(token, user);
    this.authStore.save(token, user);
    return { token, record: user };
  }
}

export const pb = new PBShim(); 