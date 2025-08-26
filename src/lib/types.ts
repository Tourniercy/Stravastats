export type SummaryActivity = {
	id: number;
	name: string;
	type: string;
	distance: number;
	moving_time: number;
	elapsed_time: number;
	average_speed: number;
	average_heartrate: number;
	start_date_local: string;
};

export type BestEffort = {
	name: string;
	elapsed_time: number;
};

export type DetailedActivity = SummaryActivity & {
	best_efforts: [BestEffort];
};
