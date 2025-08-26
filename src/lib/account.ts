import { prisma } from "../../prisma";

export async function getAccount(userId: string) {
	try {
		const account = await prisma.account.findFirst({
			where: {
				userId: userId,
				provider: "strava",
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		if (!account) {
			throw new Error(`No Strava account found for user ${userId}`);
		}

		return account;
	} catch (error) {
		console.error("Error getting account:", error);
		return null;
	}
}

export async function updateUserStravaTokens(
	accessToken: string,
	refreshToken: string,
	providerAccountId: string,
) {
	return prisma.account.update({
		where: {
			provider_providerAccountId: {
				provider: "strava",
				providerAccountId,
			},
		},
		data: {
			access_token: accessToken,
			refresh_token: refreshToken,
		},
	});
}

export function isTokenValid(account: {
	access_token?: string | null;
	expires_at?: number | null;
}) {
	if (!account.access_token) {
		return false;
	}

	if (!account.expires_at) {
		// If no expiration time, assume token is still valid
		return true;
	}

	// Check if token expires in the next 5 minutes (300 seconds buffer)
	const now = Math.floor(Date.now() / 1000);
	return account.expires_at > now + 300;
}
