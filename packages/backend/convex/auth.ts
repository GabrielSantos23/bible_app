import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { expo } from "@better-auth/expo";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth";
import { v } from "convex/values";

const nativeAppUrl = process.env.NATIVE_APP_URL || "mybettertapp://";
const expoUrl = process.env.EXPO_URL || "exp://192.168.15.2:8081";
const baseURL = process.env.CONVEX_SITE_URL;
const secret = process.env.BETTER_AUTH_SECRET;

export const authComponent = createClient<DataModel>(components.betterAuth);

function createAuth(
	ctx: GenericCtx<DataModel>,
	{ optionsOnly }: { optionsOnly?: boolean } = { optionsOnly: false },
) {
	return betterAuth({
		baseURL,
		secret,
		logger: {
			disabled: optionsOnly,
		},
		trustedOrigins: [nativeAppUrl, expoUrl],
		database: authComponent.adapter(ctx),
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false,
		},
		plugins: [expo(), convex()],
	});
}

export { createAuth };

export const getCurrentUser = query({
	args: {},
	returns: v.any(),
	handler: async function (ctx, args) {
		return authComponent.getAuthUser(ctx);
	},
});
