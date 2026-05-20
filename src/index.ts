import { Hono } from "hono";
import { SlackHonoOAuthApp } from "@tightknitai/slack-hono";
import { KVInstallationStore, KVStateStore } from "slack-cloudflare-workers";

type Env = {
  Bindings: {
    SLACK_SIGNING_SECRET: string;
    SLACK_CLIENT_ID: string;
    SLACK_CLIENT_SECRET: string;
    SLACK_BOT_SCOPES: string;
    SLACK_INSTALLATIONS: KVNamespace;
    SLACK_OAUTH_STATE: KVNamespace;
  };
};

const app = new Hono<Env>();

app.get("/", (c) => c.text("slack-hono-template is running"));

app.all("/slack/*", async (c) => {
  const slack = new SlackHonoOAuthApp({
    env: c.env,
    installationStore: new KVInstallationStore(c.env, c.env.SLACK_INSTALLATIONS),
    stateStore: new KVStateStore(c.env.SLACK_OAUTH_STATE),
  });

  // ---------------------
  // Slash commands
  // ---------------------

  // /hello — opens a modal with a text input
  slack.command("/hello", async ({ context, payload }) => {
    await context.client.views.open({
      trigger_id: payload.trigger_id,
      view: {
        type: "modal",
        callback_id: "hello_modal",
        title: { type: "plain_text", text: "Say Hello" },
        submit: { type: "plain_text", text: "Send" },
        blocks: [
          {
            type: "input",
            block_id: "name_block",
            label: { type: "plain_text", text: "Who should I greet?" },
            element: {
              type: "plain_text_input",
              action_id: "name_input",
              placeholder: { type: "plain_text", text: "Enter a name" },
            },
          },
        ],
      },
    });
    // Ack with no visible response (modal handles it)
    return "";
  });

  // /echo — replies with a message containing action buttons
  slack.command(
    "/echo",
    async ({ payload }) => {
      const text = payload.text || "(nothing to echo)";
      return {
        text,
        blocks: [
          {
            type: "section",
            text: { type: "mrkdwn", text: `> ${text}` },
          },
          {
            type: "actions",
            block_id: "echo_actions",
            elements: [
              {
                type: "button",
                action_id: "approve_button",
                text: { type: "plain_text", text: "Approve" },
                style: "primary",
                value: text,
              },
              {
                type: "button",
                action_id: "reject_button",
                text: { type: "plain_text", text: "Reject" },
                style: "danger",
                value: text,
              },
            ],
          },
        ],
      };
    },
    async ({ payload }) => {
      console.log(`User ${payload.user_id} echoed: ${payload.text}`);
    },
  );

  // ---------------------
  // Events
  // ---------------------

  // App Home — render a welcome screen when users open the app
  slack.event("app_home_opened", async ({ context, payload }) => {
    await context.client.views.publish({
      user_id: payload.user,
      view: {
        type: "home",
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "Welcome to Hono Bot" },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "This app is built with *slack-hono* on Cloudflare Workers.\n\nTry these commands:",
            },
          },
          { type: "divider" },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "`/hello` — Opens a greeting modal\n`/echo [message]` — Echoes your message with action buttons\n`@Hono Bot [message]` — Mention me in a channel",
            },
          },
        ],
      },
    });
  });

  // App mention — respond in thread
  slack.event("app_mention", async ({ context, payload }) => {
    await context.client.chat.postMessage({
      channel: payload.channel,
      thread_ts: payload.ts,
      text: `Hey <@${payload.user}>! I'm running on Cloudflare Workers with Hono.`,
    });
  });

  // Log all messages (skip bot messages)
  slack.anyMessage(async ({ payload }) => {
    if ("bot_id" in payload && payload.bot_id) return;
    console.log(`Message in ${payload.channel}: ${payload.text}`);
  });

  // ---------------------
  // Block actions
  // ---------------------

  slack.action(
    { type: "button", action_id: "approve_button" },
    async () => {},
    async ({ context, payload }) => {
      const action = payload.actions[0];
      const channelId = context.channelId;
      if (channelId) {
        await context.client.chat.postMessage({
          channel: channelId,
          text: `Approved: "${action.value}"`,
        });
      }
    },
  );

  slack.action(
    { type: "button", action_id: "reject_button" },
    async () => {},
    async ({ context, payload }) => {
      const action = payload.actions[0];
      const channelId = context.channelId;
      if (channelId) {
        await context.client.chat.postMessage({
          channel: channelId,
          text: `Rejected: "${action.value}"`,
        });
      }
    },
  );

  // ---------------------
  // View submissions
  // ---------------------

  // Handle the /hello modal submission
  slack.viewSubmission("hello_modal", async ({ payload }) => {
    const name = payload.view.state.values.name_block.name_input.value ?? "world";
    return {
      response_action: "update",
      view: {
        type: "modal",
        title: { type: "plain_text", text: "Hello!" },
        blocks: [
          {
            type: "section",
            text: { type: "mrkdwn", text: `Hello, *${name}*! :wave:` },
          },
        ],
      },
    };
  });

  return await slack.run(c.req.raw, c.executionCtx);
});

export default app;
