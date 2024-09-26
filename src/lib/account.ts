import { prisma } from "../../prisma";

export async function getAccount(userId: string) {
	return prisma.account.findFirst({
		where: { userId: userId, provider: "strava" },
	});
}

export async function updateUserStravaTokens(
	accessToken: string,
	refreshToken: string,
	providerAccountId: string,
) {
	await prisma.account.update({
		where: {
			provider_providerAccountId: {
				provider: "strava",
				providerAccountId: providerAccountId,
			},
		},
		data: {
			access_token: accessToken,
			refresh_token: refreshToken,
		},
	});
}
