import NextAuth, { type Account, type Profile } from "next-auth";
import "next-auth/jwt";
import type { AdapterUser } from "@auth/core/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Strava from "next-auth/providers/strava";
import { prisma } from "../prisma";

declare module "next-auth" {
	interface Session {
		user: StravaUser;
		account: Account;
		profile: Profile;
	}
}

type StravaUser = AdapterUser & {
	emailVerified: Date | null;
	isEmailVerified: boolean;
};

export const { handlers, auth, signIn } = NextAuth({
	adapter: PrismaAdapter(prisma),
	providers: [
		Strava({
			authorization: {
				params: { scope: ["profile:read_all", "activity:read_all"] },
				responseType: "code",
			},
			profile(profile) {
				console.log("profileT", profile);
				return {
					id: profile.id.toString(), // Convert id to string
					name: profile.username,
					image: profile.profile,
				};
			},
		}),
	],
	callbacks: {
		async jwt({ token, user, account, profile }) {
			console.log("jwt", token, user, account, profile);
			if (user) {
				token.user = user;
				token.account = account;
				token.profile = profile;
			}
			return token;
		},
		async session({ session, token }) {
			const adapterUser = token.user as AdapterUser;
			session.user = {
				...adapterUser,
				emailVerified: adapterUser.emailVerified,
				isEmailVerified: adapterUser.emailVerified instanceof Date,
			};
			session.account = token.account as Account;
			session.profile = token.profile as Profile;
			return session;
		},
		async signIn({ user, account, profile }) {
			if (account?.provider === "strava") {
				const stravaId = profile?.id;
				user.email = `strava_${stravaId}@example.com`;
			}
			return true;
		},
		authorized: async ({ auth }) => {
			return !!auth;
		},
	},
});
