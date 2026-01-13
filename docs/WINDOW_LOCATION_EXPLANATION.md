# How `window.location.href` Makes a Request to Backend

## Understanding Browser Navigation vs API Calls

### `window.location.href` IS a Request!

When you do:
```javascript
window.location.href = "http://localhost:3000/login/google";
```

**This DOES make a request to your backend!** Here's how:

## What Happens Step by Step

1. **Browser Navigation**
   - Browser navigates to `http://localhost:3000/login/google`
   - This is a **GET request** to your backend
   - Same as typing the URL in the address bar

2. **Backend Receives Request**
   - Express.js receives: `GET /login/google`
   - Your route handler processes it
   - Backend responds with a redirect (302/307)

3. **Browser Follows Redirect**
   - Backend sends: `Location: https://accounts.google.com/oauth/...`
   - Browser automatically follows the redirect
   - User sees Google login page

## It's Still an HTTP Request!

```
Frontend (Browser)
    │
    │ GET http://localhost:3000/login/google
    │ (via window.location.href)
    ▼
Backend (Express)
    │
    │ Processes request
    │ Sets cookies
    │ Generates OAuth URL
    │
    │ HTTP 302 Redirect
    │ Location: https://accounts.google.com/...
    ▼
Browser
    │
    │ Automatically follows redirect
    ▼
Google OAuth
```

## Difference: Navigation vs AJAX

### Navigation (window.location.href)
```javascript
window.location.href = "/login/google";
```
- ✅ Makes HTTP request to backend
- ✅ Browser navigates (page changes)
- ✅ Backend can set cookies
- ✅ OAuth providers can redirect back
- ✅ Standard OAuth flow

### AJAX (fetch/axios)
```javascript
fetch("/login/google");
```
- ✅ Makes HTTP request to backend
- ❌ Browser doesn't navigate
- ❌ OAuth providers can't redirect back
- ❌ Not suitable for OAuth

## Why You See the Request

Check your browser's **Network tab**:

1. Open DevTools (F12)
2. Go to Network tab
3. Click OAuth button
4. You'll see:
   - Request to `http://localhost:3000/login/google`
   - Status: `302` or `307` (redirect)
   - Response headers include `Location: https://accounts.google.com/...`

## The 404 Error You Got

The error `{"error":"Not Found","path":"/login/google"}` means:

1. ✅ **Request WAS made** to backend (you got a response!)
2. ❌ **Route wasn't found** (404 error)
3. ✅ **Connection works** - backend received the request

The issue was the route path, which is now fixed!

## Summary

- `window.location.href` **DOES** make a request to backend
- It's a **GET request** via browser navigation
- You can see it in the Network tab
- It's the correct way to do OAuth
- The 404 error proves the request reached the backend!

