const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads');
const MUSIC_DIR = path.join(PUBLIC_DIR, 'music');
const DB_FILE = path.join(ROOT, 'database.json');

for (const dir of [PUBLIC_DIR, UPLOAD_DIR, MUSIC_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ invitations: [], rsvps: [] }, null, 2));
}

app.set('view engine', 'ejs');
app.set('views', path.join(ROOT, 'views'));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
app.use('/public', express.static(PUBLIC_DIR, { maxAge: '1h' }));

function readDb() {
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    return {
      invitations: Array.isArray(data.invitations) ? data.invitations : [],
      rsvps: Array.isArray(data.rsvps) ? data.rsvps : []
    };
  } catch (err) {
    console.error('Gagal membaca database.json:', err.message);
    throw new Error('Database tidak dapat dibaca. Periksa format database.json.');
  }
}

// Tulis ke file sementara dahulu agar file database tidak setengah tertulis.
function writeDb(db) {
  const temp = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(temp, DB_FILE);
}

const storage = multer.diskStorage({
  destination: (_req, file, cb) => cb(null, file.fieldname === 'musicUpload' ? MUSIC_DIR : UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  }
});
const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 18 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'musicUpload') {
      const isMp3 = file.mimetype === 'audio/mpeg' || path.extname(file.originalname).toLowerCase() === '.mp3';
      if (!isMp3) return cb(new Error('File lagu harus berformat MP3.'));
      return cb(null, true);
    }
    if (!allowedMime.has(file.mimetype)) return cb(new Error('Format foto harus JPG, PNG, WEBP, atau GIF.'));
    cb(null, true);
  }
});

const uploadFields = upload.fields([
  { name: 'groomPhoto', maxCount: 1 },
  { name: 'bridePhoto', maxCount: 1 },
  { name: 'gallery1', maxCount: 1 },
  { name: 'gallery2', maxCount: 1 },
  { name: 'gallery3', maxCount: 1 },
  { name: 'gallery4', maxCount: 1 },
  { name: 'gallery5', maxCount: 1 },
  { name: 'gallery6', maxCount: 1 },
  { name: 'gallery7', maxCount: 1 },
  { name: 'gallery8', maxCount: 1 },
  { name: 'gallery9', maxCount: 1 },
  { name: 'coverBackground', maxCount: 1 },
  { name: 'introBackground', maxCount: 1 },
  { name: 'profileBackground', maxCount: 1 },
  { name: 'eventBackground', maxCount: 1 },
  { name: 'galleryBackground', maxCount: 1 },
  { name: 'rsvpBackground', maxCount: 1 },
  { name: 'musicUpload', maxCount: 1 }
]);

