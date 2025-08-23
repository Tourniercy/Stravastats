import { auth } from "@/auth";
import { getAccount, updateUserStravaTokens } from "@/lib/account";
import {
	getDetailedActivity,
	getUserActivities,
	storeDetailedActivities,
	storeSummaryActivities,
} from "@/lib/activity";
import type { Activity } from "@prisma/client";

async function refreshStravaToken(userId: string) {
	const account = await getAccount(userId);

	if (!account?.refresh_token) {
		throw new Error(`No refresh token found for user ${userId}`);
	}

	try {
		const response = await fetch("https://www.strava.com/api/v3/oauth/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				client_id: process.env.AUTH_STRAVA_ID!,
				client_secret: process.env.AUTH_STRAVA_SECRET!,
				grant_type: "refresh_token",
				refresh_token: account.refresh_token,
			}),
		});

		if (!response.ok) {
			throw new Error(`Failed to refresh token: ${response.statusText}`);
		}

		const data = await response.json();

		if (!data.access_token || !data.refresh_token) {
			throw new Error("Invalid token response from Strava");
		}

		await updateUserStravaTokens(
			data.access_token,
			data.refresh_token,
			account.providerAccountId,
		);

		return { ...data, stravaUserId: account.providerAccountId };
	} catch (error) {
		console.error("Error refreshing token:", error);
		throw error;
	}
}

async function getStravaActivities(
	accessToken: string,
	lastActivityDate?: Date,
) {
	const timestamp = lastActivityDate
		? Math.floor((lastActivityDate.getTime() - 48 * 60 * 60 * 1000) / 1000)
		: undefined;

	const url = timestamp
		? `https://www.strava.com/api/v3/athlete/activities?per_page=200&page=1&after=${timestamp}`
		: "https://www.strava.com/api/v3/athlete/activities?per_page=200&page=1";

	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	const responseJson = await response.json();

	if (!response.ok) {
		return null;
	}

	return responseJson;
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
				const tokenData = await refreshStravaToken(userId);
				const accessToken = tokenData.access_token;

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

				const stravaActivities = await getStravaActivities(
					accessToken,
					activities?.[0]?.startDate,
				);

				if (stravaActivities) {
					console.log(`Storing ${stravaActivities.length} summary activities for user ${userId}`);
					try {
						await storeSummaryActivities(userId, stravaActivities);
						console.log(`Successfully stored ${stravaActivities.length} summary activities`);
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
								return getDetailedActivity(activity.id, accessToken);
							}
							return null;
						}),
					);

					const filteredActivities = detailedActivities.filter(
						(activity) => activity !== null && activity !== undefined,
					);

					if (filteredActivities.length > 0) {
						console.log(`Storing ${filteredActivities.length} detailed activities for batch`);
						try {
							await storeDetailedActivities(userId, filteredActivities);
							console.log(`Successfully stored ${filteredActivities.length} detailed activities`);
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

				// Step 5: Complete
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
							message: error instanceof Error ? error.message : "An error occurred",
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