import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes } from "react";

interface ChatInputProps extends TextareaHTMLAttributes<never> {
    className?: string;
}

const ChatInput = React.forwardRef<HTMLTextAreaElement, ChatInputProps>(
    ({ className, ...props }, ref) => (
        <Textarea
            ref={ref}
            name="message"
            autoComplete="off"
            rows={1}
            placeholder="Type a message"
            className={cn(
                "min-h-[48px]",
                "max-h-[144px]",
                "w-full",
                "resize-none",
                "rounded-md",
                "px-4",
                "py-3",
                "text-sm",
                "bg-background",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none",
                "focus-visible:ring-ring",
                "disabled:cursor-not-allowed",
                "disabled:opacity-50",
                className
            )}
            {...props}
        />
    )
);

ChatInput.displayName = "ChatInput";

export { ChatInput };
