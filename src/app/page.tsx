import { auth } from "@/auth";
import SignIn from "@/components/sign-in";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function Home() {
    const session = await auth();

    if (session?.user) {
        redirect("/dashboard");
    }

    return (
        <div className="flex min-h-screen items-center justify-center">
            <SignIn />
        </div>
    );
} 