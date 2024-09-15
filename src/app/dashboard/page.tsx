import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {auth} from "@/auth";

async function getStravaStats(token: string) {
    const athleteResponse = await fetch('https://www.strava.com/api/v3/athlete', {
        headers: { 'Authorization': `Bearer ${token}` },
    })
    const athleteData = await athleteResponse.json()

    const statsResponse = await fetch(`https://www.strava.com/api/v3/athletes/${athleteData.id}/stats`, {
        headers: { 'Authorization': `Bearer ${token}` },
    })
    const statsData = await statsResponse.json()

    return { athlete: athleteData, stats: statsData }
}

export default async function Dashboard() {
    const session = await auth()

    if (!session?.user) {
        return <div>Not authenticated</div>
    }

    const { athlete, stats } = await getStravaStats(session.account.access_token)

    return (
        <div className="min-h-screen bg-gradient-to-r from-orange-400 to-red-500 p-8">
            <h1 className="text-4xl font-bold text-white mb-8">Your Strava Stats</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Profile</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Name: {athlete.firstname} {athlete.lastname}</p>
                        <p>City: {athlete.city}</p>
                        <p>Country: {athlete.country}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>All-Time Stats</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Total Distance: {(stats.all_run_totals.distance / 1000).toFixed(2)} km</p>
                        <p>Total Runs: {stats.all_run_totals.count}</p>
                        <p>Total Moving Time: {(stats.all_run_totals.moving_time / 3600).toFixed(2)} hours</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Stats (Last 4 Weeks)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Recent Distance: {(stats.recent_run_totals.distance / 1000).toFixed(2)} km</p>
                        <p>Recent Runs: {stats.recent_run_totals.count}</p>
                        <p>Recent Moving Time: {(stats.recent_run_totals.moving_time / 3600).toFixed(2)} hours</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}