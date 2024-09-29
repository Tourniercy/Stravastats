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

		return await response.json();
	} catch (error) {
		console.error("Error:", error);
	}
}

export async function storeSummaryActivities(
	userId: string,
	activities: SummaryActivity[],
) {
	return Promise.all(
		activities.map((activity) =>
			prisma.activity.upsert({
				where: { id: activity.id.toString() },
				update: {
					name: activity.name,
					type: activity.type,
					distance: activity.distance,
					movingTime: activity.moving_time,
					elapsedTime: activity.elapsed_time,
					averageSpeed: activity.average_speed,
					averageHeartrate: activity.average_heartrate,
					startDate: new Date(activity.start_date_local),
				},
				create: {
					id: activity.id.toString(),
					userId: userId,
					name: activity.name,
					type: activity.type,
					distance: activity.distance,
					movingTime: activity.moving_time,
					elapsedTime: activity.elapsed_time,
					averageSpeed: activity.average_speed,
					averageHeartrate: activity.average_heartrate,
					startDate: new Date(activity.start_date_local),
				},
			}),
		),
	);
}

export async function storeDetailedActivities(
	userId: string,
	activities: DetailedActivity[],
) {
	return Promise.all(
		activities.map((activity) => {
			const bestEfforts = {
				oneKm: getBestEffortTime(activity.best_efforts, "1k"),
				fiveKm: getBestEffortTime(activity.best_efforts, "5k"),
				tenKm: getBestEffortTime(activity.best_efforts, "10k"),
				halfMarathon: getBestEffortTime(activity.best_efforts, "Half-Marathon"),
				marathon: getBestEffortTime(activity.best_efforts, "Marathon"),
			};

			return prisma.activity.upsert({
				where: { id: activity.id.toString() },
				update: {
					name: activity.name,
					type: activity.type,
					distance: activity.distance,
					movingTime: activity.moving_time,
					elapsedTime: activity.elapsed_time,
					averageSpeed: activity.average_speed,
					averageHeartrate: activity.average_heartrate,
					startDate: new Date(activity.start_date_local),
					...bestEfforts,
				},
				create: {
					id: activity.id.toString(),
					userId: userId,
					name: activity.name,
					type: activity.type,
					distance: activity.distance,
					movingTime: activity.moving_time,
					elapsedTime: activity.elapsed_time,
					averageSpeed: activity.average_speed,
					averageHeartrate: activity.average_heartrate,
					startDate: new Date(activity.start_date_local),
					...bestEfforts,
				},
			});
		}),
	);
}

function getBestEffortTime(bestEfforts: any[], name: string): number | null {
	const effort = bestEfforts.find(
		(e) => e.name.toLowerCase() === name.toLowerCase(),
	);
	return effort ? effort.elapsed_time : null;
}
