## Plan 7: Receipt Output (PDF & Email - Backend Service & Frontend Trigger)

*   **Objective:** Implement the functionality for CSRs to download a professional PDF version of a finalized receipt and to email that PDF to a customer directly from the UI.
*   **Relevant PRD Sections:** 4.5.
*   **General AI Agent Guidance for this Plan:**
    *   **Templating:** Use a robust templating engine (like Jinja2, which is standard with Flask) to render receipt data into an HTML file before PDF conversion. This separates data from presentation.
    *   **Styling for PDF:** The HTML template should include CSS (either inline or linked) that is compatible with the chosen PDF rendering library (e.g., WeasyPrint) to ensure proper styling for print/PDF output.
    *   **Asynchronous Operations:** Sending an email can be slow. For the API endpoint that triggers an email, consider returning an immediate `202 Accepted` response and dispatching the email task to a background worker (like Celery or RQ) in a production-grade system. For MVP, a synchronous send is acceptable, but the design should allow for future refactoring.
    *   **Security:** Ensure the PDF download and email endpoints are protected by the same permissions as the receipt view endpoint. Never expose internal file paths in API responses.

---

### Phase 7.1: Test Creation (Backend Focus)

*   **Goal:** Define the expected behavior of the PDF and email generation services and their corresponding API endpoints through tests.

*   **AI Agent - Test Creation Steps:**
    1.  **Test Setup:**
        *   In `backend/tests/`, create a new test file: `test_receipt_output.py`.
        *   Use fixtures for an authenticated CSR user, a fully configured FBO (from Plan 3), and a finalized 'GENERATED' `Receipt` with multiple `ReceiptLineItems`.
    2.  **HTML Rendering Test:**
        *   Write a test for an internal function `_render_receipt_to_html(receipt_id, fbo_location_id)`.
        *   Call this function with the test receipt's ID.
        *   Assert that the returned value is a non-empty string.
        *   Assert that the generated HTML string contains key data points from the receipt (e.g., `assert "Receipt #: HOU-001" in html_output`, `assert "Grand Total: $123.45" in html_output`, `assert "Ramp Fee" in html_output`).
    3.  **PDF Generation Service Test:**
        *   Write a test for the `PDFGenerationService`.
        *   Pass a sample HTML string to its `generate_from_html` method.
        *   Assert that the returned value is a `bytes` object.
        *   Assert that the byte string is not empty and starts with the PDF magic number: `assert result.startswith(b'%PDF-')`.
    4.  **Email Service Test (with Mocking):**
        *   Write a test for the `EmailService`.
        *   Use `unittest.mock.patch` to mock the actual email sending method (e.g., `smtplib.SMTP.send_message` or `flask_mail.Mail.send`).
        *   Call the `email_service.send_receipt(receipt_id, recipient_email)`.
        *   Assert that the mocked `send` method was called exactly once.
        *   Inspect the arguments passed to the mocked `send` method to assert that the recipient email is correct, the subject line is appropriate, and an attachment with a PDF content type and a filename (e.g., `Receipt-HOU-001.pdf`) was included.
    5.  **API Endpoint Tests:**
        *   **PDF Download Endpoint (`GET /api/fbo/{fbo_id}/receipts/{receipt_id}/pdf`):**
            *   Make a GET request to the endpoint with an authorized user.
            *   Assert a `200 OK` status code.
            *   Assert the `Content-Type` header is `application/pdf`.
            *   Assert the `Content-Disposition` header suggests a filename (e.g., `attachment; filename="Receipt-HOU-001.pdf"`).
            *   Assert the response body starts with `%PDF-`.
            *   Test fetching a PDF for a receipt belonging to another FBO, asserting 404.
        *   **Email Endpoint (`POST /api/fbo/{fbo_id}/receipts/{receipt_id}/email`):**
            *   Using the mock patch from the service test, make a POST request to the endpoint with a JSON body like `{"recipient_email": "customer@example.com"}`.
            *   Assert a `202 Accepted` or `200 OK` status code and a success message.
            *   Assert the mocked email `send` method was called with the correct parameters.
            *   Test with an invalid email address in the payload, asserting 400.

---

### Phase 7.2: Backend Implementation (Services, Templates & API)

*   **Goal:** Implement the backend logic for generating and dispatching PDF receipts.

