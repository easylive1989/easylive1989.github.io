/**
 * Cloudflare Analytics Report Script
 *
 * Fetches daily traffic data from Cloudflare GraphQL Analytics API
 * and sends a summary to Discord.
 *
 * Required environment variables:
 *   CLOUDFLARE_API_TOKEN  - API token with Analytics read permission
 *   CLOUDFLARE_ZONE_ID    - Zone ID for the domain
 *   DISCORD_WEBHOOK_URL   - Discord webhook URL for notifications
 */

const CLOUDFLARE_API = "https://api.cloudflare.com/client/v4/graphql";

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function formatNumber(n) {
  return n.toLocaleString("en-US");
}

async function fetchAnalytics(zoneId, apiToken, date) {
  const query = `
    query {
      viewer {
        zones(filter: { zoneTag: "${zoneId}" }) {
          httpRequests1dGroups(
            filter: { date: "${date}" }
            limit: 1
          ) {
            dimensions { date }
            sum {
              requests
              pageViews
              bytes
              threats
              cachedRequests
              cachedBytes
            }
            uniq { uniques }
          }
          httpRequests1dGroups: httpRequests1dGroups(
            filter: { date_geq: "${formatDate(new Date(new Date(date).getTime() - 6 * 86400000))}", date_leq: "${date}" }
            limit: 7
            orderBy: [date_ASC]
          ) {
            dimensions { date }
            sum { pageViews requests }
            uniq { uniques }
          }
        }
      }
    }
  `;

  // Use separate queries to avoid field alias issues
  const todayQuery = `
    query {
      viewer {
        zones(filter: { zoneTag: "${zoneId}" }) {
          httpRequests1dGroups(
            filter: { date: "${date}" }
            limit: 1
          ) {
            dimensions { date }
            sum {
              requests
              pageViews
              bytes
              threats
              cachedRequests
              cachedBytes
            }
            uniq { uniques }
          }
        }
      }
    }
  `;

  const weekStart = formatDate(
    new Date(new Date(date).getTime() - 6 * 86400000)
  );
  const weekQuery = `
    query {
      viewer {
        zones(filter: { zoneTag: "${zoneId}" }) {
          httpRequests1dGroups(
            filter: { date_geq: "${weekStart}", date_leq: "${date}" }
            limit: 7
            orderBy: [date_ASC]
          ) {
            dimensions { date }
            sum { pageViews requests }
            uniq { uniques }
          }
        }
      }
    }
  `;

  const headers = {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };

  const [todayRes, weekRes] = await Promise.all([
    fetch(CLOUDFLARE_API, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: todayQuery }),
    }),
    fetch(CLOUDFLARE_API, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: weekQuery }),
    }),
  ]);

  if (!todayRes.ok || !weekRes.ok) {
    throw new Error(
      `Cloudflare API error: today=${todayRes.status}, week=${weekRes.status}`
    );
  }

  const todayData = await todayRes.json();
  const weekData = await weekRes.json();

  if (todayData.errors?.length) {
    throw new Error(
      `GraphQL errors: ${todayData.errors.map((e) => e.message).join(", ")}`
    );
  }

  const todayGroups =
    todayData.data?.viewer?.zones?.[0]?.httpRequests1dGroups ?? [];
  const weekGroups =
    weekData.data?.viewer?.zones?.[0]?.httpRequests1dGroups ?? [];

  return { today: todayGroups[0] ?? null, week: weekGroups };
}

function buildDiscordMessage(date, today, week) {
  if (!today) {
    return {
      content: `📊 **Cloudflare 流量報告** - ${date}\n\n⚠️ 該日無數據（可能資料尚未準備好）`,
    };
  }

  const { sum, uniq } = today;
  const bytesInMB = (sum.bytes / 1024 / 1024).toFixed(1);
  const cacheRate =
    sum.requests > 0
      ? ((sum.cachedRequests / sum.requests) * 100).toFixed(1)
      : 0;

  // Build 7-day trend
  const trend = week
    .map((day) => {
      const d = day.dimensions.date;
      const pv = day.sum.pageViews;
      const uv = day.uniq.uniques;
      const bar = "█".repeat(Math.max(1, Math.round(pv / Math.max(...week.map((w) => w.sum.pageViews)) * 10)));
      return `${d}  ${bar} ${pv} PV / ${uv} UV`;
    })
    .join("\n");

  const totalWeekPV = week.reduce((s, d) => s + d.sum.pageViews, 0);
  const totalWeekUV = week.reduce((s, d) => s + d.uniq.uniques, 0);

  const content = `📊 **Cloudflare 流量報告** - ${date}

**今日摘要**
👀 Page Views: **${formatNumber(sum.pageViews)}**
👤 Unique Visitors: **${formatNumber(uniq.uniques)}**
🌐 Total Requests: **${formatNumber(sum.requests)}**
💾 Bandwidth: **${bytesInMB} MB**
⚡ Cache Rate: **${cacheRate}%**
🛡️ Threats Blocked: **${formatNumber(sum.threats)}**

**近 7 天趨勢**
\`\`\`
${trend}
\`\`\`
📈 7 天合計: ${formatNumber(totalWeekPV)} PV / ${formatNumber(totalWeekUV)} UV`;

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
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!apiToken || !zoneId || !webhookUrl) {
    console.error(
      "Missing required env vars: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID, DISCORD_WEBHOOK_URL"
    );
    process.exit(1);
  }

  // Fetch yesterday's data (today's data may not be complete)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = formatDate(yesterday);

  console.log(`Fetching Cloudflare analytics for ${date}...`);

  const { today, week } = await fetchAnalytics(zoneId, apiToken, date);
  const message = buildDiscordMessage(date, today, week);

  console.log("Sending report to Discord...");
  await sendToDiscord(webhookUrl, message);

  console.log("Done!");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
