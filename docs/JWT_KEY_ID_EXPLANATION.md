# Understanding JWT_KEY_ID Variables

## The Confusion

You might see `JWT_KEY_ID_1` and wonder:
- "Why is it numbered 1 when we're in December (month 12)?"
- "What does the number mean?"

## The Answer

### The Number is an INDEX, Not the Month

The **"1"** in `JWT_KEY_ID_1` is an **index** that identifies which key pair you're storing. It has **nothing to do with the month**.

### The VALUE Contains the Actual Month/Year

The **value** of `JWT_KEY_ID_1` should be the actual month/year identifier, like `auth-key-2024-12` for December 2024.

## Example for December 2024

If you're setting up in December 2024, your environment variables should be:

```
JWT_PRIVATE_KEY_1=<your private key>
JWT_PUBLIC_KEY_1=<your public key>
JWT_KEY_ID_1=auth-key-2024-12    ← The VALUE is December 2024
JWT_ACTIVE_KID=auth-key-2024-12  ← Must match JWT_KEY_ID_1 value
```

**Explanation:**
- `JWT_KEY_ID_1` = Variable name (the "1" is just the first key pair)
- `auth-key-2024-12` = The actual value (December 2024)

## Why Use Numbers?

The numbering system (`_1`, `_2`, `_3`, etc.) allows you to store **multiple keys simultaneously**:

```
JWT_PRIVATE_KEY_1=...    # First key pair
JWT_PUBLIC_KEY_1=...
JWT_KEY_ID_1=auth-key-2024-12

JWT_PRIVATE_KEY_2=...    # Second key pair (added next month)
JWT_PUBLIC_KEY_2=...
JWT_KEY_ID_2=auth-key-2025-01

JWT_PRIVATE_KEY_3=...    # Third key pair (added later)
JWT_PUBLIC_KEY_3=...
JWT_KEY_ID_3=auth-key-2025-02
```

This is necessary for **key rotation** - you need to keep old keys active while new keys are being used.

## How the System Uses It

1. **Backend loads keys**: Reads `JWT_PRIVATE_KEY_1`, `JWT_PUBLIC_KEY_1`, `JWT_KEY_ID_1`
2. **Stores in key manager**: Creates entry with `kid: "auth-key-2024-12"` (the VALUE)
3. **JWT signing**: Uses the key with `kid: "auth-key-2024-12"` and includes it in token header
4. **JWT validation**: Looks up key by `kid: "auth-key-2024-12"` from the token header

## Real-World Example

**December 2024 Setup:**
```
Variable Name          | Value
----------------------|------------------
JWT_PRIVATE_KEY_1     | -----BEGIN PRIVATE KEY-----...
JWT_PUBLIC_KEY_1      | -----BEGIN PUBLIC KEY-----...
JWT_KEY_ID_1          | auth-key-2024-12    ← December 2024
JWT_ACTIVE_KID        | auth-key-2024-12    ← December 2024
```

**January 2025 Rotation:**
```
Variable Name          | Value
----------------------|------------------
JWT_PRIVATE_KEY_1     | -----BEGIN PRIVATE KEY-----... (old, kept for backward compatibility)
JWT_PUBLIC_KEY_1      | -----BEGIN PUBLIC KEY-----...
JWT_KEY_ID_1          | auth-key-2024-12

JWT_PRIVATE_KEY_2     | -----BEGIN PRIVATE KEY-----... (new)
JWT_PUBLIC_KEY_2      | -----BEGIN PUBLIC KEY-----...
JWT_KEY_ID_2          | auth-key-2025-01    ← January 2025
JWT_ACTIVE_KID        | auth-key-2025-01    ← Switched to new key
```

## Summary

- **Variable name number** (`_1`, `_2`, `_3`): Index for storing multiple keys
- **Variable value** (`auth-key-2024-12`): Actual month/year identifier
- **Purpose**: Allow multiple keys to coexist for smooth rotation
- **Current month**: Use `auth-key-2024-12` for December 2024

## Quick Reference

| Current Month | JWT_KEY_ID_1 Value | JWT_KEY_ID_2 Value (next month) |
|--------------|-------------------|--------------------------------|
| December 2024 | `auth-key-2024-12` | `auth-key-2025-01` |
| January 2025 | `auth-key-2025-01` | `auth-key-2025-02` |
| February 2025 | `auth-key-2025-02` | `auth-key-2025-03` |

