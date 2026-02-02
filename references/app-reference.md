# QR Captain App Reference

## Admin Utility Commands

### Promote a User to Admin
Promotes an existing user to admin role by their email address.

```bash
npx convex run users:promoteToAdmin '{"email": "user@example.com"}'
```

### Seed Admin Account
Creates a new admin account with email `admin@qrcaptain.com`. After running this, sign up with that email to set a password.

```bash
npx convex run users:seedAdmin
```

## Environment Variables (Convex)

The following environment variables must be set in Convex for authentication to work:

| Variable | Description |
|----------|-------------|
| `AUTH_SECRET` | Secret for session encryption |
| `JWT_PRIVATE_KEY` | RSA private key for signing JWT tokens |
| `JWKS` | JSON Web Key Set for JWT validation |
| `SITE_URL` | Application URL (e.g., `http://localhost:3000`) |

### View Environment Variables
```bash
npx convex env list
```

### Set an Environment Variable
```bash
npx convex env set VARIABLE_NAME "value"
```
