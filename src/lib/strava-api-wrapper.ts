import { getAccount, isTokenValid, updateUserStravaTokens } from "./account";

export interface RateLimitInfo {
	shortTermLimit: number;
	shortTermUsage: number;
	dailyLimit: number;
	dailyUsage: number;
	readShortTermLimit: number;
	readShortTermUsage: number;
	readDailyLimit: number;
	readDailyUsage: number;
}

export interface StravaApiResponse<T = unknown> {
	data: T | null;
	error: boolean;
	status: number;
	rateLimitInfo?: RateLimitInfo;
	errorMessage?: string;
}

export class StravaApiWrapper {
	private baseUrl = "https://www.strava.com/api/v3";
	private rateLimitInfo: RateLimitInfo = {
		shortTermLimit: 200,
		shortTermUsage: 0,
		dailyLimit: 2000,
		dailyUsage: 0,
		readShortTermLimit: 100,
		readShortTermUsage: 0,
		readDailyLimit: 1000,
		readDailyUsage: 0,
	};

	private static instance: StravaApiWrapper;

	public static getInstance(): StravaApiWrapper {
		if (!StravaApiWrapper.instance) {
			StravaApiWrapper.instance = new StravaApiWrapper();
		}
		return StravaApiWrapper.instance;
	}

	private parseRateLimitHeaders(headers: Headers): RateLimitInfo {
		const rateLimit = headers.get("X-RateLimit-Limit")?.split(",");
		const rateUsage = headers.get("X-RateLimit-Usage")?.split(",");
		const readRateLimit = headers.get("X-ReadRateLimit-Limit")?.split(",");
		const readRateUsage = headers.get("X-ReadRateLimit-Usage")?.split(",");

		return {
			shortTermLimit: rateLimit ? Number.parseInt(rateLimit[0]) : 200,
			dailyLimit: rateLimit ? Number.parseInt(rateLimit[1]) : 2000,
			shortTermUsage: rateUsage ? Number.parseInt(rateUsage[0]) : 0,
			dailyUsage: rateUsage ? Number.parseInt(rateUsage[1]) : 0,
			readShortTermLimit: readRateLimit
				? Number.parseInt(readRateLimit[0])
				: 100,
			readDailyLimit: readRateLimit ? Number.parseInt(readRateLimit[1]) : 1000,
			readShortTermUsage: readRateUsage ? Number.parseInt(readRateUsage[0]) : 0,
			readDailyUsage: readRateUsage ? Number.parseInt(readRateUsage[1]) : 0,
		};
	}

	private async delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	private calculateDelayUntilReset(isReadOnlyEndpoint: boolean): number {
		const now = new Date();
		const minutes = now.getMinutes();
		const seconds = now.getSeconds();

		// Calculate minutes until next 15-minute interval
		const minutesToNext15 = 15 - (minutes % 15);
		const totalSeconds = minutesToNext15 * 60 - seconds;

		return Math.max(totalSeconds * 1000, 1000); // At least 1 second
	}

	private isReadOnlyEndpoint(endpoint: string, method: string): boolean {
		const writeEndpoints = [
			"/activities", // POST activities (activities#create)
			"/uploads", // POST uploads (uploads#create)
		];

		if (method !== "GET") {
			return false;
		}

		return !writeEndpoints.some((writeEndpoint) =>
			endpoint.includes(writeEndpoint),
		);
	}

	private checkRateLimit(endpoint: string, method: string): boolean {
		const isReadOnly = this.isReadOnlyEndpoint(endpoint, method);

		if (isReadOnly) {
			return (
				this.rateLimitInfo.readShortTermUsage <
					this.rateLimitInfo.readShortTermLimit &&
				this.rateLimitInfo.readDailyUsage < this.rateLimitInfo.readDailyLimit
			);
		}
		return (
			this.rateLimitInfo.shortTermUsage < this.rateLimitInfo.shortTermLimit &&
			this.rateLimitInfo.dailyUsage < this.rateLimitInfo.dailyLimit
		);
	}

