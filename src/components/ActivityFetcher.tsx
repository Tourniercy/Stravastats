"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface FetchProgress {
	type: "progress" | "complete" | "error";
	message: string;
	progress: number;
}

interface ActivityFetcherProps {
	onComplete?: () => void;
}

export default function ActivityFetcher({ onComplete }: ActivityFetcherProps) {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [progress, setProgress] = useState<FetchProgress | null>(null);

	const fetchActivities = async () => {
		setIsLoading(true);
		setProgress({ type: "progress", message: "Starting...", progress: 0 });

		try {
			const response = await fetch("/api/activities/fetch");
			if (!response.ok) {
				throw new Error("Failed to start activity fetch");
			}

			const reader = response.body?.getReader();
			const decoder = new TextDecoder();

			if (!reader) {
				throw new Error("No response body");
			}

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value);
				const lines = chunk.split("\n");

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						try {
							const data = JSON.parse(line.slice(6));
							setProgress(data);

							if (data.type === "complete" || data.type === "error") {
								setIsLoading(false);
								if (data.type === "complete") {
									// Wait a moment to show success, then refresh the page
									setTimeout(() => {
										if (onComplete) {
											onComplete();
										} else {
											router.refresh();
										}
									}, 1500);
								}
							}
						} catch (e) {
							console.error("Error parsing SSE data:", e);
						}
					}
				}
			}
		} catch (error) {
			console.error("Error fetching activities:", error);
			setProgress({
				type: "error",
				message: error instanceof Error ? error.message : "An error occurred",
				progress: 0,
			});
			setIsLoading(false);
		}
	};

	const getStatusIcon = () => {
		if (!progress) return null;

		switch (progress.type) {
			case "progress":
				return isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : null;
			case "complete":
				return <CheckCircle className="h-5 w-5 text-green-500" />;
			case "error":
				return <XCircle className="h-5 w-5 text-red-500" />;
			default:
				return null;
		}
	};

	const getProgressColor = () => {
		if (!progress) return "";

		switch (progress.type) {
			case "complete":
				return "bg-green-500";
			case "error":
				return "bg-red-500";
			default:
				return "";
		}
	};

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					Activity Fetcher
					{getStatusIcon()}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex flex-col gap-4">
					<Button
						onClick={fetchActivities}
						disabled={isLoading}
						className="w-full"
					>
						{isLoading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Fetching Activities...
							</>
						) : (
							"Fetch Latest Activities"
						)}
					</Button>

					{progress && (
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span
									className={progress.type === "error" ? "text-red-600" : ""}
								>
									{progress.message}
								</span>
								<span className="text-muted-foreground">
									{progress.progress}%
								</span>
							</div>
							<Progress
								value={progress.progress}
								className="w-full"
								color={getProgressColor()}
							/>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
