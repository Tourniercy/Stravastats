"use client";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, formatDistanceInKm, formatDuration } from "@/lib/utils";
import type { ColumnDef, SortingFn } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

const nullsLastSort: SortingFn<Activity> = (rowA, rowB, columnId) => {
	const a = rowA.getValue(columnId) as number | null;
	const b = rowB.getValue(columnId) as number | null;
	if (a == null && b == null) return 0;
	if (a == null) return 1;
	if (b == null) return -1;
	return a - b;
};

export type Activity = {
	id: string;
	name: string;
	type: string;
	distance: number;
	movingTime: number;
	elapsedTime: number;
	averageSpeed: number;
	averageHeartrate?: number | null;
	startDate: Date;
	oneKm?: number | null;
	fiveKm?: number | null;
	tenKm?: number | null;
	halfMarathon?: number | null;
	marathon?: number | null;
	detailedActivity: boolean;
};

export const columns: ColumnDef<Activity>[] = [
	{
		accessorKey: "startDate",
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Date
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
		cell: ({ row }) => {
			return formatDate(row.getValue("startDate"));
		},
	},
	{
		accessorKey: "name",
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Name
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
	},
	{
		accessorKey: "type",
		header: "Type",
	},
	{
		accessorKey: "distance",
		header: ({ column }) => {
			return (
				<div className="text-right">
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Distance
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				</div>
			);
		},
		cell: ({ row }) => {
			return (
				<div className="text-right font-medium">
					{formatDistanceInKm(row.getValue("distance"))}
				</div>
			);
		},
	},
	{
		accessorKey: "movingTime",
		header: ({ column }) => {
			return (
				<div className="text-right">
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Moving Time
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				</div>
			);
		},
		cell: ({ row }) => {
			return (
				<div className="text-right font-medium">
					{formatDuration(row.getValue("movingTime"))}
				</div>
			);
		},
	},
	{
		accessorKey: "elapsedTime",
		header: ({ column }) => {
			return (
				<div className="text-right">
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Elapsed Time
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				</div>
			);
		},
		cell: ({ row }) => {
			return (
				<div className="text-right font-medium">
					{formatDuration(row.getValue("elapsedTime"))}
				</div>
			);
		},
	},
	{
		accessorKey: "averageSpeed",
		header: ({ column }) => {
			return (
				<div className="text-right">
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Avg Speed
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				</div>
			);
		},
		cell: ({ row }) => {
			const speed = Number.parseFloat(row.getValue("averageSpeed"));
			const formatted = (speed * 3.6).toFixed(2);
			return <div className="text-right font-medium">{formatted} km/h</div>;
		},
	},
	{
		accessorKey: "averageHeartrate",
		header: ({ column }) => {
			return (
				<div className="text-right">
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Avg HR
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				</div>
			);
		},
		cell: ({ row }) => {
			const heartrate = row.getValue("averageHeartrate") as number | null;
			return (
				<div className="text-right font-medium">
					{heartrate ? heartrate.toFixed(0) : "N/A"}
				</div>
			);
		},
	},
	{
		accessorKey: "oneKm",
		sortingFn: nullsLastSort,
		header: ({ column }) => {
			return (
				<div className="text-right">
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						1K Best
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				</div>
			);
		},
		cell: ({ row }) => {
			const time = row.getValue("oneKm") as number | null;
			return (
				<div className="text-right font-medium">
					{time ? formatDuration(time) : "N/A"}
				</div>
			);
		},
	},
	{
		accessorKey: "fiveKm",
		sortingFn: nullsLastSort,
		header: ({ column }) => {
			return (
				<div className="text-right">
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						5K Best
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				</div>
			);
		},
		cell: ({ row }) => {
			const time = row.getValue("fiveKm") as number | null;
			return (
				<div className="text-right font-medium">
					{time ? formatDuration(time) : "N/A"}
				</div>
			);
		},
	},
	{
		accessorKey: "tenKm",
		sortingFn: nullsLastSort,
		header: ({ column }) => {
			return (
				<div className="text-right">
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						10K Best
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				</div>
			);
		},
		cell: ({ row }) => {
			const time = row.getValue("tenKm") as number | null;
			return (
				<div className="text-right font-medium">
					{time ? formatDuration(time) : "N/A"}
				</div>
			);
		},
	},
	{
		id: "actions",
		cell: ({ row }) => {
			const activity = row.original;

			return (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<span className="sr-only">Open menu</span>
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Actions</DropdownMenuLabel>
						<DropdownMenuItem
							onClick={() => navigator.clipboard.writeText(activity.id)}
						>
							Copy activity ID
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem>View details</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			);
		},
	},
];
