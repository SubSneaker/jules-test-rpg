# Monorepo Project

This project contains a frontend React application and a backend Node.js Express application.

## Installation

To install dependencies, run the following command in the root directory:

```bash
npm install
```

## Running the Applications

### Frontend

To run the frontend application, use the following command:

```bash
npm run dev --workspace=frontend
```

### Backend

To run the backend application, use the following command:

```bash
npm start --workspace=backend
```

## API Key Setup

This project's backend uses the Google Gemini API for AI-powered text generation. To enable this functionality, you need to provide a Gemini API key.

1.  **Obtain an API Key:**
    *   Go to [Google AI Studio](https://aistudio.google.com/).
    *   Sign in and create a new API key if you don't have one already.

2.  **Configure the Backend:**
    *   In the `monorepo/backend` directory, create a new file named `.env`.
    *   You can do this by copying the example file: `cp backend/.env.example backend/.env` (on Linux/macOS) or by manually creating the file.
    *   Open the `backend/.env` file and replace `YOUR_GEMINI_API_KEY_HERE` with the actual API key you obtained from Google AI Studio. The line should look like this:
        ```
        GEMINI_API_KEY=AIz...YOUR_ACTUAL_KEY...xyz
        ```

3.  **Restart Backend Server:**
    *   If your backend server was running, you'll need to stop and restart it for the new environment variable to be loaded.
        ```bash
        npm start --workspace=backend
        ```

**Note:** The `backend/.env` file is included in `backend/.gitignore` to prevent your API key from being accidentally committed to the repository.