function slugify(value) {
  return String(value || '').trim().toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function safeText(value, max = 300) {
  return String(value || '').trim().slice(0, max);
}
function fileUrl(fileName) {
  return fileName ? `/public/uploads/${encodeURIComponent(fileName)}` : '';
}
function removeUploaded(files) {
  for (const group of Object.values(files || {})) {
    for (const file of group || []) {
      try { fs.unlinkSync(file.path); } catch (_) {}
    }
  }
}
function findInvitation(db, slug) {
  return db.invitations.find(item => item.slug === slug);
}

const PHOTO_FIELDS = [
  'groomPhoto', 'bridePhoto', ...Array.from({ length: 9 }, (_, i) => `gallery${i + 1}`),
  'coverBackground', 'introBackground', 'profileBackground', 'eventBackground',
  'galleryBackground', 'rsvpBackground'
];
const MAX_PHOTO_SIZE = 500 * 1024;
function photoSizeError(files) {
  for (const [field, group] of Object.entries(files || {})) {
    if (field !== 'musicUpload' && group.some(file => file.size > MAX_PHOTO_SIZE)) {
      return `Ukuran setiap foto maksimal 500 KB. File pada kolom ${field} terlalu besar.`;
    }
  }
  return null;
}
function deleteUpload(filename, kind = 'uploads') {
  if (!filename) return;
  const base = path.basename(String(filename));
  const target = path.join(kind === 'music' ? MUSIC_DIR : UPLOAD_DIR, base);
  try { if (fs.existsSync(target)) fs.unlinkSync(target); } catch (err) { console.warn('Tidak dapat menghapus file:', err.message); }
}
function inputDate(value) {
  if (!value) return '';
  return String(value).slice(0, 16);
}
function renderAdmin(res, status, error, success = null) {
  const db = readDb();
  return res.status(status).render('admin', {
    invitations: db.invitations, rsvps: db.rsvps.slice().reverse().slice(0, 20), error, success
  });
}

app.get('/', (_req, res) => res.redirect('/admin'));

function boundedFont(value, fallback, min, max) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

app.get('/admin', (req, res) => {
  const db = readDb();
  res.render('admin', {
    invitations: db.invitations,
    rsvps: db.rsvps.slice().reverse().slice(0, 20),
    error: null,
    success: null,
    query: req.originalUrl.split('?')[1] || ''
  });
});

app.post('/admin/invitations', (req, res) => {
  uploadFields(req, res, (uploadError) => {
    if (uploadError) {
      const db = readDb();
      return res.status(400).render('admin', {
        invitations: db.invitations, rsvps: db.rsvps.slice().reverse().slice(0, 20),
        error: uploadError.code === 'LIMIT_FILE_SIZE'
          ? 'Ukuran file terlalu besar. Foto maksimal 500 KB dan lagu MP3 maksimal 20 MB.' : uploadError.message,
        success: null
      });
    }

    try {
      const tooLargePhoto = photoSizeError(req.files);
      if (tooLargePhoto) {
        removeUploaded(req.files);
        return renderAdmin(res, 400, tooLargePhoto);
      }
      const db = readDb();
      const slug = slugify(req.body.slug);
      const required = [
        ['Nama mempelai pria', req.body.groomName],
        ['Nama mempelai wanita', req.body.brideName],
        ['Tanggal dan waktu acara', req.body.eventDate],
        ['Lokasi acara', req.body.venue],
        ['Slug', slug]
      ];
      const missing = required.find(([, value]) => !String(value || '').trim());
      if (missing) {
        removeUploaded(req.files);
        return res.status(400).render('admin', {
          invitations: db.invitations, rsvps: db.rsvps.slice().reverse().slice(0, 20),
          error: `${missing[0]} wajib diisi.`, success: null
        });
      }
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        removeUploaded(req.files);
        return res.status(400).render('admin', {
          invitations: db.invitations, rsvps: db.rsvps.slice().reverse().slice(0, 20),
          error: 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.', success: null
        });
      }
      if (findInvitation(db, slug)) {
        removeUploaded(req.files);
        return res.status(409).render('admin', {
          invitations: db.invitations, rsvps: db.rsvps.slice().reverse().slice(0, 20),
          error: `Slug "${slug}" sudah digunakan. Pilih slug yang unik.`, success: null
        });
      }

      const uploaded = req.files || {};
      const fileName = field => uploaded[field]?.[0]?.filename || '';
      const invitation = {
        id: crypto.randomUUID(),
        slug,
        groomName: safeText(req.body.groomName, 100),
        brideName: safeText(req.body.brideName, 100),
        groomBio: safeText(req.body.groomBio, 500),
        brideBio: safeText(req.body.brideBio, 500),
        invitingFamily: safeText(req.body.invitingFamily, 500),
        blessingDate: safeText(req.body.blessingDate, 40),
        blessingTime: safeText(req.body.blessingTime, 80),
        blessingVenue: safeText(req.body.blessingVenue, 200),
        blessingMapsUrl: safeText(req.body.blessingMapsUrl, 1000),
        receptionDate: safeText(req.body.receptionDate, 40),
        receptionTime: safeText(req.body.receptionTime, 80),
        receptionVenue: safeText(req.body.receptionVenue, 200),
        receptionMapsUrl: safeText(req.body.receptionMapsUrl, 1000),
        themeColor: /^#[0-9a-fA-F]{6}$/.test(req.body.themeColor || '') ? req.body.themeColor : '#a94f68',
        accentColor: /^#[0-9a-fA-F]{6}$/.test(req.body.accentColor || '') ? req.body.accentColor : '#d98f9c',
        backgroundColor: /^#[0-9a-fA-F]{6}$/.test(req.body.backgroundColor || '') ? req.body.backgroundColor : '#fff5f3',
        textColor: /^#[0-9a-fA-F]{6}$/.test(req.body.textColor || '') ? req.body.textColor : '#49313a',
        fontSizes: {
          cover: boundedFont(req.body.fontCover, 40, 22, 60), intro: boundedFont(req.body.fontIntro, 17, 13, 24),
          profile: boundedFont(req.body.fontProfile, 30, 20, 44), event: boundedFont(req.body.fontEvent, 17, 13, 24),
          gallery: boundedFont(req.body.fontGallery, 17, 13, 24), rsvp: boundedFont(req.body.fontRsvp, 17, 13, 24)
        },
        eventDate: safeText(req.body.eventDate, 40),
        eventTime: safeText(req.body.eventTime, 80),
        venue: safeText(req.body.venue, 200),
        mapsUrl: safeText(req.body.mapsUrl, 1000),
        musicFile: fileName('musicUpload'),
        groomPhoto: fileName('groomPhoto'),
        bridePhoto: fileName('bridePhoto'),
        gallery: Array.from({ length: 9 }, (_, i) => fileName(`gallery${i + 1}`)),
        backgrounds: {
          cover: fileName('coverBackground'),
          intro: fileName('introBackground'),
          profile: fileName('profileBackground'),
          event: fileName('eventBackground'),
          gallery: fileName('galleryBackground'),
          rsvp: fileName('rsvpBackground')
        },
        createdAt: new Date().toISOString()
      };
      db.invitations.push(invitation);
      writeDb(db);
      res.redirect('/admin?created=1');
    } catch (err) {
      console.error(err);
      removeUploaded(req.files);
      const db = readDb();
      res.status(500).render('admin', {
        invitations: db.invitations, rsvps: db.rsvps.slice().reverse().slice(0, 20),
        error: 'Undangan gagal disimpan. Periksa database.json dan izin folder.', success: null
      });
    }
  });
});

