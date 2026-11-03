# Karakkambi

Real-time anonymous chat with text and voice messaging.

## Overview

Karakkambi is a browser-based chat client built for anonymous, real-time communication. The frontend connects to a Socket.IO backend to receive live messages and online-user updates, while also fetching message history from the backend API. It supports both text and voice messages, reply threading, and a polished, responsive chat experience designed for device-friendly access.

This repository contains only the client application. A compatible backend is required to provide the live Socket.IO events, message history endpoint, and the upload-signature flow needed for voice-message delivery.

## Tech Stack

- **Languages:** TypeScript, JavaScript, CSS, HTML
- **Framework / runtime:** React 19, Vite 7
- **Styling:** Tailwind CSS 3, PostCSS, Autoprefixer
- **Real-time communication:** Socket.IO Client
- **HTTP client:** Axios
- **Media handling:** MediaRecorder, Web Audio, HTMLAudioElement
- **PWA tooling:** vite-plugin-pwa, Web App Manifest
- **Development tools:** pnpm, TypeScript, ESLint
- **Data layer:** Not implemented in this repository; persistence and message logic are handled by the backend.

## Key Features

- **Live chat:** `src/hooks/useSocket.ts` establishes the Socket.IO connection, listens for `new_message`, `online_count`, `user_joined`, and `user_left` events, and emits `send_message` payloads.
- **Message history:** `src/services/messageService.ts` loads prior messages from the backend using an optional `cursor` parameter for pagination or scroll-based retrieval.
- **Text messaging:** `src/constants.ts` defines the message length limit and client-side cooldown, and the chat UI prevents empty messages while enforcing a 500-character maximum.
- **Voice messaging:** `src/hooks/useVoiceRecorder.ts` handles microphone permission, recording lifecycle, upload processing, and error states for audio messages.
- **Reply support:** Message threads can reference a parent message using `replyTo`, enabling contextual conversation flows in both text and voice messages.
- **Audio playback management:** `src/utils/audioManager.ts` coordinates playback so only one voice message plays at a time and stops playback when recording starts.
- **Time and date formatting:** `src/utils/timeFormatter.ts` formats relative timestamps, date headers, and user-friendly display values.
- **Progressive Web App support:** `vite.config.ts` registers a service worker with runtime caching, and `public/manifest.json` supplies app metadata for installation.

## Project Structure

```text
.
├── public/
│   └── manifest.json          # PWA metadata and installation configuration
├── src/
│   ├── assets/                # Brand assets and static images
│   ├── components/            # Chat UI, message bubbles, and voice recorder
│   ├── hooks/                 # Socket and recording behavior
│   ├── services/              # API integration for fetching messages
│   ├── types/                 # Shared TypeScript interfaces for chat payloads
│   ├── utils/                 # Audio playback and timestamp utilities
│   ├── App.tsx                # Application root component
│   ├── constants.ts           # Shared chat constants
│   ├── index.css              # Tailwind setup and custom styles
│   └── main.tsx               # React entry point
├── .env.example               # Example environment configuration
├── index.html                 # Root HTML template
├── package.json               # Dependencies and scripts
├── pnpm-lock.yaml             # Lockfile for reproducible installs
├── postcss.config.js          # Tailwind/PostCSS configuration
├── tailwind.config.js         # Tailwind content configuration
├── tsconfig*.json             # TypeScript compiler configuration
├── vite.config.ts             # Vite and PWA configuration
├── README.md                  # Project documentation
└── .gitignore                 # Ignored project files
```

## Getting Started

### Prerequisites

- Node.js 18 or later
- pnpm 9 or later
- A compatible backend that provides the Socket.IO server, message history API, and upload-signature endpoint
- Cloudinary or equivalent media storage service for voice-message delivery

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/abhajkhan/karakkambi-ui.git
cd karakkambi-ui
pnpm install
```

Create the environment file and configure the backend base URL:

```bash
cp .env.example .env
```

Set the value in `.env`:

```dotenv
VITE_SOCKET_URL=http://localhost:4000
```

This is used for the Socket.IO connection and the HTTP API base URL (`${VITE_SOCKET_URL}/api`).

### Run the app

```bash
pnpm dev
```

The application runs on `http://localhost:5173` by default.

### Production build

```bash
pnpm build
```

### Preview the production build

```bash
pnpm preview
```

### Linting

```bash
pnpm lint
```
