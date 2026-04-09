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
const bucket = 'listing-media';
const dateFolder = new Date().toISOString().slice(0, 10);

const files = [
  {
    propertyId: 74,
    localPath: 'C:/Users/USER/Downloads/villa chat mariem - Copie.mp4',
    storageName: 'villa-chat-mariem.mp4',
  },
  {
    propertyId: 75,
    localPath: 'C:/Users/USER/Downloads/cité medecins.mp4',
    storageName: 'cite-medecins.mp4',
  },
  {
    propertyId: 73,
    localPath: 'C:/Users/USER/Downloads/apt s2.mp4',
    storageName: 'appartement-s2.mp4',
  },
];

for (const item of files) {
  const body = await fs.readFile(item.localPath);
  const filePath = `videos/${dateFolder}/${Date.now()}-${item.storageName}`;

  const { error } = await supabase.storage.from(bucket).upload(filePath, body, {
    contentType: 'video/mp4',
    upsert: true,
  });

  if (error) {
    console.error(`UPLOAD_FAILED property=${item.propertyId}: ${error.message}`);
    continue;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  console.log(`UPLOAD_OK property=${item.propertyId} url=${data.publicUrl}`);
}
