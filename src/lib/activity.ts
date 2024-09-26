import { prisma } from "../../prisma";

export async function getUserActivities(userId: string) {
	return prisma.activity.findMany({
		where: { userId: userId },
		orderBy: { startDate: "desc" },
	});
}
