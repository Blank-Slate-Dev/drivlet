// Fix BookingRequest.paymentToken index (E11000 on { paymentToken: null }).
//
// The old index was { unique: true, sparse: true }. A sparse index still
// indexes documents whose field is present-but-null, and every new booking
// request writes paymentToken: null (schema default). So only ONE unreviewed
// request could exist at a time — the next submission threw a duplicate-key
// error and the API returned 500. This replaces it with a PARTIAL unique index
// that only applies to real (string) tokens, so unlimited null requests coexist
// while genuine tokens stay unique.
//
// RUN IN STAGING FIRST, then production.
// Usage: mongosh "mongodb+srv://<prod-connection-string>" scripts/fix-payment-token-index.js

print("=== Fix BookingRequest paymentToken index ===\n");

const coll = db.bookingrequests;
const existing = coll.getIndexes().find((i) => i.name === "paymentToken_1");

if (existing) {
  print("Found existing paymentToken_1: " + JSON.stringify(existing));
  if (existing.partialFilterExpression) {
    print("  Already a partial index — nothing to change.\n");
  } else {
    coll.dropIndex("paymentToken_1");
    print("  Dropped old (sparse/unique) index.\n");
  }
} else {
  print("No paymentToken_1 index found — will create it.\n");
}

if (!coll.getIndexes().find((i) => i.name === "paymentToken_1")) {
  coll.createIndex(
    { paymentToken: 1 },
    {
      unique: true,
      partialFilterExpression: { paymentToken: { $type: "string" } },
      name: "paymentToken_1",
    }
  );
  print("Created partial unique paymentToken_1.\n");
}

print("Final indexes on bookingrequests:");
printjson(coll.getIndexes());
print("\n=== Done ===");
