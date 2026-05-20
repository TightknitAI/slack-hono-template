# slack-hono Template

Template Slack app built with [@tightknitai/slack-hono](https://github.com/TightknitAI/slack-hono) and [slack-cloudflare-workers](https://github.com/slack-edge/slack-cloudflare-workers) on Cloudflare Workers.

Demonstrates OAuth multi-workspace installation, slash commands, event handling, block actions, and view submissions — all running on the edge with KV-backed storage.

## App Overview

Once installed, try these in Slack:

| Feature | How to test |
|---|---|
| `/hello` | Type `/hello` in any channel — opens a modal, submit it to see the greeting |
| `/echo [message]` | Type `/echo hey there` — replies with Approve/Reject buttons |
| Block actions | Click Approve or Reject on an `/echo` response |
| App Home | Click on the bot in the sidebar — shows a welcome screen |
| `app_mention` | Mention `@Hono Bot` in a channel — replies in thread |
| OAuth install | Visit `/slack/install` on your app URL to install to another workspace |

## Development Setup

Get the app running locally with a tunnel so Slack can reach your dev server.

You'll need a Slack workspace where you have permissions to install apps. Options:
- **Your team's workspace** — if you have admin permissions
- **A free Slack workspace** — [create one](https://slack.com/create) for testing
- **Slack Developer Program sandbox** — join the [Developer Program](https://api.slack.com/developer-program) for a dedicated dev environment

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/installation)
- [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) — for tunneling to your local dev server
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free)

### 1. Install dependencies

```sh
pnpm install
```

### 2. Set up Cloudflare KV

```sh
pnpm run setup:kv
```

Copy the namespace IDs from the output and update `wrangler.jsonc`.

### 3. Start the dev server with a tunnel

```sh
pnpm run dev:tunnel
```

Copy the tunnel URL from the output (e.g. `https://xxx-yyy-zzz.trycloudflare.com`).

> **Note:** Quick tunnels generate a new URL each time you restart. You'll need to update the Slack app's Request URL when the tunnel URL changes. See [Permanent dev tunnel](#permanent-dev-tunnel) below for a fixed URL, or go straight to [Production Setup](#production-setup) to deploy with a permanent Worker URL.

### 4. Create the Slack app

This updates `manifest.json` with your tunnel URL, copies it to your clipboard, and opens the Slack app creation page:

```sh
pnpm run setup:manifest https://xxx-yyy-zzz.trycloudflare.com
```

In the browser: choose **"From an app manifest"** → paste from clipboard → **Next** → **Create**.

### 5. Configure secrets

Grab the **Signing Secret**, **Client ID**, and **Client Secret** from the app you just created (Settings > Basic Information > App Credentials).

```sh
cp .dev.vars.example .dev.vars
# Fill in the values
```

Restart the dev server for the new secrets to take effect.

### 6. Install the app

```sh
pnpm run install-app
```

You're up and running! Try `/hello` in Slack.

## Production Setup

Deploy to Cloudflare Workers for a permanent URL that doesn't change.

### 1. Deploy

```sh
pnpm run deploy
```

Note your Worker URL from the output (e.g. `https://slack-hono-template.your-subdomain.workers.dev`).

### 2. Update manifest URLs

Replace the tunnel/placeholder URL with your Worker URL in `manifest.json`, then push the changes:

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and select your app
2. Click **App Manifest** in the sidebar
3. Paste the contents of `manifest.json` and click **Save Changes**

### 3. Configure production secrets

```sh
pnpm run setup:secrets
```

### 4. Logs and monitoring

Stream real-time logs from your deployed Worker:

```sh
pnpm run logs
```

You can also view logs, analytics (request count, errors, latency), and traces in the [Cloudflare dashboard](https://dash.cloudflare.com/) under **Workers & Pages** → your worker → **Logs** / **Analytics**.

### 4. CI/CD (optional)

This template includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that auto-deploys on push to `main`.

To set it up, create a Cloudflare API token at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) with the "Edit Cloudflare Workers" template. Add it as a GitHub secret named `CLOUDFLARE_API_TOKEN`.

## Tips

### Permanent dev tunnel

If you have a domain on Cloudflare, you can create a named tunnel with a fixed URL that survives restarts — no more updating the Slack Request URL every time.

One-time setup (requires a domain on Cloudflare):

```sh
pnpm run setup:tunnel slack-dev.yourdomain.com
```

This logs into Cloudflare, creates a named tunnel, routes your subdomain to it, and writes `cloudflared.yml`. Then just use `pnpm run dev:tunnel` as usual — your dev URL is now permanent.

> `cloudflared.yml` is gitignored since the tunnel ID is specific to your account.

### Slack CLI integration

You can optionally link this project to the [Slack CLI](https://docs.slack.dev/tools/slack-cli/) for manifest validation.

#### Install the Slack CLI

- [macOS & Linux](https://docs.slack.dev/tools/slack-cli/guides/installing-the-slack-cli-for-mac-and-linux/)
- [Windows](https://docs.slack.dev/tools/slack-cli/guides/installing-the-slack-cli-for-windows/)

#### Log in and link your app

```sh
slack login
slack app link
```

Follow the prompts to select your workspace and app.

#### Validate manifest changes

```sh
slack manifest validate --source local
```

This checks your local `manifest.json` against the Slack manifest schema without having to paste it into the web UI.

## Project Structure

```
src/
  index.ts                — Main Hono app with OAuth + all Slack handlers
scripts/
  setup-manifest.sh       — Updates manifest.json with your URL
  setup-secrets.sh        — Prompts for Cloudflare Workers secrets
  install-app.sh          — Opens the app install page
vite.config.ts            — Vite config with Cloudflare plugin
wrangler.jsonc            — Cloudflare Workers config with KV bindings
manifest.json             — Slack app manifest
.dev.vars                 — Local secrets (not committed)
.github/workflows/
  deploy.yml              — Auto-deploy on push to main
```

## License

MIT

---

Built with [@tightknitai/slack-hono](https://github.com/TightknitAI/slack-hono). Maintained by the [Tightknit](https://tightknit.ai) team.
