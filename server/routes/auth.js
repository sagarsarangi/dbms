const express = require('express');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const JWT_SECRET = process.env.JWT_SECRET;
const WARDEN_EMAIL = process.env.WARDEN_EMAIL;
const WARDEN_PASSWORD = process.env.WARDEN_PASSWORD;

/**
 * POST /auth/login
 * Login for both students and warden
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Warden login
    if (role === 'warden') {
      if (email !== WARDEN_EMAIL || password !== WARDEN_PASSWORD) {
        return res.status(401).json({ error: 'Invalid warden credentials.' });
      }

      const token = jwt.sign(
        { role: 'warden', email: WARDEN_EMAIL, name: 'Warden' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        token,
        user: { role: 'warden', email: WARDEN_EMAIL, name: 'Warden' }
      });
    }

    // Student login via Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const rollId = data.user.user_metadata?.roll_id;
    const studentName = data.user.user_metadata?.name;

    const token = jwt.sign(
      {
        role: 'student',
        roll_id: rollId,
        email: data.user.email,
        name: studentName
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: {
        role: 'student',
        roll_id: rollId,
        email: data.user.email,
        name: studentName
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

/**
 * POST /auth/signup
 * Student signup with whitelist verification
 */
router.post('/signup', async (req, res) => {
  try {
    const { roll_id, name, phone, branch, year_of_admission, email, password } = req.body;

    if (!roll_id || !name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Check whitelist
    const { data: whitelistEntry, error: whitelistError } = await supabase
      .from('whitelist')
      .select('*')
      .eq('roll_id', roll_id.toLowerCase())
      .single();

    if (whitelistError || !whitelistEntry) {
      return res.status(403).json({
        error: `Roll ID '${roll_id}' is not whitelisted. Contact the warden to be added.`
      });
    }

    // Verify name matches whitelist (case-insensitive)
    if (whitelistEntry.name.toLowerCase() !== name.toLowerCase()) {
      return res.status(403).json({
        error: `The name provided does not match the whitelisted record for Roll ID '${roll_id}'. Please enter your name exactly as registered by the warden.`
      });
    }

    // Check if student already exists
    const { data: existingStudent } = await supabase
      .from('students')
      .select('roll_id')
      .eq('roll_id', roll_id.toLowerCase())
      .single();

    if (existingStudent) {
      return res.status(409).json({ error: 'This roll ID is already registered.' });
    }

    // Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          roll_id: roll_id.toLowerCase(),
          name,
          role: 'student'
        }
      }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Insert into students table
    const { error: insertError } = await supabase
      .from('students')
      .insert({
        roll_id: roll_id.toLowerCase(),
        name: name || whitelistEntry.name,
        phone: phone || whitelistEntry.phone,
        branch: branch || whitelistEntry.branch,
        year_of_admission: year_of_admission || parseInt(roll_id.substring(0, 2)) + 2000,
        mess_type: 'V',
        fee_status: 'unpaid'
      });

    if (insertError) {
      console.error('Insert student error:', insertError);
      return res.status(500).json({ error: 'Account created but failed to add student record.' });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        role: 'student',
        roll_id: roll_id.toLowerCase(),
        email,
        name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: {
        role: 'student',
        roll_id: roll_id.toLowerCase(),
        email,
        name
      },
      message: 'Account created successfully!'
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error during signup.' });
  }
});

module.exports = router;
