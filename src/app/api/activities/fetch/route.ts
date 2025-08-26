import { auth } from "@/auth";
import {
	getDetailedActivity,
	getUserActivities,
	storeDetailedActivities,
	storeSummaryActivities,
} from "@/lib/activity";
import { logRateLimitStatus } from "@/lib/rate-limit-monitor";
import { type StravaApiResponse, stravaApi } from "@/lib/strava-api-wrapper";
import type { SummaryActivity } from "@/lib/types";
import type { Activity } from "@prisma/client";

async function getStravaActivities(userId: string, lastActivityDate?: Date) {
	const timestamp = lastActivityDate
		? Math.floor((lastActivityDate.getTime() - 48 * 60 * 60 * 1000) / 1000)
		: undefined;

	const params: Record<string, number> = {
		per_page: 200,
		page: 1,
	};

	if (timestamp) {
		params.after = timestamp;
	}

	return (await stravaApi.getActivities(userId, params)) as StravaApiResponse<
		SummaryActivity[]
	>;
}

export async function GET() {
	const session = await auth();

	if (!session?.user) {
		return new Response("Unauthorized", { status: 401 });
	}

	const userId = session.user.id;

	// Create a readable stream
	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();

			try {
				// Step 1: Get existing activities and refresh token
				controller.enqueue(
					encoder.encode(
						`data: ${JSON.stringify({
							type: "progress",
							message: "Getting your activities...",
							progress: 0,
						})}\n\n`,
					),
				);

				const activities = await getUserActivities(userId);

				// Step 2: Fetch new activities from Strava
				controller.enqueue(
					encoder.encode(
						`data: ${JSON.stringify({
							type: "progress",
							message: "Fetching new activities from Strava...",
							progress: 10,
						})}\n\n`,
					),
				);

				const stravaActivitiesResult = await getStravaActivities(
					userId,
					activities?.[0]?.startDate,
				);

				if (!stravaActivitiesResult.error && stravaActivitiesResult.data) {
					const stravaActivities =
						stravaActivitiesResult.data as SummaryActivity[];
					console.log(
						`Storing ${stravaActivities.length} summary activities for user ${userId}`,
					);
					try {
						await storeSummaryActivities(userId, stravaActivities);
						console.log(
							`Successfully stored ${stravaActivities.length} summary activities`,
						);
						controller.enqueue(
							encoder.encode(
								`data: ${JSON.stringify({
									type: "progress",
									message: `Stored ${stravaActivities.length} new activities`,
									progress: 20,
								})}\n\n`,
							),
						);
					} catch (error) {
						console.error("Error storing summary activities:", error);
						controller.enqueue(
							encoder.encode(
								`data: ${JSON.stringify({
									type: "error",
									message: `Failed to store activities: ${error instanceof Error ? error.message : "Unknown error"}`,
									progress: 0,
								})}\n\n`,
							),
						);
						controller.close();
						return;
					}
				}

				// Step 3: Get activities that need detailed data
				const nonDetailedActivities = await getUserActivities(userId, false);
				const totalActivities = nonDetailedActivities.length;

				if (totalActivities === 0) {
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({
								type: "complete",
								message: "All activities are up to date!",
								progress: 100,
							})}\n\n`,
						),
					);
					controller.close();
					return;
				}

				controller.enqueue(
					encoder.encode(
						`data: ${JSON.stringify({
							type: "progress",
							message: `Fetching detailed data for ${totalActivities} activities...`,
							progress: 25,
						})}\n\n`,
					),
				);

				// Step 4: Process activities in batches with progress updates
				const batchSize = 20;
				let processed = 0;

				const processActivitiesBatch = async (batch: Activity[]) => {
					const detailedActivities = await Promise.all(
						batch.map(async (activity) => {
							if (!activity.detailedActivity) {
								return getDetailedActivity(activity.id, userId);
							}
							return null;
						}),
					);

					const filteredActivities = detailedActivities.filter(
						(activity) => activity !== null && activity !== undefined,
					);

					if (filteredActivities.length > 0) {
						console.log(
							`Storing ${filteredActivities.length} detailed activities for batch`,
						);
						try {
							await storeDetailedActivities(userId, filteredActivities);
							console.log(
								`Successfully stored ${filteredActivities.length} detailed activities`,
							);
						} catch (error) {
							console.error("Error storing detailed activities:", error);
							throw error;
						}
					}
				};

				for (let i = 0; i < nonDetailedActivities.length; i += batchSize) {
					const batch = nonDetailedActivities.slice(i, i + batchSize);
					await processActivitiesBatch(batch);

					processed += batch.length;
					const progress = Math.round(25 + (processed / totalActivities) * 70);

					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({
								type: "progress",
								message: `Processing activities... ${processed}/${totalActivities}`,
								progress: progress,
							})}\n\n`,
						),
					);
				}

				// Step 5: Log rate limit status and complete
				logRateLimitStatus();

				controller.enqueue(
					encoder.encode(
						`data: ${JSON.stringify({
							type: "complete",
							message: "All activities processed successfully!",
							progress: 100,
						})}\n\n`,
					),
				);

				controller.close();
			} catch (error) {
				console.error("Error in activity fetch stream:", error);
				controller.enqueue(
					encoder.encode(
						`data: ${JSON.stringify({
							type: "error",
							message:
								error instanceof Error ? error.message : "An error occurred",
							progress: 0,
						})}\n\n`,
					),
				);
				controller.close();
			}
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	});
}
