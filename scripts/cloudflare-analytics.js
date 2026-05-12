/**
 * Cloudflare Web Analytics (RUM) Report Script
 *
 * Fetches daily Web Analytics data from Cloudflare RUM GraphQL API
 * and sends a summary to Discord.
 *
 * Required environment variables:
 *   CLOUDFLARE_API_TOKEN  - API token with Account Analytics Read permission
 *   CLOUDFLARE_ACCOUNT_ID - Account ID for the Cloudflare account
 *   DISCORD_WEBHOOK_URL   - Discord webhook URL for notifications
 */

const CLOUDFLARE_GRAPHQL = "https://api.cloudflare.com/client/v4/graphql";
const SITE_TAG = "3c65582aa3704510be97c0638201eaa0";

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function formatNumber(n) {
  return n.toLocaleString("en-US");
}

async function graphql(apiToken, query, variables) {
  const res = await fetch(CLOUDFLARE_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cloudflare API ${res.status}: ${body}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(
      `GraphQL errors: ${json.errors.map((e) => e.message).join(", ")}`
    );
  }
  return json.data;
}

async function fetchAnalytics(accountTag, apiToken, date, weekStart) {
  const totalsQuery = `
    query Totals($accountTag: String!, $siteTag: String!, $date: Date!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          totals: rumPageloadEventsAdaptiveGroups(
            filter: { siteTag: $siteTag, date: $date, bot: 0 }
            limit: 1
          ) {
            count
            sum { visits }
          }
          byBrowser: rumPageloadEventsAdaptiveGroups(
            filter: { siteTag: $siteTag, date: $date, bot: 0 }
            limit: 3
            orderBy: [count_DESC]
          ) {
            count
            dimensions { userAgentBrowser }
          }
          byCountry: rumPageloadEventsAdaptiveGroups(
            filter: { siteTag: $siteTag, date: $date, bot: 0 }
            limit: 3
            orderBy: [count_DESC]
          ) {
            count
            dimensions { countryName }
          }
        }
      }
    }
  `;

  const weekQuery = `
    query Week($accountTag: String!, $siteTag: String!, $start: Date!, $end: Date!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          rumPageloadEventsAdaptiveGroups(
            filter: {
              siteTag: $siteTag
              date_geq: $start
              date_leq: $end
              bot: 0
            }
            limit: 7
            orderBy: [date_ASC]
          ) {
            count
            sum { visits }
            dimensions { date }
          }
        }
      }
    }
  `;

  const [totalsData, weekData] = await Promise.all([
    graphql(apiToken, totalsQuery, { accountTag, siteTag: SITE_TAG, date }),
    graphql(apiToken, weekQuery, {
      accountTag,
      siteTag: SITE_TAG,
      start: weekStart,
      end: date,
    }),
  ]);

  const account = totalsData?.viewer?.accounts?.[0];
  const weekAccount = weekData?.viewer?.accounts?.[0];

  return {
    today: account?.totals?.[0] ?? null,
    byBrowser: account?.byBrowser ?? [],
    byCountry: account?.byCountry ?? [],
    week: weekAccount?.rumPageloadEventsAdaptiveGroups ?? [],
  };
}

function buildDiscordMessage(date, { today, byBrowser, byCountry, week }) {
  if (!today || today.count === 0) {
    return {
      content: `📊 **Cloudflare Web Analytics 報告** - ${date}\n\n⚠️ 該日無數據（可能資料尚未準備好或站台無流量）`,
    };
  }

  const pv = today.count;
  const visits = today.sum?.visits ?? 0;

  const maxPV = Math.max(1, ...week.map((d) => d.count));
  const trend = week
    .map((day) => {
      const d = day.dimensions.date;
      const dPV = day.count;
      const dVisits = day.sum?.visits ?? 0;
      const bar = "█".repeat(
        Math.max(1, Math.round((dPV / maxPV) * 10))
      );
      return `${d}  ${bar} ${dPV} PV / ${dVisits} Visits`;
    })
    .join("\n");

  const totalWeekPV = week.reduce((s, d) => s + d.count, 0);
  const totalWeekVisits = week.reduce(
    (s, d) => s + (d.sum?.visits ?? 0),
    0
  );

  const browserLines =
    byBrowser
      .map(
        (b, i) =>
          `${i + 1}. ${b.dimensions.userAgentBrowser || "Unknown"}: ${formatNumber(b.count)}`
      )
      .join("\n") || "（無資料）";

  const countryLines =
    byCountry
      .map(
        (c, i) =>
          `${i + 1}. ${c.dimensions.countryName || "Unknown"}: ${formatNumber(c.count)}`
      )
      .join("\n") || "（無資料）";

  const content = `📊 **Cloudflare Web Analytics 報告** - ${date}

**今日摘要**
👀 Page Views: **${formatNumber(pv)}**
👤 Visits: **${formatNumber(visits)}**

**Top Browser**
${browserLines}

**Top Country**
${countryLines}

**近 7 天趨勢**
\`\`\`
${trend}
\`\`\`
📈 7 天合計: ${formatNumber(totalWeekPV)} PV / ${formatNumber(totalWeekVisits)} Visits`;

  return { content };
}

async function sendToDiscord(webhookUrl, message) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Discord webhook error: ${res.status} - ${body}`);
  }
}

async function main() {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const accountTag = process.env.CLOUDFLARE_ACCOUNT_ID;
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!apiToken || !accountTag || !webhookUrl) {
    console.error(
      "Missing required env vars: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, DISCORD_WEBHOOK_URL"
    );
    process.exit(1);
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = formatDate(yesterday);
  const weekStart = formatDate(
    new Date(yesterday.getTime() - 6 * 86400000)
  );

  console.log(`Fetching Cloudflare Web Analytics for ${date}...`);
  const data = await fetchAnalytics(accountTag, apiToken, date, weekStart);

  const message = buildDiscordMessage(date, data);

  console.log("Sending report to Discord...");
  await sendToDiscord(webhookUrl, message);

  console.log("Done!");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
