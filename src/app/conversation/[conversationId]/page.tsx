"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useParams } from "next/navigation";
import {
  FileJsonIcon,
  SquareChartGanttIcon,
  ScrollTextIcon,
} from "lucide-react";
import { Artifact, ArtifactContent } from "./artifact";
import MarkdownIt from "markdown-it";
import highlightjs from "markdown-it-highlightjs";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export default function ConversationPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isArtifactOpen, setIsArtifactOpen] = useState(false);
  const [artifactContent, setArtifactContent] =
    useState<ArtifactContent | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const conversationId = params.conversationId as string;
  const md = new MarkdownIt({
    html: true,
    breaks: true,
  }).use(highlightjs, {
    inline: true,
  });

  // Fetch chat history
  useEffect(() => {
    setIsLoading(true);
    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/chat/history`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId: conversationId,
          }),
        });
        if (!response.ok) throw new Error("Failed to fetch history");
        const data = await response.json();
        setMessages(data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error:", error);
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [conversationId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    // Add user message immediately
    const userMessage = {
      id: Date.now().toString(),
      role: "user" as const,
      content: inputMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversationId,
          message: inputMessage,
        }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      // Add assistant message placeholder
      const assistantMessageId = Date.now().toString();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
        },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        // console.log("Client chunk time:", Date.now(), done, text);
        if (text.includes("[DONE]")) break;

        assistantMessage += text;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: assistantMessage }
              : msg
          )
        );
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  function closeArtifact() {
    setIsArtifactOpen(false);
    setArtifactContent(null);
  }

  const artifactOpener = (
    index: number,
    type: string,
    title: string,
    content: string,
    language?: string
  ) => {
    // const typeValue = type as "text" | "markdown" | "code";
    return (
      <div
        key={index}
        onClick={() => {
          setIsArtifactOpen(true);
          setArtifactContent({
            type,
            title,
            content,
            language,
          });
        }}
        className="my-5 cursor-pointer p-2 rounded-lg flex border border-emerald-800 bg-emerald-800 bg-opacity-25 hover:bg-emerald-800 hover:bg-opacity-50"
        // bg-emerald-800 bg-opacity-25 hover:bg-emerald-800 hover:bg-opacity-50
      >
        <div className="flex items-center gap-2"></div>
        {(type === "code" && (
          <FileJsonIcon className="w-8 h-8 my-auto border-r border-black pr-2" />
        )) ||
          (type === "markdown" && (
            <ScrollTextIcon className="w-8 h-8 my-auto border-r border-black pr-2" />
          )) ||
          (type === "text" && (
            <SquareChartGanttIcon className="w-8 h-8 my-auto border-r border-black pr-2" />
          ))}
        <div className="p-2">
          <div className="font-semibold">{title}</div>
          <div className="italic text-sm">Click to view content</div>
        </div>
      </div>
    );
  };

  function formatAssistantMessage(message: string) {
    // Parse message for artifacts
    const parts = message.split(/(\{artifact.*?\}.*?\{\/artifact\})/s);

    return (
      <div>
        {parts.map((part, index) => {
          // console.log("Part:", part);
          const artifactMatch = part.match(
            /\{artifact\s+(.*?)\}(.*?)\{\/artifact\}/s
          );
          if (artifactMatch) {
            const [_, attributes, content] = artifactMatch;

            // Parse attributes
            const typeMatch = attributes.match(/type="([^"]+)"/);
            const titleMatch = attributes.match(/title="([^"]+)"/);
            const languageMatch = attributes.match(/language="([^"]+)"/);

            if (typeMatch) {
              const typeValue = typeMatch[1] as "text" | "markdown" | "code";
              const artifactData = {
                type: typeValue,
                title: titleMatch ? titleMatch[1] : typeMatch[1],
                language: languageMatch ? languageMatch[1] : undefined,
                content: content.trim(),
              };
              // console.log("Artifact:", artifactData);

              return artifactOpener(
                index,
                artifactData.type,
                artifactData.title,
                artifactData.content,
                artifactData.language
              );
            }
          }
          return (
            <div key={index} className="list-decimal">
              {/* {part} */}
              {/* {console.log("md.render(part):", md.render(part))} */}
              {/* {md.render(part)} */}
              <div
                dangerouslySetInnerHTML={{
                  __html: md.render(part),
                }}
              />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={
        "flex flex-col mx-auto " + (isArtifactOpen ? "w-full" : "w-3/4")
      }
    >
      <div className="flex gap-4 mb-4">
        <Card
          className={`flex-grow ${
            isArtifactOpen ? "w-1/2" : "w-full"
          } transition-all ease-in-out duration-300`}
        >
          {/* <CardHeader className="flex p-0">
            <div className="flex items-center justify-between w-full bg-emerald-800 text-primary-foreground px-4 py-2 border rounded-xl">
              <h2 className="text-lg font-semibold">Conversation</h2>
            </div>
          </CardHeader> */}
          <ScrollArea className="h-[calc(100vh-10rem)]" ref={scrollAreaRef}>
            <CardContent className="p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 border shadow-md ${
                      message.role === "user"
                        ? "bg-emerald-800 bg-opacity-20 ml-4"
                        : "bg-muted mr-4"
                    }`}
                  >
                    {(message.role === "assistant" &&
                      formatAssistantMessage(message.content)) || (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </ScrollArea>
        </Card>
        {isArtifactOpen && (
          <Artifact closeArtifact={closeArtifact} content={artifactContent} />
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 w-full mx-auto px-24">
        <textarea
          value={inputMessage}
          onChange={(e) => {
            setInputMessage(e.target.value);
            // Auto-adjust height
            // e.target.style.height = "auto";
            // e.target.style.height = Math.min(e.target.scrollHeight, 72) + "px"; // 72px = 3 lines
          }}
          placeholder="Type your message..."
          disabled={isLoading}
          className="flex-grow border-emerald-800 rounded-md border p-2 resize-none min-h-[38px] max-h-[72px]"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-emerald-800 my-auto"
        >
          Send
        </Button>
      </form>
    </div>
  );
}
