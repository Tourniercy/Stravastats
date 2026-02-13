import { stravaApi } from "@/lib/strava-api-wrapper";
import type { DetailedActivity, SummaryActivity } from "@/lib/types";
import { prisma } from "../../prisma";

export async function getUserActivities(userId: string, detailedOnly = false) {
	const whereClause = detailedOnly
		? { userId: userId, type: "Run", detailedActivity: true }
		: { userId: userId, type: "Run" };

	return prisma.activity.findMany({
		where: whereClause,
		orderBy: { startDate: "desc" },
	});
}

export async function getDetailedActivity(
	activityId: string,
	userId: string,
): Promise<DetailedActivity | null> {
	try {
		const result = await stravaApi.getActivity(userId, activityId);

		if (result.error) {
			console.log(
				`Failed to fetch activity ${activityId}: ${result.errorMessage || result.status}`,
			);
			return null;
		}

		return result.data as DetailedActivity;
	} catch (error) {
		console.error("Error:", error);
		return null;
	}
}

export async function storeSummaryActivities(
	userId: string,
	activities: SummaryActivity[],
) {
	console.log(
		`storeSummaryActivities: Processing ${activities.length} activities for user ${userId}`,
	);

	try {
		const results = await Promise.all(
			activities.map(async (stravaActivity) => {
				const activity = {
					name: stravaActivity.name,
					type: stravaActivity.type,
					distance: stravaActivity.distance,
					movingTime: stravaActivity.moving_time,
					elapsedTime: stravaActivity.elapsed_time,
					averageSpeed: stravaActivity.average_speed,
					averageHeartrate: stravaActivity.average_heartrate,
					startDate: new Date(stravaActivity.start_date_local),
					detailedActivity: false,
				};

				console.log(
					`Upserting activity ${stravaActivity.id} for user ${userId}`,
				);

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

		console.log(
			`storeSummaryActivities: Successfully processed ${results.length} activities`,
		);
		return results;
	} catch (error) {
		console.error("Error in storeSummaryActivities:", error);
		throw error;
	}
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
	if (!bestEfforts || bestEfforts.length === 0) {
		return null;
	}
	const effort = bestEfforts.find(
		(e) => e.name.toLowerCase() === name.toLowerCase(),
	);
	return effort ? effort.elapsed_time : null;
}
