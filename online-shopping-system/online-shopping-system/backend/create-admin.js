require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function main() {
  const [rows] = await db.execute('SELECT id FROM users WHERE email = ?', ['admin@example.com']);
  const hash = await bcrypt.hash('Admin@123', 12);
  if (rows.length) {
    await db.execute("UPDATE users SET role='admin', password_hash=? WHERE email=?", [hash, 'admin@example.com']);
    console.log('Demo admin account updated.');
  } else {
    await db.execute("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')", ['Store Admin', 'admin@example.com', hash]);
    console.log('Demo admin account created.');
  }
  console.log('Email: admin@example.com');
  console.log('Password: Admin@123');
  await db.end();
}
main().catch(error => { console.error(error); process.exit(1); });
