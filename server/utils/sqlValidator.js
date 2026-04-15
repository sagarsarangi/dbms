const { Parser } = require('node-sql-parser');

const parser = new Parser();

// Tables that students can query
const ALLOWED_TABLES = ['students', 'rooms', 'mess_allotment', 'complaints', 'whitelist'];

// Tables that are completely off-limits
const SYSTEM_TABLES = ['pg_', 'information_schema', 'auth.', 'storage.', 'vault.', 'supabase_'];

/**
 * Parse SQL and extract metadata
 */
function parseSQL(sql) {
  try {
    // Clean up the SQL
    const cleanSql = sql.trim().replace(/;$/, '');
    const ast = parser.astify(cleanSql, { database: 'PostgreSQL' });
    
    // Handle single statement (not array)
    const statement = Array.isArray(ast) ? ast[0] : ast;
    
    return {
      success: true,
      type: statement.type ? statement.type.toUpperCase() : null,
      ast: statement,
      tables: extractTableNames(statement)
    };
  } catch (err) {
    return {
      success: false,
      error: `SQL syntax error: ${err.message.split('\n')[0]}`
    };
  }
}

/**
 * Extract table names from AST
 */
function extractTableNames(ast) {
  const tables = new Set();
  
  if (!ast) return [];

  // FROM clause
  if (ast.from) {
    ast.from.forEach(f => {
      if (f.table) tables.add(f.table.toLowerCase());
    });
  }
  
  // Table for INSERT/UPDATE/DELETE
  if (ast.table) {
    if (Array.isArray(ast.table)) {
      ast.table.forEach(t => {
        if (t.table) tables.add(t.table.toLowerCase());
      });
    } else if (typeof ast.table === 'string') {
      tables.add(ast.table.toLowerCase());
    }
  }

  // INTO clause for INSERT
  if (ast.into && ast.into.table) {
    tables.add(ast.into.table.toLowerCase());
  }
  
  return [...tables];
}

/**
 * Check if query accesses system tables
 */
function accessesSystemTables(tables, sql) {
  const lowerSql = sql.toLowerCase();
  
  for (const prefix of SYSTEM_TABLES) {
    if (lowerSql.includes(prefix)) return true;
  }
  
  for (const table of tables) {
    for (const prefix of SYSTEM_TABLES) {
      if (table.startsWith(prefix)) return true;
    }
  }
  
  return false;
}

/**
 * Validate SQL for student role
 */
