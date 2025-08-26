import { auth } from "@/auth";
import SignIn from "@/components/sign-in";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

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
