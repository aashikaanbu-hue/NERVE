import {
  PrismaClient,
  UserRole,
  UserStatus,
} from "@prisma/client";

import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const demoUsers = [
  {
    fullName: "Meghalaya State Authority",
    email: "authority@nerve.gov.in",
    password: "NerveGov@2026",
    role: UserRole.GOVERNMENT_AUTHORITY,
    organisation:
      "Government of Meghalaya",
    district: "East Khasi Hills",
  },

  {
    fullName: "North East Logistics Centre",
    email: "logistics@nerve.in",
    password: "NerveLogistics@2026",
    role: UserRole.LOGISTICS_OPERATOR,
    organisation:
      "NER Essential Logistics",
    district: "East Khasi Hills",
  },

  {
    fullName: "Field Response Officer",
    email: "field@nerve.gov.in",
    password: "NerveField@2026",
    role: UserRole.FIELD_OFFICIAL,
    organisation:
      "District Disaster Management Authority",
    district: "East Khasi Hills",
  },

  {
    fullName: "Essential Delivery Driver",
    email: "driver@nerve.in",
    password: "NerveDriver@2026",
    role: UserRole.DRIVER,
    organisation:
      "NER Essential Logistics",
    district: "East Khasi Hills",
  },
] as const;

async function seed(): Promise<void> {
  console.log(
    "Creating NERVE demo users...",
  );

  for (const demoUser of demoUsers) {
    const passwordHash =
      await bcrypt.hash(
        demoUser.password,
        12,
      );

    await prisma.user.upsert({
      where: {
        email: demoUser.email,
      },

      update: {
        fullName: demoUser.fullName,
        passwordHash,
        role: demoUser.role,
        status: UserStatus.ACTIVE,
        organisation:
          demoUser.organisation,
        district: demoUser.district,
      },

      create: {
        fullName: demoUser.fullName,
        email: demoUser.email,
        passwordHash,
        role: demoUser.role,
        status: UserStatus.ACTIVE,
        organisation:
          demoUser.organisation,
        district: demoUser.district,
      },
    });

    console.log(
      `Created ${demoUser.role}: ${demoUser.email}`,
    );
  }

  console.log(
    "NERVE demo users are ready.",
  );
}

seed()
 .catch((error) => {
  console.error(
    "Database seed failed:",
    error,
  );

  throw error;
})