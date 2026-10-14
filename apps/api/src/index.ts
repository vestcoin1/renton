import "dotenv/config";
import { databaseService, RentonDatabaseService } from "./services/database.service.js";

export { databaseService, RentonDatabaseService };

async function main() {
  const result = await databaseService.healthCheck();
  console.log("Prisma DB status:", result);
}

if (process.env.NODE_ENV !== "test") {
  void main();
}
