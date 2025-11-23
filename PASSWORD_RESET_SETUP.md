# Password Reset Setup Guide

## Problem
When users click the password reset link from Supabase, it redirects to your portfolio domain but there's no password reset page there.

## Solution
Host the `password-reset.html` file on your domain and configure Supabase to redirect there.

## Step 1: Update the HTML File

1. Open `password-reset.html`
2. Replace `YOUR_SUPABASE_URL` with your actual Supabase project URL
3. Replace `YOUR_SUPABASE_ANON_KEY` with your actual Supabase anon key

You can find these in:
- Supabase Dashboard → Project Settings → API
- Or in your `app.json` / environment variables

## Step 2: Host the File

Upload `password-reset.html` to your portfolio domain at one of these paths:
- `https://yourdomain.com/reset-password.html`
- `https://yourdomain.com/auth/reset-password.html`
- `https://yourdomain.com/password-reset.html`

## Step 3: Configure Supabase Redirect URL

1. Go to **Supabase Dashboard** → Your Project → **Authentication** → **URL Configuration**
2. Set **Site URL** to: `https://yourdomain.com` (your portfolio domain)
3. Add **Redirect URLs**:
   - `https://yourdomain.com/reset-password.html`
   - `https://yourdomain.com/reset-password.html#*`
   - `https://yourdomain.com/auth/reset-password.html` (if using that path)

## Step 4: Update Code (Optional)

If you want to specify the exact redirect path, update `store/useAuth.ts`:

```typescript
resetPassword: async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://yourdomain.com/reset-password.html',
  });
  // ... rest of code
}
```

## How It Works

1. User clicks "Forgot password?" in app
2. Supabase sends email with reset link
3. Link points to: `https://yourdomain.com/reset-password.html?token=...&type=recovery`
4. User opens link, sees password reset form
5. User enters new password
6. Password is reset via Supabase
7. User can now sign in with new password in app

## Alternative: Use Supabase Hosted Pages

If you don't want to host your own page, you can use Supabase's hosted auth pages:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Enable "Use Supabase hosted auth pages"
3. Set Site URL to your domain
4. Users will be redirected to Supabase's hosted password reset page

## Testing

1. Request password reset in app
2. Check email for reset link
3. Click link - should open password reset page on your domain
4. Enter new password
5. Try signing in with new password in app

## Troubleshooting

### Link still goes to localhost
- Check Supabase Dashboard → Authentication → URL Configuration
- Make sure Site URL is set to your domain (not localhost)
- Clear browser cache and try again

### Page shows "Invalid token"
- Reset tokens expire after 1 hour (default)
- Request a new password reset
- Check that the token parameter is in the URL

### Password reset doesn't work
- Check browser console for errors
- Verify Supabase URL and anon key are correct in HTML file
- Check Supabase logs for errors

