// MongoDB Migration Script for Driver Onboarding State Machine
// RUN IN STAGING FIRST before production!
//
// Usage: mongosh "mongodb+srv://..." migration.js
// Or paste into MongoDB Compass shell

print("=== Driver Onboarding Migration ===\n");

// 1. Add rejectionHistory array to all drivers
print("Step 1: Adding rejectionHistory array...");
const step1 = db.drivers.updateMany(
  { rejectionHistory: { $exists: false } },
  { $set: { rejectionHistory: [] } }
);
print(`  Updated ${step1.modifiedCount} drivers\n`);

// 2. Set onboardingStatus for pending drivers
print("Step 2: Setting onboardingStatus for pending drivers...");
const step2 = db.drivers.updateMany(
  { status: "pending", onboardingStatus: { $exists: false } },
  { $set: { onboardingStatus: "not_started" } }
);
print(`  Updated ${step2.modifiedCount} drivers\n`);

// 3. Set onboardingStatus for approved drivers WITHOUT contracts
print("Step 3: Setting onboardingStatus for approved drivers without contracts...");
const step3 = db.drivers.updateMany(
  { 
    status: "approved", 
    onboardingStatus: { $exists: false },
    "contracts.employmentContractSignedAt": { $exists: false }
  },
  { $set: { onboardingStatus: "contracts_pending", canAcceptJobs: false } }
);
print(`  Updated ${step3.modifiedCount} drivers\n`);

// 4. Grandfather in approved drivers WITH contracts (already working)
// NOTE: employeeStartDate is set to now - review and backfill manually if needed
print("Step 4: Grandfathering active drivers with existing contracts...");
const step4 = db.drivers.updateMany(
  { 
    status: "approved", 
    "contracts.employmentContractSignedAt": { $exists: true },
    "contracts.driverAgreementSignedAt": { $exists: true },
    "contracts.workHealthSafetySignedAt": { $exists: true },
    "contracts.codeOfConductSignedAt": { $exists: true }
  },
  { 
    $set: { 
      onboardingStatus: "active", 
      canAcceptJobs: true,
      employeeStartDate: new Date()  // Review this - may want to use existing date
    } 
  }
);
print(`  Updated ${step4.modifiedCount} drivers\n`);

// 5. Remove insuranceEligible field (now virtual/derived)
print("Step 5: Removing stored insuranceEligible field (now derived)...");
const step5 = db.drivers.updateMany(
  { insuranceEligible: { $exists: true } },
  { $unset: { insuranceEligible: "" } }
);
print(`  Updated ${step5.modifiedCount} drivers\n`);

// 6. Force all drivers to employee type and remove ABN
print("Step 6: Enforcing employee type and removing ABN...");
const step6 = db.drivers.updateMany(
  {},
  { $set: { employmentType: "employee" }, $unset: { abn: "" } }
);
print(`  Updated ${step6.modifiedCount} drivers\n`);

// 7. Set rejected drivers to not_started
print("Step 7: Setting onboardingStatus for rejected drivers...");
const step7 = db.drivers.updateMany(
  { status: "rejected", onboardingStatus: { $exists: false } },
  { $set: { onboardingStatus: "not_started" } }
);
print(`  Updated ${step7.modifiedCount} drivers\n`);

// 8. Set suspended drivers (keep their previous onboardingStatus if exists)
print("Step 8: Ensuring suspended drivers have onboardingStatus...");
const step8 = db.drivers.updateMany(
  { status: "suspended", onboardingStatus: { $exists: false } },
  { $set: { onboardingStatus: "not_started" } }
);
print(`  Updated ${step8.modifiedCount} drivers\n`);

// Verification
print("\n=== Verification ===\n");
print("Onboarding Status Counts:");
print(`  not_started: ${db.drivers.countDocuments({ onboardingStatus: "not_started" })}`);
print(`  contracts_pending: ${db.drivers.countDocuments({ onboardingStatus: "contracts_pending" })}`);
print(`  active: ${db.drivers.countDocuments({ onboardingStatus: "active" })}`);
print(`  (missing): ${db.drivers.countDocuments({ onboardingStatus: { $exists: false } })}`);

print("\nDriver Status Counts:");
print(`  pending: ${db.drivers.countDocuments({ status: "pending" })}`);
print(`  approved: ${db.drivers.countDocuments({ status: "approved" })}`);
print(`  rejected: ${db.drivers.countDocuments({ status: "rejected" })}`);
print(`  suspended: ${db.drivers.countDocuments({ status: "suspended" })}`);

print("\nEmployment Type:");
print(`  employee: ${db.drivers.countDocuments({ employmentType: "employee" })}`);
print(`  other: ${db.drivers.countDocuments({ employmentType: { $ne: "employee" } })}`);

print("\nCan Accept Jobs:");
print(`  true: ${db.drivers.countDocuments({ canAcceptJobs: true })}`);
print(`  false: ${db.drivers.countDocuments({ canAcceptJobs: false })}`);

print("\n=== Migration Complete ===");
