import NextAuth, {Account, User} from "next-auth"
import "next-auth/jwt"
import Strava from "next-auth/providers/strava"

declare module "next-auth" {
    interface Session {
        user: any
        account: any
        profile: any
    }
}


export const { handlers, auth, signIn } = NextAuth({
    providers: [
        Strava({ authorization: { params: { scope: "read_all" }, responseType: "code" } }),
    ],
    callbacks: {
        async jwt({ token, user, account, profile }) {
            if (user) {
                token.user = user
                token.account = account
                token.profile = profile
            }
            return token
        },
        async session({ session, token }) {
            session.user = token.user
            session.account = token.account
            session.profile = token.profile
            return session
        },
        async signIn({ user, account, profile }) {
            console.log(user, account, profile)
            return true
        },
        authorized: async ({ auth }) => {
            // Logged in users are authenticated, otherwise redirect to login page
            return !!auth
        },
    },

});