"use client";

import { signIn } from "next-auth/react";

export default function SignIn() {
	return (
		<button
			type="button"
			onClick={() => signIn("strava")}
			className="bg-[#FC4C02] hover:bg-[#E34402] text-white px-4 py-2 rounded"
		>
			Sign in with Strava
		</button>
	);
}
