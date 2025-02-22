import { auth } from "@/auth"
import SignIn from "@/components/sign-in"

export default async function TestPage() {
    const session = await auth()
    console.log("Test page rendering, session:", session)
    
    return (
        <div className="p-4">
            <h1>Test Page</h1>
            <pre>{JSON.stringify(session, null, 2)}</pre>
            {!session && <SignIn />}
        </div>
    )
} 