
import { signIn } from "@/auth"

export default function SignIn() {
    return (
        <form
            action={async () => {
                "use server"
                await signIn('strava', { callbackUrl: '/dashboard' })

            }}
        >
            <button type="submit">Signin with Strava</button>
        </form>
    )
}