# Typewriter Web App

A minimalist typewriter experience built with Next.js and React, designed to recreate the authentic feel of writing on a vintage typewriter.

## Features

- **Authentic Typewriter Experience**: No backspace functionality, manual carriage returns
- **Customizable Audio**: Upload custom MP3 files for keystroke and carriage return sounds
- **Typing Speed Control**: Configurable typing speed limits with pause functionality
- **Special Elite Font**: Bukowski-style typewriter font for authentic appearance
- **Paper Texture**: JavaScript-generated cream paper texture with noise effects
- **Lighting Control**: Adjustable ambient lighting with cursor-focused vignette
- **Typewriter Paper Feeding**: Toggle mode that keeps cursor centered and moves paper up
- **Fullscreen Mode**: Distraction-free writing environment
- **Analytics**: PostHog tracking for usage insights

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

The app runs on [http://localhost:3008](http://localhost:3008) (custom port).

## Deployment to Vercel

1. Push your code to a Git repository
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_POSTHOG_KEY`
   - `NEXT_PUBLIC_POSTHOG_HOST`
4. Deploy automatically with every push to main branch

## Audio Files

Place your custom audio files in the `public/sounds/` directory:
- `keystroke.mp3` - Default keystroke sound
- `carriage-return.mp3` - Default carriage return sound

## Settings

All settings are accessible via the top settings bar:
- **Volume**: Adjust audio volume (0-100%)
- **Typing Speed**: Set minimum time between keystrokes (0-500ms)
- **Keystroke Sound**: Select or upload custom keystroke sounds
- **Carriage Return Sound**: Select or upload custom return sounds
- **Lighting**: Control ambient lighting (0-100%)
- **Typewriter Mode**: Enable paper feeding simulation
- **Fullscreen**: Enter distraction-free writing mode

## Technology Stack

- **Next.js 16.1.1** - React framework with App Router
- **React 19.2.3** - Component library
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **PostHog** - Analytics
- **Web Audio API** - Custom audio handling
