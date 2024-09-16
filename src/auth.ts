import NextAuth, { type Account, type Profile } from "next-auth";
import "next-auth/jwt";
import type { AdapterUser } from "@auth/core/adapters";
import Strava from "next-auth/providers/strava";

declare module "next-auth" {
	interface Session {
		user: CustomUser;
		account: Account;
		profile: Profile;
	}
}

type CustomUser = AdapterUser & {
	emailVerified: Date | null;
	isEmailVerified: boolean;
};

export const { handlers, auth, signIn } = NextAuth({
	providers: [
		Strava({
			authorization: { params: { scope: "read_all" }, responseType: "code" },
		}),
	],
	callbacks: {
		async jwt({ token, user, account, profile }) {
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
			console.log(user, account, profile);
			return true;
		},
		authorized: async ({ auth }) => {
			return !!auth;
		},
	},
});
