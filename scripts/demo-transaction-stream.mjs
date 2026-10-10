const apiUrl = (process.env.TXNGUARD_API_URL ?? "http://localhost:3001").replace(/\/$/, "");
const apiKey = process.env.TXNGUARD_API_KEY;

if (!apiKey) {
  console.error("TXNGUARD_API_KEY is required. Export a merchant API key, then run make demo-flow.");
  process.exit(1);
}

const runId = Date.now().toString(36);
const baseTransaction = {
  currency: "USD",
  cardBin: "411111",
  ipAddress: "203.0.113.42",
};

const scenarios = [
  {
    label: "Baseline payment",
    expected: "approved, no rules",
    input: { amountMinor: 2_500, cardCountry: "US", ipCountry: "US" },
  },
  {
    label: "Country mismatch",
    expected: "approved, low severity",
    input: { amountMinor: 2_500, cardCountry: "US", ipCountry: "TR" },
  },
  {
    label: "High amount",
    expected: "approved, low severity",
    input: { amountMinor: 125_000, cardCountry: "US", ipCountry: "US" },
  },
  {
    label: "High amount plus country mismatch",
    expected: "flagged, medium severity",
    input: { amountMinor: 125_000, cardCountry: "US", ipCountry: "TR" },
  },
  {
    label: "Velocity window filler",
    expected: "approved, no rules",
    input: { amountMinor: 2_500, cardCountry: "US", ipCountry: "US" },
  },
  {
    label: "Velocity threshold exceeded",
    expected: "approved, low severity",
    input: { amountMinor: 2_500, cardCountry: "US", ipCountry: "US" },
  },
  {
    label: "Repeated velocity event",
    expected: "approved, low severity",
    input: { amountMinor: 2_500, cardCountry: "US", ipCountry: "US" },
  },
  {
    label: "High amount during velocity spike",
    expected: "flagged, high severity",
    input: { amountMinor: 125_000, cardCountry: "US", ipCountry: "US" },
  },
  {
    label: "Critical combined fraud signal",
    expected: "declined, critical severity",
    input: { amountMinor: 125_000, cardCountry: "US", ipCountry: "TR" },
  },
];

async function sendTransaction(scenario, index) {
  const response = await fetch(`${apiUrl}/transactions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      ...baseTransaction,
      ...scenario.input,
      idempotencyKey: `demo-${runId}-${String(index + 1).padStart(2, "0")}`,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.transaction) {
    throw new Error(`${scenario.label}: ${response.status} ${JSON.stringify(payload)}`);
  }

  return payload.transaction;
}

console.log(`Sending ${scenarios.length} demo transactions to ${apiUrl}...`);
console.log("For predictable velocity results, wait 60 seconds after any previous demo run.");

const results = [];
for (const [index, scenario] of scenarios.entries()) {
  const transaction = await sendTransaction(scenario, index);
  results.push(transaction);
  const rules = transaction.fraudReasons.length ? transaction.fraudReasons.join(", ") : "none";
  console.log(
    `${String(index + 1).padStart(2, "0")}. ${scenario.label}: ` +
      `${transaction.status} | score ${transaction.fraudScore} | ${transaction.fraudSeverity} | rules: ${rules}`,
  );
}

const statusCounts = results.reduce(
  (counts, transaction) => ({
    ...counts,
    [transaction.status]: counts[transaction.status] + 1,
  }),
  { approved: 0, flagged: 0, declined: 0 },
);

console.log("\nDemo complete. Dashboard events were queued for realtime delivery.");
console.log(`Summary: ${statusCounts.approved} approved, ${statusCounts.flagged} flagged, ${statusCounts.declined} declined.`);
