import { registerAs } from "@nestjs/config";

export default registerAs("queue", () => ({
  prefix: process.env.QUEUE_PREFIX || "complaint-portal",
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 1000,
    },
  },
}));
