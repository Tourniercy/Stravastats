import type { DetailedActivity, SummaryActivity } from "@/lib/types";
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
		activities.map((stravaActivity) => {
			const activity = {
				name: stravaActivity.name,
				type: stravaActivity.type,
				distance: stravaActivity.distance,
				movingTime: stravaActivity.moving_time,
				elapsedTime: stravaActivity.elapsed_time,
				averageSpeed: stravaActivity.average_speed,
				averageHeartrate: stravaActivity.average_heartrate,
				startDate: new Date(stravaActivity.start_date_local),
			};
			return prisma.activity.upsert({
				where: { id: stravaActivity.id.toString() },
				update: {
					...activity,
				},
				create: {
					id: stravaActivity.id.toString(),
					userId: userId,
					...activity,
				},
			});
		}),
	);
}

export async function storeDetailedActivities(
	userId: string,
	activities: DetailedActivity[],
) {
	return Promise.all(
		activities.map((stravaActivity) => {
			const activity = {
				oneKm: getBestEffortTime(stravaActivity.best_efforts, "1k"),
				fiveKm: getBestEffortTime(stravaActivity.best_efforts, "5k"),
				tenKm: getBestEffortTime(stravaActivity.best_efforts, "10k"),
				halfMarathon: getBestEffortTime(
					stravaActivity.best_efforts,
					"Half-Marathon",
				),
				marathon: getBestEffortTime(stravaActivity.best_efforts, "Marathon"),
				name: stravaActivity.name,
				type: stravaActivity.type,
				distance: stravaActivity.distance,
				movingTime: stravaActivity.moving_time,
				elapsedTime: stravaActivity.elapsed_time,
				averageSpeed: stravaActivity.average_speed,
				averageHeartrate: stravaActivity.average_heartrate,
				startDate: new Date(stravaActivity.start_date_local),
				detailedActivity: true,
			};

			return prisma.activity.upsert({
				where: { id: stravaActivity.id.toString() },
				update: {
					...activity,
				},
				create: {
					id: stravaActivity.id.toString(),
					userId: userId,
					...activity,
				},
			});
		}),
	);
}

interface BestEffort {
	name: string;
	elapsed_time: number;
}

function getBestEffortTime(
	bestEfforts: BestEffort[],
	name: string,
): number | null {
	const effort = bestEfforts.find(
		(e) => e.name.toLowerCase() === name.toLowerCase(),
	);
	return effort ? effort.elapsed_time : null;
}