app.get('/admin/invitations/:id/edit', (req, res) => {
  const db = readDb();
  const invitation = db.invitations.find(item => item.id === req.params.id);
  if (!invitation) return res.status(404).send('Undangan tidak ditemukan.');
  res.render('edit', { invitation, error: null });
});

app.post('/admin/invitations/:id/edit', (req, res) => {
  uploadFields(req, res, (uploadError) => {
    const db = readDb();
    const invitation = db.invitations.find(item => item.id === req.params.id);
    if (!invitation) {
      removeUploaded(req.files);
      return res.status(404).send('Undangan tidak ditemukan.');
    }
    const fail = (message, status = 400) => {
      removeUploaded(req.files);
      return res.status(status).render('edit', { invitation, error: message });
    };
    if (uploadError) {
      return fail(uploadError.code === 'LIMIT_FILE_SIZE'
        ? 'Ukuran file terlalu besar. Foto maksimal 500 KB dan lagu MP3 maksimal 20 MB.'
        : uploadError.message, 400);
    }
    const tooLargePhoto = photoSizeError(req.files);
    if (tooLargePhoto) return fail(tooLargePhoto);

    const slug = slugify(req.body.slug);
    const required = [
      ['Nama mempelai pria', req.body.groomName],
      ['Nama mempelai wanita', req.body.brideName],
      ['Tanggal dan waktu acara', req.body.eventDate],
      ['Lokasi acara', req.body.venue], ['Slug', slug]
    ];
    const missing = required.find(([, value]) => !String(value || '').trim());
    if (missing) return fail(`${missing[0]} wajib diisi.`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return fail('Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.');
    if (db.invitations.some(item => item.slug === slug && item.id !== invitation.id)) {
      return fail(`Slug "${slug}" sudah digunakan. Pilih slug yang unik.`, 409);
    }

    const uploaded = req.files || {};
    const uploadedName = field => uploaded[field]?.[0]?.filename || '';
    const removeChecked = field => req.body[`delete_${field}`] === 'on';
    const replaceFile = (field, current, kind = 'uploads') => {
      const next = uploadedName(field);
      if (next) { deleteUpload(current, kind); return next; }
      if (removeChecked(field)) { deleteUpload(current, kind); return ''; }
      return current || '';
    };
    const oldSlug = invitation.slug;
    const textFields = {
      groomName: 100, brideName: 100, groomBio: 500, brideBio: 500,
      invitingFamily: 500, blessingDate: 40, blessingTime: 80, blessingVenue: 200,
      blessingMapsUrl: 1000, receptionDate: 40, receptionTime: 80, receptionVenue: 200,
      receptionMapsUrl: 1000, eventDate: 40, eventTime: 80, venue: 200, mapsUrl: 1000
    };
    for (const [field, max] of Object.entries(textFields)) invitation[field] = safeText(req.body[field], max);
    invitation.slug = slug;
    for (const field of ['themeColor', 'accentColor', 'backgroundColor', 'textColor']) {
      const fallback = { themeColor: '#a94f68', accentColor: '#d98f9c', backgroundColor: '#fff5f3', textColor: '#49313a' }[field];
      invitation[field] = /^#[0-9a-fA-F]{6}$/.test(req.body[field] || '') ? req.body[field] : (invitation[field] || fallback);
    }
    invitation.fontSizes = invitation.fontSizes || {};
    for (const [field, key, fallback, min, max] of [
      ['fontCover','cover',40,22,60], ['fontIntro','intro',17,13,24], ['fontProfile','profile',30,20,44],
      ['fontEvent','event',17,13,24], ['fontGallery','gallery',17,13,24], ['fontRsvp','rsvp',17,13,24]
    ]) invitation.fontSizes[key] = boundedFont(req.body[field], invitation.fontSizes[key] || fallback, min, max);
    for (const field of ['groomPhoto', 'bridePhoto']) invitation[field] = replaceFile(field, invitation[field]);
    invitation.gallery = Array.from({ length: 9 }, (_, i) => replaceFile(`gallery${i + 1}`, (invitation.gallery || [])[i]));
    invitation.backgrounds = invitation.backgrounds || {};
    const backgroundMap = { coverBackground: 'cover', introBackground: 'intro', profileBackground: 'profile', eventBackground: 'event', galleryBackground: 'gallery', rsvpBackground: 'rsvp' };
    for (const [field, key] of Object.entries(backgroundMap)) invitation.backgrounds[key] = replaceFile(field, invitation.backgrounds[key]);
    invitation.musicFile = replaceFile('musicUpload', invitation.musicFile, 'music');
    invitation.updatedAt = new Date().toISOString();
    try {
      writeDb(db);
      res.redirect('/admin?updated=1');
    } catch (err) {
      console.error(err);
      removeUploaded(req.files);
      res.status(500).render('edit', { invitation, error: 'Perubahan gagal disimpan. Periksa database.json dan izin folder.' });
    }
  });
});

app.get('/undangan/:slug', (req, res) => {
  const db = readDb();
  const invitation = findInvitation(db, slugify(req.params.slug));
  if (!invitation) return res.status(404).send('Undangan tidak ditemukan.');
  res.render('undangan', { invitation, rsvps: db.rsvps.filter(r => r.slug === invitation.slug).slice(-30).reverse() });
});

app.post('/undangan/:slug/rsvp', (req, res) => {
  const db = readDb();
  const invitation = findInvitation(db, slugify(req.params.slug));
  if (!invitation) return res.status(404).send('Undangan tidak ditemukan.');
  const name = safeText(req.body.name, 80);
  const message = safeText(req.body.message, 1000);
  const attendance = ['Hadir', 'Tidak hadir', 'Masih ragu'].includes(req.body.attendance)
    ? req.body.attendance : 'Masih ragu';
  if (!name || !message) {
    return res.status(400).send('Nama dan ucapan wajib diisi. Silakan kembali dan lengkapi form.');
  }
  db.rsvps.push({
    id: crypto.randomUUID(), slug: invitation.slug, name, message, attendance,
    createdAt: new Date().toISOString()
  });
  writeDb(db);
  res.redirect(`/undangan/${encodeURIComponent(invitation.slug)}#ucapan`);
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).send('Terjadi kesalahan pada server.');
});

app.listen(PORT, () => {
  console.log(`Platform undangan berjalan di http://localhost:${PORT}`);
  console.log(`Dashboard admin: http://localhost:${PORT}/admin`);
});
