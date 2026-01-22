# Login Credentials

## Default Credentials (After Running seed.py)

### Admin User
- **Email:** `admin@local`
- **Password:** `Admin@123`
- **Role:** ADMIN

### Staff User
- **Email:** `staff@local`
- **Password:** `Staff@123`
- **Role:** STAFF

## Important Notes

⚠️ **Case Sensitive**: 
- Email: `admin@local` (lowercase)
- Password: `Admin@123` (capital A, @ symbol, numbers)

## If Login Fails

### 1. Verify Users Exist

Run in `apps/api-python/`:
```bash
python test_login.py
```

This will show:
- ✅ If users exist
- ✅ If passwords are correct
- ❌ Any issues

### 2. Re-seed Database

If users don't exist or passwords are wrong:
```bash
cd apps/api-python
python seed.py
```

### 3. Register New User

You can also register a new user through the API:
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "YourPassword123",
    "name": "Your Name"
  }'
```

Or use the register page at: http://localhost:3000/register

## Testing Login

### Via API (curl)
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@local",
    "password": "Admin@123"
  }'
```

### Via Browser
1. Go to: http://localhost:3000/login
2. Enter: `admin@local` / `Admin@123`
3. Click "Sign in"

## Troubleshooting

### "Invalid credentials" Error

1. **Check email spelling**: Must be exactly `admin@local` (lowercase)
2. **Check password**: Must be exactly `Admin@123` (capital A, @, numbers)
3. **Verify users exist**: Run `python test_login.py`
4. **Re-seed if needed**: Run `python seed.py`

### "User not found" Error

Users don't exist in database. Run:
```bash
cd apps/api-python
python seed.py
```

### Password Verification Fails

This could mean:
- Password hash is corrupted
- Wrong password was used during seeding
- Database was modified

**Solution**: Re-seed the database:
```bash
python seed.py
```
