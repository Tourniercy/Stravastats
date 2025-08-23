import { prisma } from "../../prisma";

export async function getAccount(userId: string) {
	try {
		const account = await prisma.account.findFirst({
			where: {
				userId: userId,
				provider: "strava",
			},
			orderBy: {
				createdAt: 'desc'
			}
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
