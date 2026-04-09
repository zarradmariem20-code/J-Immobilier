import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function createServiceRoleToken(jwtSecret) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: 'supabase',
    aud: 'authenticated',
    sub: 'service_role',
    role: 'service_role',
    iat: now,
    exp: now + 60 * 60,
  })).toString('base64url');
  const unsigned = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', jwtSecret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const jwtSecret = process.env.SUPABASE_JWT_SECRET;

if (!supabaseUrl || !jwtSecret) {
  throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_JWT_SECRET');
}

const supabase = createClient(supabaseUrl, createServiceRoleToken(jwtSecret));
const localPath = 'C:/Users/USER/Downloads/s2 kantaoui.mp4';
const dateFolder = new Date().toISOString().slice(0, 10);
const filePath = `videos/${dateFolder}/${Date.now()}-s2-kantaoui.mp4`;

const body = await fs.readFile(localPath);
const { error } = await supabase.storage.from('listing-media').upload(filePath, body, {
  contentType: 'video/mp4',
  upsert: true,
});

if (error) {
  throw new Error(error.message);
}

const { data } = supabase.storage.from('listing-media').getPublicUrl(filePath);
console.log(data.publicUrl);
