# Link AI Logo URLs - Supabase Hosted

These logos have been uploaded to Supabase storage and are publicly accessible with long-term caching enabled.

## Logo URLs

### Icons (Smaller format)
- **Dark Icon**: `https://ugnyocjdcpdlneirkfiq.supabase.co/storage/v1/object/public/brand-assets/logos/link-ai-icon-dark.png`
- **Light Icon**: `https://ugnyocjdcpdlneirkfiq.supabase.co/storage/v1/object/public/brand-assets/logos/link-ai-icon-light.png`

### Full Logos (Wider format) 
- **Dark Logo**: `https://ugnyocjdcpdlneirkfiq.supabase.co/storage/v1/object/public/brand-assets/logos/link-ai-logo-dark.png`
- **Light Logo**: `https://ugnyocjdcpdlneirkfiq.supabase.co/storage/v1/object/public/brand-assets/logos/link-ai-logo-light.png`

## Usage in Code

For React/Email templates:
```javascript
const LOGO_URLS = {
    dark: "https://ugnyocjdcpdlneirkfiq.supabase.co/storage/v1/object/public/brand-assets/logos/link-ai-logo-dark.png",
    light: "https://ugnyocjdcpdlneirkfiq.supabase.co/storage/v1/object/public/brand-assets/logos/link-ai-logo-light.png",
};

// Usage
const logoUrl = isDarkMode ? LOGO_URLS.dark : LOGO_URLS.light;
```

## Updated Files

The following email templates have been updated to use these hosted URLs:
- ✅ `emails/appointment-confirmation.tsx`
- ✅ `emails/appointment-reminder.tsx`

## Storage Details

- **Bucket**: `brand-assets`
- **Path**: `logos/`
- **Cache**: 1 year (31536000 seconds)
- **Access**: Public
- **Provider**: Supabase Storage

## Benefits

- ✅ **Reliable hosting**: No local file dependencies
- ✅ **Fast loading**: CDN-backed with Supabase edge network
- ✅ **Long-term caching**: 1-year cache control for optimal performance
- ✅ **Public access**: No authentication required for email clients
- ✅ **Dark/Light themes**: Separate versions for different email themes 