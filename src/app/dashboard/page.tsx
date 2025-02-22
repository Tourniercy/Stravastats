import { auth } from "@/auth";
import { redirect } from "next/navigation";
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
import { getDetailedActivity, getUserActivities, storeDetailedActivities, storeSummaryActivities } from "@/lib/activity";
import { formatDate, formatDistanceInKm, formatDuration } from "@/lib/utils";
import type { Activity } from "@prisma/client";
import { headers } from 'next/headers'


async function refreshStravaToken(userId: string) {
	const account = await getAccount(userId)
	
	if (!account?.refresh_token) {
		throw new Error(`No refresh token found for user ${userId}`)
	}

	try {
		const response = await fetch("https://www.strava.com/api/v3/oauth/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				client_id: process.env.AUTH_STRAVA_ID!,
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				client_secret: process.env.AUTH_STRAVA_SECRET!,
				grant_type: "refresh_token",
				refresh_token: account.refresh_token,
			}),
		})

		if (!response.ok) {
			throw new Error(`Failed to refresh token: ${response.statusText}`)
		}

		const data = await response.json()
		
		if (!data.access_token || !data.refresh_token) {
			throw new Error("Invalid token response from Strava")
		}

		await updateUserStravaTokens(
			data.access_token,
			data.refresh_token,
			account.providerAccountId,
		)

		return { ...data, stravaUserId: account.providerAccountId }
	} catch (error) {
		console.error("Error refreshing token:", error)
		throw error
	}
}
async function getStravaActivities(
	accessToken: string,
	userId: string,
	lastActivityDate?: Date,
) {
	console.log("accessToken", accessToken);
	
	// Convert to Unix timestamp (seconds, not milliseconds)
	const timestamp = lastActivityDate 
		? Math.floor((lastActivityDate.getTime() - 48 * 60 * 60 * 1000) / 1000)
		: undefined;
	
	console.log("Unix timestamp in seconds:", timestamp);
	
	const url = timestamp
		? `https://www.strava.com/api/v3/athlete/activities?per_page=200&page=1&after=${timestamp}`
		: "https://www.strava.com/api/v3/athlete/activities?per_page=200&page=1";

	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	const responseJson = await response.json();

	if (!response.ok)
	{
		return null
	}
	

	return responseJson;
}

export default async function Dashboard() {
	// Await headers before auth check
	await headers()
	const session = await auth()
	
	if (!session?.user) {
		redirect("/")
	}

	const userId = session.user.id
	const activities = await getUserActivities(userId)

	const data = await refreshStravaToken(userId)

	const accessToken = data.access_token
	const stravaUserId = data.stravaUserId
	const stravaActivities = await getStravaActivities(
		accessToken,
		stravaUserId,
		activities?.[0]?.startDate,
	)

	if (stravaActivities) {
		await storeSummaryActivities(userId, stravaActivities)
	}

	const nonDetailedActivities = await getUserActivities(userId, false)

	// Function to process activities in batches
	async function processActivitiesBatch(batch: Activity[]) {
		const detailedActivities = await Promise.all(
			batch.map(async (activity) => {
				if (!activity.detailedActivity) {
					return getDetailedActivity(activity.id, accessToken)
				}
				return null
			}),
		)

		const filteredActivities = detailedActivities.filter(
			(activity) => activity !== null && activity !== undefined,
		)

		await storeDetailedActivities(userId, filteredActivities)
	}

	// Process activities in batches of 20
	const batchSize = 20
	for (let i = 0; i < nonDetailedActivities.length; i += batchSize) {
		const batch = nonDetailedActivities.slice(i, i + batchSize)
		await processActivitiesBatch(batch)
	}

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
