# iPhone AI Setup

Native iPhone work is currently paused.

The active plan is web-first: fix bugs, stabilize the web app, deploy it, and get real student users before returning to iOS/Android. See [web-roadmap.md](web-roadmap.md).

Keep this document only for later native testing.

Use this flow when you want the installed iPhone app to use the local Anthropic proxy on your Mac.

## 1. Add the server key

Create a local `.env` file in the project root:

```bash
ANTHROPIC_API_KEY=your_real_anthropic_api_key
```

This file is ignored by git. Do not put the key in client code.

## 2. Find your Mac Wi-Fi IP

Run:

```bash
ipconfig getifaddr en0
```

If that prints nothing, try:

```bash
ipconfig getifaddr en1
```

## 3. Point the iPhone build at your Mac

Create a local `.env.phone` file:

```bash
VITE_AI_PROXY_BASE_URL=http://YOUR_MAC_IP:5173
```

Example:

```bash
VITE_AI_PROXY_BASE_URL=http://192.168.1.23:5173
```

Your iPhone and Mac must be on the same Wi-Fi network.

## 4. Start the proxy/dev server

Keep this running while using AI features on the phone:

```bash
npm run dev:phone
```

## 5. Build and install on iPhone

In another terminal:

```bash
npm run cap:sync:ios:phone
npm run cap:open:ios
```

Then choose your iPhone in Xcode and press Run.

## Notes

- The installed app stores app data locally on the phone.
- AI calls go from iPhone app to Mac Vite proxy to Anthropic.
- If the Mac IP changes, update `.env.phone`, rerun `npm run cap:sync:ios:phone`, and reinstall from Xcode.
- For production or sharing with other users, replace the Mac proxy URL with a hosted backend URL.
