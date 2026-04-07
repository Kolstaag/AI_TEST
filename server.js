import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-secret-in-production';
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CONTACT_FILE = path.join(DATA_DIR, 'contacts.json');
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

fs.mkdirSync(DATA_DIR, { recursive: true });

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}
function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}
function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    isAdmin: Boolean(user.isAdmin),
    mfaEnabled: Boolean(user.mfaEnabled),
    createdAt: user.createdAt,
  };
}

function seedUsers() {
  const existing = readJson(USERS_FILE, null);
  if (Array.isArray(existing) && existing.length) return existing;
  const users = [
    {
      id: 'u_admin',
      username: 'Admin',
      passwordHash: bcrypt.hashSync('Password', 10),
      isAdmin: true,
      mfaEnabled: false,
      mfaSecret: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'u_test',
      username: 'testuser',
      passwordHash: bcrypt.hashSync('Password', 10),
      isAdmin: false,
      mfaEnabled: false,
      mfaSecret: null,
      createdAt: new Date().toISOString(),
    }
  ];
  writeJson(USERS_FILE, users);
  return users;
}
seedUsers();
if (!fs.existsSync(CONTACT_FILE)) writeJson(CONTACT_FILE, []);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"]
    }
  }
}));
app.use(express.json({ limit: '1mb' }));
app.use(session({
  name: 'skytech.sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8,
  }
}));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 25, standardHeaders: true, legacyHeaders: false });
const contactLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const chatLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false });

function getUsers() { return readJson(USERS_FILE, []); }
function saveUsers(users) { writeJson(USERS_FILE, users); }
function getContacts() { return readJson(CONTACT_FILE, []); }
function saveContacts(items) { writeJson(CONTACT_FILE, items); }
function findUser(username) {
  const users = getUsers();
  return users.find((u) => u.username.toLowerCase() === String(username || '').toLowerCase());
}
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'You must sign in first.' });
  next();
}
function requireAdmin(req, res, next) {
  const user = getUsers().find((u) => u.id === req.session.userId);
  if (!user || !user.isAdmin) return res.status(403).json({ error: 'Admin access required.' });
  req.user = user;
  next();
}

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/api/auth/login', authLimiter, (req, res) => {
  const { username, password } = req.body || {};
  const user = findUser(username);
  if (!user || !bcrypt.compareSync(String(password || ''), user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  req.session.pendingUserId = user.id;
  req.session.userId = null;
  req.session.pendingMfaSetup = false;
  if (user.mfaEnabled) return res.json({ ok: true, next: 'mfa' });
  req.session.pendingMfaSetup = true;
  return res.json({ ok: true, next: 'setup-mfa' });
});

app.post('/api/auth/mfa/setup', authLimiter, async (req, res) => {
  const pendingUserId = req.session.pendingUserId;
  if (!pendingUserId || !req.session.pendingMfaSetup) return res.status(400).json({ error: 'Start login first.' });
  const users = getUsers();
  const user = users.find((u) => u.id === pendingUserId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const secret = speakeasy.generateSecret({ name: `SkyTech Drones (${user.username})`, issuer: 'SkyTech Drones' });
  user.pendingMfaSecret = secret.base32;
  saveUsers(users);
  const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);
  res.json({ secret: secret.base32, qrDataUrl });
});

app.post('/api/auth/mfa/verify-setup', authLimiter, (req, res) => {
  const pendingUserId = req.session.pendingUserId;
  const { token } = req.body || {};
  const users = getUsers();
  const user = users.find((u) => u.id === pendingUserId);
  if (!user || !user.pendingMfaSecret) return res.status(400).json({ error: 'MFA setup is not ready.' });
  const verified = speakeasy.totp.verify({ secret: user.pendingMfaSecret, encoding: 'base32', token: String(token || ''), window: 1 });
  if (!verified) return res.status(400).json({ error: 'Invalid MFA code.' });
  user.mfaSecret = user.pendingMfaSecret;
  user.pendingMfaSecret = null;
  user.mfaEnabled = true;
  saveUsers(users);
  req.session.userId = user.id;
  req.session.pendingUserId = null;
  req.session.pendingMfaSetup = false;
  res.json({ ok: true, user: publicUser(user) });
});

app.post('/api/auth/mfa/challenge', authLimiter, (req, res) => {
  const pendingUserId = req.session.pendingUserId;
  const { token } = req.body || {};
  const user = getUsers().find((u) => u.id === pendingUserId);
  if (!user || !user.mfaEnabled || !user.mfaSecret) return res.status(400).json({ error: 'MFA is not configured.' });
  const verified = speakeasy.totp.verify({ secret: user.mfaSecret, encoding: 'base32', token: String(token || ''), window: 1 });
  if (!verified) return res.status(400).json({ error: 'Invalid MFA code.' });
  req.session.userId = user.id;
  req.session.pendingUserId = null;
  req.session.pendingMfaSetup = false;
  res.json({ ok: true, user: publicUser(user) });
});

app.get('/api/auth/me', (req, res) => {
  const user = getUsers().find((u) => u.id === req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not signed in.' });
  res.json({ user: publicUser(user) });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('skytech.sid');
    res.json({ ok: true });
  });
});

app.post('/api/contact', contactLimiter, (req, res) => {
  const { name, email, phone, service, message } = req.body || {};
  if (!name || !email || !message) return res.status(400).json({ error: 'Name, email, and message are required.' });
  const contacts = getContacts();
  contacts.unshift({
    id: 'msg_' + Date.now(),
    name: String(name).slice(0, 120),
    email: String(email).slice(0, 160),
    phone: String(phone || '').slice(0, 50),
    service: String(service || '').slice(0, 120),
    message: String(message).slice(0, 3000),
    createdAt: new Date().toISOString(),
  });
  saveContacts(contacts);
  res.json({ ok: true });
});

app.get('/api/admin/users', requireAuth, requireAdmin, (_req, res) => {
  res.json({ users: getUsers().map(publicUser) });
});
app.get('/api/admin/messages', requireAuth, requireAdmin, (_req, res) => {
  res.json({ messages: getContacts() });
});

const SYSTEM_PROMPT = `You are SkyTech Drones' website assistant.
- Help visitors choose drones, repairs, rentals, parts, and training.
- Point buying questions to purchase.html.
- Point human support or quotes to contact.html.
- Do not invent pricing or policies not shown on the website.
- Keep answers concise and practical.`;

app.post('/api/chat', chatLimiter, async (req, res) => {
  if (!openai) return res.status(503).json({ error: 'AI chat is not configured. Add OPENAI_API_KEY to .env.' });
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'messages must be a non-empty array' });
    const input = [
      { role: 'system', content: [{ type: 'input_text', text: SYSTEM_PROMPT }] },
      ...messages.slice(-12).map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: [{ type: 'input_text', text: String(message.content || '') }]
      }))
    ];
    const response = await openai.responses.create({ model: 'gpt-5.4-mini', input, max_output_tokens: 300 });
    res.json({ reply: response.output_text?.trim() || 'Sorry, I could not generate a reply.' });
  } catch (error) {
    res.status(500).json({ error: 'Chat request failed', detail: error?.message || 'Unknown error' });
  }
});

app.get('/admin.html', (req, res, next) => {
  const user = getUsers().find((u) => u.id === req.session.userId);
  if (!user || !user.isAdmin) return res.redirect('/login.html');
  next();
}, express.static(__dirname));

app.use(express.static(__dirname, { extensions: ['html'] }));

app.listen(PORT, () => {
  console.log(`SkyTech secure site running on http://localhost:${PORT}`);
});
