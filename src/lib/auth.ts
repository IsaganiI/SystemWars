import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { db } from "@/lib/db";

export const auth = betterAuth({
  appName: "SystemWars",
  database: db,
  emailAndPassword: { enabled: true },
  plugins: [username({ minUsernameLength: 3, maxUsernameLength: 20 })],
});
