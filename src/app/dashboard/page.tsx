import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ActivityFetcher from "@/components/ActivityFetcher";
import { getUserActivities } from "@/lib/activity";
import { redirect } from "next/navigation";
import { ActivityDataTable } from "@/components/activity-data-table";
import { columns } from "@/components/activity-columns";

export default async function Dashboard() {
	const session = await auth();

	if (!session?.user) {
		redirect("/");
	}

	const userId = session.user.id;
	const activities = await getUserActivities(userId);
	
	console.log(`Dashboard: Found ${activities.length} activities for user ${userId}`);

	return (
		<div className="min-h-screen p-8">
			<h1 className="text-4xl font-bold mb-8">Your Strava Stats</h1>
			{session ? (
				<div className="space-y-6">
					<ActivityFetcher />
					
					<Card>
						<CardHeader>
							<CardTitle>Recent Activities</CardTitle>
						</CardHeader>
						<CardContent>
							{activities.length === 0 ? (
								<div className="text-center py-8 text-gray-500">
									No activities found. Click "Fetch Latest Activities" to get your Strava data.
								</div>
							) : (
								<ActivityDataTable columns={columns} data={activities} />
							)}
						</CardContent>
					</Card>
				</div>
			) : (
				<div>Please sign in to view your Strava stats</div>
			)}
		</div>
	);
}
