const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const authMiddleware = require('../middleware/auth');
const { validateStudentQuery, validateWardenQuery } = require('../utils/sqlValidator');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * POST /query
 * Execute SQL queries with role-based access control
 */
router.post('/query', authMiddleware, async (req, res) => {
  try {
    const { sql, panelContext } = req.body;
    const { role, roll_id } = req.user;

    if (!sql || !sql.trim()) {
      return res.status(400).json({ error: 'No query provided.' });
    }

    const trimmedSql = sql.trim();

    let validation;

    if (role === 'student') {
      validation = validateStudentQuery(trimmedSql, roll_id);
    } else if (role === 'warden') {
      validation = validateWardenQuery(trimmedSql);
    } else {
      return res.status(403).json({ error: 'Invalid role.' });
    }

    if (!validation.allowed) {
      return res.json({ error: validation.error, rows: null });
    }

    // Handle special student operations
    if (validation.type === 'ROOM_ASSIGN') {
      return handleRoomAssignment(roll_id, res);
    }

    if (validation.type === 'COMPLAINT') {
      return handleComplaint(roll_id, validation.complaintText, res);
    }

    if (validation.type === 'MESS_ASSIGN') {
      return handleMessAssignment(roll_id, validation.messType, res);
    }

    // Execute the query
    const queryToExecute = validation.modifiedSql;

    if (validation.type === 'SELECT') {
      // Use the execute_sql function for SELECT queries
      const { data, error } = await supabase.rpc('execute_sql', {
        query_text: queryToExecute
      });

      if (error) {
        return res.json({ error: `Query error: ${error.message}`, rows: null });
      }

      // Check if the function returned an error
      if (data && data.error) {
        return res.json({ error: prettifyError(data.error), rows: null });
      }

      return res.json({ rows: data || [], error: null });
    } else {
      // INSERT, UPDATE, DELETE — use execute_sql_mutation
      const { data, error } = await supabase.rpc('execute_sql_mutation', {
        query_text: queryToExecute
      });

      if (error) {
        return res.json({ error: `Query error: ${error.message}`, rows: null });
      }

      if (data && data.error) {
        return res.json({ error: prettifyError(data.error), rows: null });
      }

      return res.json({
        rows: null,
        message: `Query executed successfully. ${data?.affected_rows || 0} row(s) affected.`,
        error: null
      });
    }
  } catch (err) {
    console.error('Query execution error:', err);
    res.status(500).json({ error: 'Server error while executing query.' });
  }
});

/**
 * Handle FCFS room assignment for students
 */
async function handleRoomAssignment(rollId, res) {
  try {
    // Check if student already has a room
    const { data: student } = await supabase
      .from('students')
      .select('room_no')
      .eq('roll_id', rollId)
      .single();

    if (student?.room_no) {
      return res.json({
        error: `You are already assigned to Room ${student.room_no}. You cannot request another room.`,
        rows: null
      });
    }

    // Find first available room (FCFS)
    const { data: availableRoom, error: roomError } = await supabase
      .from('rooms')
      .select('room_no, current_occupancy')
      .lt('current_occupancy', 2)
      .order('room_no', { ascending: true })
      .limit(1)
      .single();

    if (roomError || !availableRoom) {
      return res.json({
        error: 'No rooms available at the moment. All rooms are fully occupied.',
        rows: null
      });
    }

    // Assign room to student
    const { error: updateStudentError } = await supabase
      .from('students')
      .update({ room_no: availableRoom.room_no })
      .eq('roll_id', rollId);

    if (updateStudentError) {
      return res.json({ error: 'Failed to assign room. Please try again.', rows: null });
    }

    return res.json({
      rows: null,
      message: `✅ Room ${availableRoom.room_no} has been assigned to you! (Occupancy will update automatically)`,
      error: null
    });
  } catch (err) {
    console.error('Room assignment error:', err);
    return res.json({ error: 'Server error during room assignment.', rows: null });
  }
}

/**
 * Handle mess assignment requests
 */
async function handleMessAssignment(rollId, messType, res) {
  try {
    const { data: existing } = await supabase
      .from('mess_allotment')
      .select('roll_id')
      .eq('roll_id', rollId)
      .single();

    if (existing) {
      return res.json({ error: 'You have already applied for mess allotment.', rows: null });
    }

    const { error } = await supabase
      .from('mess_allotment')
      .insert({
        roll_id: rollId,
        mess_type: messType,
        status: 'pending'
      });

    if (error) {
      return res.json({ error: `Failed to apply: ${error.message}`, rows: null });
    }

    return res.json({
      rows: null,
      message: `✅ Successfully applied for ${messType === 'V' ? 'Veg' : 'Non-Veg'} mess. Waiting for warden approval.`,
      error: null
    });
  } catch (err) {
    console.error('Mess assignment error:', err);
    return res.json({ error: 'Server error during mess application.', rows: null });
  }
}

/**
 * Handle complaint filing for students
 */
async function handleComplaint(rollId, complaintText, res) {
  try {
    const { data, error } = await supabase
      .from('complaints')
      .insert({
        roll_id: rollId,
        complaint_text: complaintText,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      return res.json({ error: `Failed to file complaint: ${error.message}`, rows: null });
    }

    return res.json({
      rows: null,
      message: `✅ Complaint filed successfully! ID: ${data.complaint_id}`,
      error: null
    });
  } catch (err) {
    console.error('Complaint error:', err);
    return res.json({ error: 'Server error while filing complaint.', rows: null });
  }
}

/**
 * Convert PostgreSQL errors to human-readable messages
 */
function prettifyError(pgError) {
  const errorMap = {
    'relation': 'Table does not exist.',
    'column': 'Column does not exist.',
    'syntax': 'SQL syntax error. Please check your query.',
    'permission denied': 'You do not have permission to perform this action.',
    'violates': 'Data constraint violation. Please check your values.',
    'duplicate key': 'A record with this key already exists.',
    'null value': 'Required field cannot be empty.',
    'foreign key': 'Referenced record does not exist.'
  };

  const lowerError = pgError.toLowerCase();
  for (const [key, message] of Object.entries(errorMap)) {
    if (lowerError.includes(key)) {
      return `${message}\n(Detail: ${pgError})`;
    }
  }

  return pgError;
}

module.exports = router;
