import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { getAccount, updateUserStravaTokens } from "@/lib/account";
import { getDetailedActivity, getUserActivities } from "@/lib/activity";
import { formatDate, formatDistanceInKm, formatDuration } from "@/lib/utils";
import type { Activity } from "@prisma/client";
import { prisma } from "../../../prisma"; // Make sure this import matches your project structure

async function refreshStravaToken(userId: string) {
	const account = await getAccount(userId);

	if (!account?.refresh_token) {
		throw new Error("No refresh token found");
	}

	try {
		const response = await fetch("https://www.strava.com/api/v3/oauth/token", {
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			method: "POST",
			body: new URLSearchParams({
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				client_id: process.env.AUTH_STRAVA_ID!,
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				client_secret: process.env.AUTH_STRAVA_SECRET!,
				grant_type: "refresh_token",
				refresh_token: account.refresh_token,
			}),
		});

		const data = await response.json();

		const accessToken = data.access_token;
		const refreshToken = data.refresh_token;

		await updateUserStravaTokens(
			accessToken,
			refreshToken,
			account.providerAccountId,
		);

		return { ...data, stravaUserId: account.providerAccountId };
	} catch (error) {
		console.error("Error:", error);
	}
}
async function getStravaActivities(
	accessToken: string,
	userId: string,
	lastActivityDate?: Date,
) {
	let url: string;
	if (lastActivityDate) {
		const lastActivityTimestamp = lastActivityDate.getTime();
		url = `https://www.strava.com/api/v3/athlete/activities?per_page=200&page=1&after=${lastActivityTimestamp}`;
	} else {
		url =
			"https://www.strava.com/api/v3/athlete/activities?per_page=200&page=1";
	}
	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!response.ok) {
		// await refreshStravaToken(userId);
		return await getStravaActivities(accessToken, userId);
	}

	return response.json();
}

async function storeActivitiesInDatabase(
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
					averageSpeed: activity.average_speed,
					averageHeartrate: activity.average_heartrate,
					elapsedTime: activity.elapsed_time,
					startDate: new Date(activity.start_date_local),
				},
				create: {
					id: activity.id.toString(),
					userId: userId,
					name: activity.name,
					type: activity.type,
					distance: activity.distance,
					movingTime: activity.moving_time,
					averageSpeed: activity.average_speed,
					averageHeartrate: activity.average_heartrate,
					elapsedTime: activity.elapsed_time,
					startDate: new Date(activity.start_date_local),
				},
			}),
		),
	);
}

export default async function Dashboard() {
	const session = await auth();
	const userId = session?.user.id as string;

	let activities = await getUserActivities(userId);

	const data = await refreshStravaToken(userId);
	const accessToken = data.access_token;
	const stravaUserId = data.stravaUserId;
	const stravaActivities = await getStravaActivities(
		accessToken,
		stravaUserId,
		activities?.[0]?.startDate,
	);

	if (stravaActivities) {
		await storeActivitiesInDatabase(userId, stravaActivities);
	}

	activities = await getUserActivities(userId);

	// Function to process activities in batches
	async function processActivitiesBatch(batch: Activity[]) {
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

		await storeActivitiesInDatabase(userId, filteredActivities);
	}

	// Process activities in batches of 20
	const batchSize = 20;
	for (let i = 0; i < activities.length; i += batchSize) {
		const batch = activities.slice(i, i + batchSize);
		await processActivitiesBatch(batch);
	}

	// If no activities in the database, fetch from Strava API and store them
	// console.log("activities", activities);
	// if (activities.length === 0 && stravaAccessToken) {
	// 	const stravaActivities = await getStravaActivities(
	// 		stravaAccessToken,
	// 		userId,
	// 	);
	//
	// 	// Store activities in the database
	// 	activities = await storeActivitiesInDatabase(userId, stravaActivities);
	// }

	return (
		<div className="min-h-screen bg-gradient-to-r from-orange-400 to-red-500 p-8">
			<h1 className="text-4xl font-bold text-white mb-8">Your Strava Stats</h1>
			{session ? (
				<Card>
					<CardHeader>
						<CardTitle>Recent Activities</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Date</TableHead>
									<TableHead>Name</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Distance</TableHead>
									<TableHead>Duration</TableHead>
									<TableHead>Avg Speed</TableHead>
									<TableHead>Avg HR</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{activities.map((activity) => (
									<TableRow key={activity.id}>
										<TableCell>{formatDate(activity.startDate)}</TableCell>
										<TableCell>{activity.name}</TableCell>
										<TableCell>{activity.type}</TableCell>
										<TableCell>
											{formatDistanceInKm(activity.distance)}
										</TableCell>
										<TableCell>{formatDuration(activity.movingTime)}</TableCell>
										<TableCell>
											{(activity.averageSpeed * 3.6).toFixed(2)} km/h
										</TableCell>
										<TableCell>
											{activity.averageHeartrate?.toFixed(0) || "N/A"}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			) : (
				<div>Please sign in to view your Strava stats</div>
			)}
		</div>
	);
}
