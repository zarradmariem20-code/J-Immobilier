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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (jwtSecret ? createServiceRoleToken(jwtSecret) : process.env.VITE_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials for upload');
}

const supabase = createClient(supabaseUrl, supabaseKey);
const localPath = process.env.LOCAL_VIDEO_PATH || 'C:/Users/USER/Downloads/s1 estivale.mp4';
const targetPropertyId = Number.parseInt(process.env.PROPERTY_ID ?? '', 10);
const storageName = process.env.STORAGE_NAME || localPath.split(/[\\/]/).pop()?.replace(/\s+/g, '-').toLowerCase() || 'listing-video.mp4';
const dateFolder = new Date().toISOString().slice(0, 10);
const filePath = `videos/${dateFolder}/${Date.now()}-${storageName}`;

const body = await fs.readFile(localPath);
const { error } = await supabase.storage.from('listing-media').upload(filePath, body, {
  contentType: 'video/mp4',
  upsert: true,
});

if (error) {
  throw new Error(error.message);
}

const { data } = supabase.storage.from('listing-media').getPublicUrl(filePath);
const publicUrl = data.publicUrl;
console.log(publicUrl);

if (Number.isFinite(targetPropertyId)) {
  const { error: updateError } = await supabase
    .from('properties')
    .update({ video_url: publicUrl })
    .eq('id', targetPropertyId);

  if (updateError) {
    console.warn(`DB update skipped for property ${targetPropertyId}: ${updateError.message}`);
  } else {
    console.log(`Video attached to property ${targetPropertyId}`);
  }
}