*   **AI Agent - Backend Implementation Steps:**
    1.  **Install Libraries:** Add necessary libraries for PDF generation to `requirements.txt` (e.g., `WeasyPrint`).
    2.  **Create HTML Template:**
        *   In `backend/src/templates/` (or a similar directory), create `receipt_template.html`.
        *   Use Jinja2 templating syntax to lay out all the receipt data from PRD Section 6.
        *   Include CSS within a `<style>` tag in the template. Use print-friendly styles (e.g., `cm` or `pt` units, avoid complex flexbox/grid layouts if the PDF renderer struggles with them).
    3.  **Create `PDFGenerationService` (`backend/src/services/pdf_service.py`):**
        *   Implement `_render_receipt_to_html(receipt_id, fbo_location_id)`:
            *   Fetches the `Receipt` and all its related data (line items, customer, FBO details).
            *   Renders `receipt_template.html` using Flask's `render_template`, passing the receipt data as context.
            *   Returns the rendered HTML string.
        *   Implement `generate_receipt_pdf(receipt_id, fbo_location_id)`:
            *   Calls `_render_receipt_to_html`.
            *   Uses the PDF library (e.g., `WeasyPrint(string=html).write_pdf()`) to convert the HTML to a PDF byte string.
            *   Returns the PDF bytes.
    4.  **Create `EmailService` (`backend/src/services/email_service.py`):**
        *   Implement `send_receipt(receipt_id, fbo_location_id, recipient_email)`:
            *   Calls `pdf_service.generate_receipt_pdf`.
            *   Constructs an email message (using Python's `email` module or a library like `Flask-Mail`).
            *   Sets the recipient, sender, and subject.
            *   Attaches the generated PDF bytes with the correct MIME type (`application/pdf`) and filename.
            *   Connects to the email server (configured via environment variables) and sends the message.
    5.  **Implement API Endpoints (in `backend/src/routes/receipt_routes.py`):**
        *   **`GET /api/fbo/<int:fbo_id>/receipts/<int:receipt_id>/pdf`:**
            *   Protect with permissions.
            *   Call `pdf_service.generate_receipt_pdf`.
            *   Create a Flask `Response` object with the PDF bytes.
            *   Set the `Content-Type` header to `application/pdf`.
            *   Set the `Content-Disposition` header to `attachment; filename="Receipt-[ReceiptNumber].pdf"`.
            *   Return the response.
        *   **`POST /api/fbo/<int:fbo_id>/receipts/<int:receipt_id>/email`:**
            *   Protect with permissions.
            *   Validate the `recipient_email` from the request body.
            *   Call `email_service.send_receipt`.
            *   Return a JSON response with a success message and a `202 Accepted` or `200 OK` status.

---

### Phase 7.3: Frontend Implementation (UI Triggers)

*   **Goal:** Connect the "Download PDF" and "Email Receipt" buttons in the UI to the new backend endpoints.

*   **AI Agent - Frontend Implementation Steps:**
    1.  **Update Frontend Service (`frontend/app/services/receipt-service.ts`):**
        *   The `getReceiptById` function already exists.
        *   Create a new function `emailReceipt(receiptId: number, recipientEmail: string): Promise<void>`. This function will make a `POST` request to the `/email` endpoint.
    2.  **Update Receipt Detail View (`ReceiptDetailView.tsx`):**
        *   **"Download PDF" Button:**
            *   This button should be a simple anchor tag (`<a>`) that links directly to the PDF download endpoint: `href={`/api/fbo/${fboId}/receipts/${receiptId}/pdf`}`.
            *   Add the `download` attribute to the anchor tag to suggest saving the file: `download={`Receipt-${receipt.receipt_number}.pdf`}`.
        *   **"Email Receipt" Button:**
            *   Create state to manage an email modal (e.g., `isEmailModalOpen`, `recipientEmail`).
            *   The button's `onClick` handler will open the modal and pre-fill the `recipientEmail` state with the customer's email if available.
            *   The modal will contain an input for the email and a "Send" button.
            *   The "Send" button's `onClick` handler will call the `emailReceipt` service function, show a loading indicator, and on success, display a toast notification ("Receipt emailed successfully!") and close the modal. Handle errors by showing an error toast.

---

### Phase 7.4: Test Execution & Refinement

*   **Goal:** Run all backend and frontend tests to ensure the entire output generation flow works correctly.

*   **AI Agent - Test Execution Steps:**
    1.  **Run Backend Tests:** Execute `pytest backend/tests/test_receipt_output.py`. Debug and fix any issues in the services or API endpoints until all tests pass.
    2.  **Run Frontend E2E Tests:** Execute the Cypress/Playwright tests.
    3.  **Debug E2E Failures:**
        *   **Download Test:** Use the browser's developer tools to confirm the request to the `/pdf` endpoint is correct. Use Cypress's file download verification recipes to confirm a file is being downloaded.
        *   **Email Test:** Verify the modal opens, the API call to the `/email` endpoint is made with the correct payload upon submission, and the success toast appears.
    4.  **Manual Verification:**
        *   Manually click the "Download PDF" button in the application and open the downloaded file. Visually inspect it to ensure the layout, styling, and data are correct. This is a crucial step that automated tests cannot easily cover.
        *   Manually trigger an email (to a test email address) and verify it is received with the correct PDF attachment.
    5.  **Iterate:** Refine backend templates/services and frontend components until all automated tests pass and manual verification is successful.

---

This completes Plan 7 and the entire implementation plan for the CSR Receipt System. The result is a fully-featured system from backend configuration to frontend UI and final document output.