function validateStudentQuery(sql, rollId) {
  const normSql = sql.toLowerCase().trim().replace(/;$/, '');

  // 1. Check for special shorthand commands before strict parsing
  if (normSql === 'insert into rooms' || normSql === 'insert into rooms;') {
    return {
      allowed: true,
      type: 'ROOM_ASSIGN',
      modifiedSql: null
    };
  }
  
  const messMatch = normSql.match(/^insert\s+into\s+mess\s+values\s*\(\s*'([nv])'\s*\);?$/i);
  if (messMatch) {
    return {
      allowed: true,
      type: 'MESS_ASSIGN',
      messType: messMatch[1].toUpperCase(),
      rollId
    };
  }

  const parsed = parseSQL(sql);
  
  if (!parsed.success) {
    return { allowed: false, error: parsed.error };
  }
  
  const { type, tables } = parsed;
  
  // Check system table access
  if (accessesSystemTables(tables, sql)) {
    return { allowed: false, error: 'You do not have permission to access system tables.' };
  }
  
  // SELECT is allowed (with WHERE injection)
  if (type === 'SELECT') {
    // Check if tables are valid
    for (const table of tables) {
      if (!ALLOWED_TABLES.includes(table)) {
        return { allowed: false, error: `Table '${table}' does not exist.` };
      }
    }

    // Auto-append WHERE roll_id filter for student-specific tables
    const studentTables = ['students', 'mess_allotment', 'complaints'];
    const needsFilter = tables.some(t => studentTables.includes(t));
    const queryingRooms = tables.includes('rooms') && !needsFilter; // If only querying rooms
    
    if (needsFilter || queryingRooms) {
      const cleanSql = sql.trim().replace(/;$/, '');
      const lowerSql = cleanSql.toLowerCase();
      
      // Determine the correct WHERE condition to append depending on the table
      const filterCondition = queryingRooms 
        ? `room_no = (SELECT room_no FROM students WHERE roll_id = '${rollId}')` 
        : `roll_id = '${rollId}'`;
      
      // Check if WHERE clause already exists
      if (lowerSql.includes('where')) {
        return {
          allowed: true,
          modifiedSql: `${cleanSql.replace(/where/i, `WHERE ${filterCondition} AND`)}`,
          type: 'SELECT'
        };
      } else {
        return {
          allowed: true,
          modifiedSql: `${cleanSql} WHERE ${filterCondition}`,
          type: 'SELECT'
        };
      }
    }
    
    return { allowed: true, modifiedSql: sql.trim().replace(/;$/, ''), type: 'SELECT' };
  }
  
  // INSERT INTO rooms — room assignment
  if (type === 'INSERT' && tables.includes('rooms')) {
    return { allowed: true, type: 'ROOM_ASSIGN', rollId };
  }
  
  // INSERT INTO complaints — file complaint
  if (type === 'INSERT' && tables.includes('complaints')) {
    // Extract complaint text from the query
    const match = sql.match(/VALUES\s*\(\s*'([^']+)'\s*\)/i);
    if (!match) {
      return { allowed: false, error: "Invalid complaint format. Use: INSERT INTO complaints VALUES ('your complaint here')" };
    }
    return { allowed: true, type: 'COMPLAINT', complaintText: match[1], rollId };
  }

  // (MESS_ASSIGN is handled via shorthand string matching above)
  
  // Everything else is blocked for students
  return { allowed: false, error: 'You do not have permission to run this command.' };
}

/**
 * Validate SQL for warden role
 */
function validateWardenQuery(sql) {
  const parsed = parseSQL(sql);
  
  if (!parsed.success) {
    return { allowed: false, error: parsed.error };
  }
  
  const { type, tables } = parsed;
  const lowerSql = sql.toLowerCase().trim();
  
  // Block dangerous operations
  if (['DROP', 'ALTER', 'TRUNCATE'].includes(type) || 
      lowerSql.startsWith('drop') || 
      lowerSql.startsWith('alter') || 
      lowerSql.startsWith('truncate')) {
    return { allowed: false, error: 'DROP, ALTER, and TRUNCATE operations are not allowed.' };
  }
  
  // Check system table access
  if (accessesSystemTables(tables, sql)) {
    return { allowed: false, error: 'You do not have permission to access system tables.' };
  }
  
  // Check valid tables
  for (const table of tables) {
    if (!ALLOWED_TABLES.includes(table)) {
      return { allowed: false, error: `Table '${table}' does not exist.` };
    }
  }
  
  // 1. Block ANY manual modification of the 'rooms' table
  if (tables.includes('rooms') && (type === 'UPDATE' || type === 'DELETE' || type === 'INSERT')) {
    return { allowed: false, error: 'The "rooms" table is managed automatically and cannot be modified manually.' };
  }

  // 2. Block manual modification of student room assignments
  if (tables.includes('students') && type === 'UPDATE') {
    if (lowerSql.includes('room_no')) {
      return { allowed: false, error: 'You cannot manually change room assignments. Please use the official room application system or remove the student from the hostel to free their room.' };
    }
  }
  
  // SELECT, INSERT (non-room), UPDATE (non-room), DELETE are allowed
  if (['SELECT', 'INSERT', 'UPDATE', 'DELETE'].includes(type)) {
    return {
      allowed: true,
      modifiedSql: sql.trim().replace(/;$/, ''),
      type
    };
  }
  
  return { allowed: false, error: 'This operation is not supported.' };
}

module.exports = { parseSQL, validateStudentQuery, validateWardenQuery };
