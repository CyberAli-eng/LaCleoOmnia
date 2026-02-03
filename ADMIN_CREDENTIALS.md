# Admin login (Users menu)

The **Users** menu item is visible only to admin users. Use the credentials below to sign in as admin and manage users.

## Default admin (after running seed)

Run the seed script from the API project root:

```bash
cd apps/api-python && python seed.py
```

Then log in with:

| Field    | Value        |
|----------|--------------|
| **Email**    | `admin@local` |
| **Password** | `Admin@123`   |

- **Staff** (non-admin) test user: `staff@local` / `Staff@123`

After logging in as admin, the **Users** item appears in the left sidebar and you can list, create, update, and delete users.
