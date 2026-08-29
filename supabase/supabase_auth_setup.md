# Supabase Auth to Users Sync Setup (Email Provider Proxy)

This document describes how the Supabase Authentication mechanism is mapped to our database's `public.users` table, allowing registration via **mobile number** and **password** using the **Email Auth Provider** as a proxy (avoiding SMS gateway configuration).

## Auth Trigger Mechanism

In Supabase, user accounts are managed inside the `auth.users` table. We mirror this in `public.users` using a PostgreSQL trigger function.

Because Supabase requires a third-party SMS gateway (like Twilio) to save Phone Auth settings, we proxy phone-based auth through the standard **Email Provider** by generating an internal placeholder email address.

### Flow under the hood:
1. **User Sign Up**: 
   - A farmer registers with `Mobile: 9876543210` and `Password: password123`.
   - The frontend formats this to an internal email: `919876543210@farmerapp.internal`.
   - The frontend calls `supabase.auth.signUp()` with the placeholder email, password, and the custom metadata.
2. **Trigger Execution**:
   - The database trigger `on_auth_user_created` intercepts the new insertion on `auth.users`.
   - `new.phone` will be null, but the trigger successfully extracts `mobile_number` from the custom user metadata: `new.raw_user_meta_data->>'mobile_number'`.
   - The trigger creates a row in `public.users` inserting the real mobile number (`+919876543210`) into `mobile_number`.
   - If the role is `'farmer'`, it creates a corresponding row in `public.farmers` automatically.
3. **User Login**:
   - The farmer logs in with `Mobile: 9876543210` and `Password: password123`.
   - The frontend formats it to `919876543210@farmerapp.internal` and calls `supabase.auth.signInWithPassword()`.

---

## Supabase Dashboard Setup Instructions

To support this flow, you must configure the **Email Provider** in Supabase:

### 1. Enable Email Provider
1. Go to your **Supabase Project Dashboard**.
2. Navigate to **Authentication** -> **Providers**.
3. Toggle the **Email** provider to **ON**.

### 2. Disable Email Confirmation
Because the internal emails (e.g., `919876543210@farmerapp.internal`) are placeholders, they cannot receive confirmation links. You must disable email confirmation:
1. In the **Email Provider** settings, toggle **Confirm email** to **OFF** (or uncheck the setting).
2. Save changes. Users will now be confirmed instantly upon signing up.

### 3. Frontend Sign Up Code Example
```javascript
const formattedPhone = '+919876543210';
const internalEmail = `${formattedPhone.replace('+', '')}@farmerapp.internal`;

const { data, error } = await supabase.auth.signUp({
  email: internalEmail,
  password: 'SecurePassword123',
  options: {
    data: {
      name: 'Ramesh Kumar',
      role: 'farmer',
      preferred_language: 'en',
      mobile_number: formattedPhone
    }
  }
});
```
