Important: R2 CORS Configuration Needed
You also need to configure CORS on your Cloudflare R2 bucket (j-immo-media) to allow video playback in the browser. In the Cloudflare Dashboard:
1. Go to R2 → j-immo-media → Settings
2. Under CORS Policy, add:
[
  {
    "AllowedOrigins": ["http://localhost:5173", "https://journalimmobilier.tn"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]   