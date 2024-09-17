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

async function getStravaStats(token: string) {
	const athleteResponse = await fetch("https://www.strava.com/api/v3/athlete", {
		headers: { Authorization: `Bearer ${token}` },
	});
	const athleteData = await athleteResponse.json();

	const statsResponse = await fetch(
		`https://www.strava.com/api/v3/athletes/${athleteData.id}/stats`,
		{
			headers: { Authorization: `Bearer ${token}` },
		},
	);
	const statsData = await statsResponse.json();

	const activitiesResponse = await fetch(
		`https://www.strava.com/api/v3/athletes/${athleteData.id}/activities`,
		{
			headers: { Authorization: `Bearer ${token}` },
		},
	);
	const activitiesData = await activitiesResponse.json();

	return { athlete: athleteData, stats: statsData, activities: activitiesData };
}

export default async function Dashboard() {
	const session = await auth();
	const { athlete, stats, activities } = await getStravaStats(
		session?.account?.access_token,
	);

	return (
		<div className="min-h-screen bg-gradient-to-r from-orange-400 to-red-500 p-8">
			<h1 className="text-4xl font-bold text-white mb-8">Your Strava Stats</h1>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
				<Card>
					<CardHeader>
						<CardTitle>Profile</CardTitle>
					</CardHeader>
					<CardContent>
						<p>
							Name: {athlete.firstname} {athlete.lastname}
						</p>
						<p>City: {athlete.city}</p>
						<p>Country: {athlete.country}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>All-Time Stats</CardTitle>
					</CardHeader>
					<CardContent>
						<p>
							Total Distance: {formatDistance(stats.all_run_totals.distance)}
						</p>
						<p>Total Runs: {stats.all_run_totals.count}</p>
						<p>
							Total Moving Time:{" "}
							{formatDuration(stats.all_run_totals.moving_time)}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Recent Stats (Last 4 Weeks)</CardTitle>
					</CardHeader>
					<CardContent>
						<p>
							Recent Distance:{" "}
							{formatDistance(stats.recent_run_totals.distance)}
						</p>
						<p>Recent Runs: {stats.recent_run_totals.count}</p>
						<p>
							Recent Moving Time:{" "}
							{formatDuration(stats.recent_run_totals.moving_time)}
						</p>
					</CardContent>
				</Card>
			</div>
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
									<TableCell>{formatDate(activity.start_date)}</TableCell>
									<TableCell>{activity.name}</TableCell>
									<TableCell>{activity.type}</TableCell>
									<TableCell>{formatDistance(activity.distance)}</TableCell>
									<TableCell>{formatDuration(activity.moving_time)}</TableCell>
									<TableCell>
										{(activity.average_speed * 3.6).toFixed(2)} km/h
									</TableCell>
									<TableCell>
										{activity.average_heartrate?.toFixed(0) || "N/A"}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
			<pre>{JSON.stringify(activities[0], null, 2)}</pre>
		</div>
	);
}
