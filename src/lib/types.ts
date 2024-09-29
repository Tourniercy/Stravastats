type SummaryActivity = {
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

type DetailedActivity = SummaryActivity & {
	any;
};
