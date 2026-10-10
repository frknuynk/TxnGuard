const apiUrl = (process.env.TXNGUARD_API_URL ?? "http://localhost:3001").replace(/\/$/, "");
const apiKey = process.env.TXNGUARD_API_KEY;

if (!apiKey) {
  console.error("TXNGUARD_API_KEY is required. Export a merchant API key, then run make live-incident.");
  process.exit(1);
}

const runId = `incident-${Date.now().toString(36)}`;
const cases = [
  ["Normal payment", 2_500, "US", "US"],
  ["Cross-border signal", 2_500, "US", "TR"],
  ["High-value signal", 125_000, "US", "US"],
  ["Combined flagged payment", 125_000, "US", "TR"],
  ["Velocity buildup", 2_500, "US", "US"],
  ["Velocity threshold", 2_500, "US", "US"],
  ["Escalated velocity", 125_000, "US", "US"],
  ["Critical decline", 125_000, "US", "TR"],
];

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

console.log("Live incident started. Keep Overview open and do not refresh it.");
console.log("Each accepted API decision is then delivered through BullMQ to Socket.IO.");

for (const [index, [label, amountMinor, cardCountry, ipCountry]] of cases.entries()) {
  const startedAt = performance.now();
  const response = await fetch(`${apiUrl}/transactions`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({
      amountMinor,
      currency: "USD",
      cardBin: "411111",
      cardCountry,
      ipAddress: "203.0.113.42",
      ipCountry,
      idempotencyKey: `${runId}-${index + 1}`,
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.transaction) throw new Error(`${label}: ${response.status}`);
  const tx = payload.transaction;
  console.log(`${String(index + 1).padStart(2, "0")}. ${label}: ${tx.status} / score ${tx.fraudScore} (${Math.round(performance.now() - startedAt)}ms API response)`);
  await pause(900);
}

console.log("Incident complete. The dashboard should have updated per event without a browser refresh.");
