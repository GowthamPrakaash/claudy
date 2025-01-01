import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  // Enable streaming
  const encoder = new TextEncoder();
  let completeResponse = "";
  const customReadable = new ReadableStream({
    async start(controller) {
      try {
        // Get message from request body
        const { conversationId, message } = await req.json();
        // console.log("conversationId:", conversationId);
        // console.log("message:", message);

        // Store the new message in database
        // First verify the conversation exists
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
        });

        if (!conversation) {
          // If conversation doesn't exist, create it
          await prisma.conversation.create({
            data: {
              id: conversationId,
              userId: "default", // You'll want to get this from your auth system
              messages: {
                create: {
                  role: "user",
                  content: message,
                }
              }
            }
          });
        } else {
          // If conversation exists, create the message
          await prisma.message.create({
            data: {
              conversationId,
              role: "user",
              content: message,
            },
          });
        }
        // console.log("User message stored");

        // Get all message history
        const messageHistory = await prisma.message.findMany({
          where: {
            conversationId: conversationId, // Filter by conversationId
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            role: true,
            content: true,
          },
        });

        // Format messages for Flask API
        const formattedMessages = messageHistory.map(({ role, content }) => ({
          role,
          content,
        }));

        // Make request to Flask API
        const response = await fetch("http://127.0.0.1:5328/fapi/g4f", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formattedMessages),
        });

        if (!response.ok) {
          throw new Error("Flask API request failed");
        }

        // Get the response reader
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Failed to get response reader");
        }

        // Read the stream
        while (true) {
          const { done, value } = await reader.read();
          // console.log("API chunk time:", Date.now(), done, value);

          if (done) {
            controller.close();
            break;
          }

          // Convert the Uint8Array to string
          const text = new TextDecoder().decode(value, { stream: true });

          // Check for the completion signal
          if (text.includes("[DONE]")) {
            controller.close();
            break;
          }

          // Encode and send the chunk
          controller.enqueue(encoder.encode(text));
          completeResponse += text;
        }

        // Store the assistant's complete response
        // Note: You might want to accumulate the response and store it once completed
        await prisma.message.create({
            data: {
                conversationId: conversationId,
                role: "assistant",
                content: completeResponse,
            },
        });
      } catch (error) {
        console.error("Error in streaming:", error);
        controller.error(error);
      }
    },
  });

  // Return the stream with appropriate headers
  return new Response(customReadable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
