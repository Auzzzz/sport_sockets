import { Router } from 'express';
import { createMatchSchema, listMatchesQuerySchema } from '../utils/validation/matches.js';
import { db } from '../db/index.js';
import { matches } from '../db/schema.js';
import { getMatchStatus } from '../utils/match-status.js';
import { desc } from 'drizzle-orm';
export const matchRouter = Router();

const MAX_LIMIT = 100;

matchRouter.get('/', async (req, res) => {
    const parsed = listMatchesQuerySchema.safeParse(req.query);

    if (!parsed.success) {
        return res.status(400).json({ error: "invalid query", errors: JSON.stringify(parsed.error.issues) });
    }

    const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

    try {
        const data = await db.select()
            .from(matches)
            .orderBy((desc(matches.createdAt)))
            .limit(limit);

        return res.status(200).json({ data });
    } catch (error) {
        return res.status(500).json({ error: "failed to fetch matches", details: JSON.stringify(error.message) });
    }

});

matchRouter.post('/', async (req, res) => {
    const parsed = createMatchSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({ error: "invalid input", errors: JSON.stringify(parsed.error.issues) });
    }

    const { startTime, endTime, homeScore, awayScore } = parsed.data;
    try {
        const [event] = await db.insert(matches).values({
            ...parsed.data,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            homeScore: homeScore ?? 0,
            awayScore: awayScore ?? 0,
            status: getMatchStatus(startTime, endTime),
        }).returning();

        if(res.app.locals.broadcastMatchCreated) {
            res.app.locals.broadcastMatchCreated(event);
        }

        return res.status(201).json({ data: event });
    } catch (error) {
        return res.status(500).json({ error: "failed to create match", details: JSON.stringify(error.message) });
    }
})