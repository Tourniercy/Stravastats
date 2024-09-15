
import { signIn } from "@/auth"

export default function SignIn() {
    return (
        <form
            action={async () => {
                "use server"
                await signIn('strava', { redirectTo: "/dashboard" })
            }}
        >
            <button type="submit">Signin with Strava</button>
        </form>
    )
}