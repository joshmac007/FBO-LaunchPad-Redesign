# Known Backend Issues Affecting Frontend Development

This document lists known issues with the backend (running on `http://localhost:5001`) that are impacting the frontend (running on `http://localhost:3000`) development and testing.

## 1. Post-Login Redirect to Backend URL

*   **Symptom:** After a successful login via the frontend, the browser is redirected to `http://localhost:5001/dashboard`, which is a backend URL and results in a 404 error. The intended frontend dashboard is at `http://localhost:3000/dashboard`.
*   **Likely Cause:** The backend's `/auth/login` endpoint is likely issuing an HTTP redirect (e.g., status 302 with `Location: /dashboard`) upon successful authentication. The `axios` client on the frontend follows this redirect by default.
*   **Recommended Fix (Backend):** The backend `/auth/login` endpoint should not issue a redirect. Instead, it should return a JSON response containing the authentication token and any user data. The frontend is already configured to handle client-side navigation to its `/dashboard` route upon successful login.

## 2. CORS Policy Errors

*   **Symptom:** Attempts by the frontend to make API calls to backend endpoints (e.g., `http://localhost:5001/api/fuel-orders`) are blocked by the browser's CORS policy. The console error typically states: `No 'Access-Control-Allow-Origin' header is present on the requested resource.`
*   **Likely Cause:** The backend Flask application is not configured to send the necessary CORS headers, specifically `Access-Control-Allow-Origin: http://localhost:3000`.
*   **Recommended Fix (Backend):**
    1.  Install the `Flask-CORS` extension (`pip install Flask-CORS`).
    2.  Initialize and configure `Flask-CORS` in the Flask application to allow requests from the frontend origin (`http://localhost:3000`) for the relevant API routes (e.g., `/api/*`).
        ```python
        from flask import Flask
        from flask_cors import CORS

        app = Flask(__name__)
        # Allow specific origin for API routes
        CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})
        # Potentially add support for credentials, specific methods/headers if needed
        # CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000", "supports_credentials": True}})


        # ... rest of your Flask app setup ...
        ```
    3.  Ensure the backend also correctly handles preflight `OPTIONS` requests for non-simple HTTP requests. `Flask-CORS` typically handles this automatically. 