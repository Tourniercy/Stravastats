import { stravaApi } from "./strava-api-wrapper";

export interface RateLimitStatus {
	shortTermPercentUsed: number;
	dailyPercentUsed: number;
	readShortTermPercentUsed: number;
	readDailyPercentUsed: number;
	isNearLimit: boolean;
	recommendation: string;
}

export function getRateLimitStatus(threshold = 0.8): RateLimitStatus {
	const rateLimitInfo = stravaApi.getRateLimitInfo();

	const shortTermPercentUsed =
		rateLimitInfo.shortTermUsage / rateLimitInfo.shortTermLimit;
	const dailyPercentUsed = rateLimitInfo.dailyUsage / rateLimitInfo.dailyLimit;
	const readShortTermPercentUsed =
		rateLimitInfo.readShortTermUsage / rateLimitInfo.readShortTermLimit;
	const readDailyPercentUsed =
		rateLimitInfo.readDailyUsage / rateLimitInfo.readDailyLimit;

	const isNearLimit = stravaApi.isNearRateLimit(threshold);

	let recommendation = "Normal operation";
	if (shortTermPercentUsed >= threshold) {
		recommendation = "Consider reducing write operations frequency";
	} else if (readShortTermPercentUsed >= threshold) {
		recommendation = "Consider reducing read operations frequency";
	} else if (dailyPercentUsed >= 0.9) {
		recommendation =
			"Daily limit nearly reached - consider postponing operations";
	} else if (readDailyPercentUsed >= 0.9) {
		recommendation =
			"Daily read limit nearly reached - consider postponing read operations";
	}

	return {
		shortTermPercentUsed: Math.round(shortTermPercentUsed * 100),
		dailyPercentUsed: Math.round(dailyPercentUsed * 100),
		readShortTermPercentUsed: Math.round(readShortTermPercentUsed * 100),
		readDailyPercentUsed: Math.round(readDailyPercentUsed * 100),
		isNearLimit,
		recommendation,
	};
}

export function logRateLimitStatus() {
	const status = getRateLimitStatus();
	const rateLimitInfo = stravaApi.getRateLimitInfo();

	console.log("Strava API Rate Limit Status:");
	console.log(
		`  Write API - Short term: ${rateLimitInfo.shortTermUsage}/${rateLimitInfo.shortTermLimit} (${status.shortTermPercentUsed}%)`,
	);
	console.log(
		`  Write API - Daily: ${rateLimitInfo.dailyUsage}/${rateLimitInfo.dailyLimit} (${status.dailyPercentUsed}%)`,
	);
	console.log(
		`  Read API - Short term: ${rateLimitInfo.readShortTermUsage}/${rateLimitInfo.readShortTermLimit} (${status.readShortTermPercentUsed}%)`,
	);
	console.log(
		`  Read API - Daily: ${rateLimitInfo.readDailyUsage}/${rateLimitInfo.readDailyLimit} (${status.readDailyPercentUsed}%)`,
	);
	console.log(`  Near limit: ${status.isNearLimit}`);
	console.log(`  Recommendation: ${status.recommendation}`);
}
