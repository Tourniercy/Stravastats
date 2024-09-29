import { prisma } from "../../prisma";

export async function getUserActivities(userId: string) {
	return prisma.activity.findMany({
		where: { userId: userId },
		orderBy: { startDate: "desc" },
	});
}

export async function getDetailedActivity(
	activityId: string,
	token: string,
): Promise<Promise<DetailedActivity> | null | undefined> {
	try {
		const response = await fetch(
			`https://www.strava.com/api/v3/activities/${activityId}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		return await response.json();
	} catch (error) {
		console.error("Error:", error);
	}
}
