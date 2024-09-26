import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

import { format, formatDistanceToNow } from "date-fns";

export function formatDistance(meters: number): string {
	const kilometers = meters / 1000;
	return `${kilometers.toFixed(2)} km`;
}

export function formatDuration(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const remainingSeconds = seconds % 60;

	if (hours > 0) {
		return `${hours}h ${minutes}m ${remainingSeconds}s`;
	}
	if (minutes > 0) {
		return `${minutes}m ${remainingSeconds}s`;
	}
	return `${remainingSeconds}s`;
}

export function formatDate(date: Date): string {
	return format(date, "MMM d, yyyy");
}

export function formatRelativeDate(dateString: string): string {
	const date = new Date(dateString);
	return formatDistanceToNow(date, { addSuffix: true });
}
