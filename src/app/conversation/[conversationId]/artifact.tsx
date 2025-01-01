import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X as CloseIcon,
  FileJsonIcon,
  SquareChartGanttIcon,
  ScrollTextIcon,
} from "lucide-react";
import { useRef } from "react";
import MarkdownIt from "markdown-it";
import highlightjs from "markdown-it-highlightjs";
import "highlight.js/styles/github-dark.css"; // Choose your preferred style
// import "highlight.js/styles/tokyo-night-dark.css"; // Choose your preferred style
// import "highlight.js/styles/atom-one-dark.css"; // Choose your preferred style

export interface ArtifactContent {
  type: "text" | "markdown" | "code";
  language?: string;
  title: string;
  content: string;
}

type Props = {
  closeArtifact: () => void;
  content: ArtifactContent | null;
};
export const Artifact = ({ closeArtifact, content }: Props) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const md = new MarkdownIt().use(highlightjs, {
    auto: true,
    inline: true,
  });

  const renderContent = () => {
    // console.log(content);
    if (!content?.content) return null;
    let verifiedContent;
    if (content.type === "code" && !content.content.startsWith("```")) {
      verifiedContent = `\`\`\`${content.language || ""}\n${content.content}\n\`\`\``;
    }
    else {
      verifiedContent = content.content;
    }
    return (
      <div
        dangerouslySetInnerHTML={{
          __html: md.render(
            verifiedContent
          ),
        }}
      />
    );
  };

  return (
    <Card className="flex-grow w-1/2">
      <CardHeader className="flex p-0">
        <div className="flex items-center justify-between w-full bg-emerald-800 text-primary-foreground px-4 py-2 border rounded-xl">
          <h2 className="text-lg font-semibold">{content?.title}</h2>
          <Button onClick={() => closeArtifact()} className="bg-emerald-800">
            <CloseIcon />
          </Button>
        </div>
      </CardHeader>
      <ScrollArea
        className="h-[calc(100vh-12rem)] border rounded-xl mt-1 bg-black text-primary-foreground"
        ref={scrollAreaRef}
      >
        <CardContent className="p-4">{renderContent()}</CardContent>
      </ScrollArea>
    </Card>
  );
};