	private async refreshToken(userId: string): Promise<string> {
		const account = await getAccount(userId);

		if (!account?.refresh_token) {
			throw new Error(`No refresh token found for user ${userId}`);
		}

		const response = await fetch(`${this.baseUrl}/oauth/token`, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				// biome-ignore lint/style/noNonNullAssertion: Environment variables are required
				client_id: process.env.AUTH_STRAVA_ID!,
				// biome-ignore lint/style/noNonNullAssertion: Environment variables are required
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

		return data.access_token;
	}

	private async getValidAccessToken(userId: string): Promise<string> {
		const account = await getAccount(userId);

		if (!account) {
			throw new Error(`No Strava account found for user ${userId}`);
		}

		if (isTokenValid(account)) {
			return account.access_token as string;
		}

		return this.refreshToken(userId);
	}

	public async makeRequest<T = unknown>(
		userId: string,
		endpoint: string,
		options: RequestInit = {},
		retryCount = 0,
	): Promise<StravaApiResponse<T>> {
		const maxRetries = 3;
		const method = options.method || "GET";

		// Check rate limits before making request
		if (!this.checkRateLimit(endpoint, method)) {
			const isReadOnly = this.isReadOnlyEndpoint(endpoint, method);
			const delayMs = this.calculateDelayUntilReset(isReadOnly);

			console.log(
				`Rate limit reached for ${isReadOnly ? "read" : "write"} endpoint. Waiting ${delayMs}ms`,
			);

			await this.delay(delayMs);
		}

		try {
			const accessToken = await this.getValidAccessToken(userId);
			const url = `${this.baseUrl}${endpoint}`;

			const response = await fetch(url, {
				...options,
				headers: {
					Authorization: `Bearer ${accessToken}`,
					...options.headers,
				},
			});

			// Update rate limit info from headers
			this.rateLimitInfo = this.parseRateLimitHeaders(response.headers);

			// Handle rate limit exceeded (429)
			if (response.status === 429 && retryCount < maxRetries) {
				const isReadOnly = this.isReadOnlyEndpoint(endpoint, method);
				const delayMs = this.calculateDelayUntilReset(isReadOnly);

				console.log(
					`Rate limit exceeded (429). Retrying in ${delayMs}ms (attempt ${retryCount + 1}/${maxRetries})`,
				);

				await this.delay(delayMs);
				return this.makeRequest(userId, endpoint, options, retryCount + 1);
			}

			// Handle authorization errors (401/403)
			if (
				(response.status === 401 || response.status === 403) &&
				retryCount < maxRetries
			) {
				console.log(
					`Authorization error (${response.status}). Refreshing token and retrying (attempt ${retryCount + 1}/${maxRetries})`,
				);

				try {
					await this.refreshToken(userId);
					return this.makeRequest(userId, endpoint, options, retryCount + 1);
				} catch (tokenError) {
					return {
						data: null,
						error: true,
						status: response.status,
						rateLimitInfo: this.rateLimitInfo,
						errorMessage: `Token refresh failed: ${tokenError instanceof Error ? tokenError.message : "Unknown error"}`,
					};
				}
			}

			const responseData = await response.json();

			return {
				data: response.ok ? responseData : null,
				error: !response.ok,
				status: response.status,
				rateLimitInfo: this.rateLimitInfo,
				errorMessage: response.ok
					? undefined
					: responseData?.message || response.statusText,
			};
		} catch (error) {
			console.error(`Error making request to ${endpoint}:`, error);

			// Retry on network errors
			if (retryCount < maxRetries) {
				console.log(
					`Network error. Retrying in 2s (attempt ${retryCount + 1}/${maxRetries})`,
				);
				await this.delay(2000);
				return this.makeRequest(userId, endpoint, options, retryCount + 1);
			}

			return {
				data: null,
				error: true,
				status: 0,
				rateLimitInfo: this.rateLimitInfo,
				errorMessage: error instanceof Error ? error.message : "Network error",
			};
		}
	}

	// Convenience methods for common Strava API calls
	public async getActivities(
		userId: string,
		params: {
			before?: number;
			after?: number;
			page?: number;
			per_page?: number;
		} = {},
	) {
		const searchParams = new URLSearchParams();
		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined) {
				searchParams.append(key, value.toString());
			}
		}

		const endpoint = `/athlete/activities${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
		return this.makeRequest(userId, endpoint);
	}

	public async getActivity(userId: string, activityId: string) {
		return this.makeRequest(userId, `/activities/${activityId}`);
	}

	public async getAthlete(userId: string) {
		return this.makeRequest(userId, "/athlete");
	}

	public getRateLimitInfo(): RateLimitInfo {
		return { ...this.rateLimitInfo };
	}

	public isNearRateLimit(threshold = 0.8): boolean {
		const readRatio =
			this.rateLimitInfo.readShortTermUsage /
			this.rateLimitInfo.readShortTermLimit;
		const writeRatio =
			this.rateLimitInfo.shortTermUsage / this.rateLimitInfo.shortTermLimit;

		return readRatio >= threshold || writeRatio >= threshold;
	}
}

// Export a singleton instance
export const stravaApi = StravaApiWrapper.getInstance();
