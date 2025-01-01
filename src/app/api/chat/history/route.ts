import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    const { conversationId } = await req.json();
    try {
        const messages = await prisma.message.findMany({
              where: {
                conversationId: conversationId,
              },
            orderBy: {
                createdAt: 'asc',
            },
            select: {
                id: true,
                role: true,
                content: true,
            },
        });

        return new Response(JSON.stringify(messages), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error fetching chat history:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch chat history' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
