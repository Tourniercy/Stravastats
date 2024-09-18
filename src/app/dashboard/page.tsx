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
import { formatDate, formatDistance, formatDuration } from "@/lib/utils";
import { prisma } from "../../../prisma"; // Make sure this import matches your project structure

async function refreshStravaToken(userId: string) {
	const account = await prisma.account.findFirst({
		where: { provider: "strava", userId: userId },
	});

	if (!account?.refresh_token) {
		throw new Error("No refresh token found");
	}
	console.log(process.env.AUTH_STRAVA_ID);
	try {
		const response = await fetch("https://www.strava.com/api/v3/oauth/token", {
			method: "POST",
			body: JSON.stringify({
				client_id: process.env.AUTH_STRAVA_ID,
				client_secret: process.env.AUTH_STRAVA_SECRET,
				grant_type: "refresh_token",
				refresh_token: account.refresh_token,
			}),
		});

		console.log(await response.json());

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();

		const accessToken = data.access_token;
		const refreshToken = data.refresh_token;

		await prisma.account.update({
			where: { provider: "strava", userId: userId },
			data: {
				access_token: accessToken,
				refresh_token: refreshToken,
			},
		});

		console.log(data);
		return data;
	} catch (error) {
		console.error("Error:", error);
	}
}

async function getStravaActivities(accessToken: string, userId: string) {
	console.log("accessToken", accessToken);
	const response = await fetch(
		"https://www.strava.com/api/v3/athlete/activities?per_page=30",
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		},
	);

	if (!response.ok) {
		await refreshStravaToken(userId);
		// return await getStravaActivities(accessToken, userId);
	}

	return response.json();
}

async function getActivitiesFromDatabase(userId: string) {
	return prisma.activity.findMany({
		where: { userId: userId },
		orderBy: { startDate: "desc" },
		take: 30,
	});
}

async function getStravaAccessTokenFromDatabase(userId: string) {
	const account = await prisma.account.findFirst({
		where: { userId: userId },
	});
	return account?.access_token;
}

async function storeActivitiesInDatabase(userId: string, activities: any[]) {
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
					startDate: new Date(activity.start_date),
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
					startDate: new Date(activity.start_date),
				},
			}),
		),
	);
}

export default async function Dashboard() {
	const session = await auth();
	const userId = session?.user?.id;
	const stravaAccessToken = await getStravaAccessTokenFromDatabase(userId);
	let activities = [];

	if (session?.user?.id) {
		// First, try to get activities from the database
		activities = await getActivitiesFromDatabase(session.user.id);

		// If no activities in the database, fetch from Strava API and store them
		console.log("activities", activities);
		if (activities.length === 0 && stravaAccessToken) {
			const stravaActivities = await getStravaActivities(
				stravaAccessToken,
				userId,
			);

			// Store activities in the database
			activities = await storeActivitiesInDatabase(
				session.user.id,
				stravaActivities,
			);
		}
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
										<TableCell>{formatDistance(activity.distance)}</TableCell>
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
