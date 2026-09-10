"use client";

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type CountedTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  maxLength: number;
};

/**
 * A textarea that enforces its limit and says so while you type.
 *
 * D-015 and D-016 were both silent truncation: the server trimmed text the
 * form had let the user enter, with nothing telling them. A hard `maxLength`
 * alone stops the loss but leaves someone typing into a wall with no
 * explanation, so the count is shown too, and called out as it runs low.
 */
export function CountedTextarea({
  maxLength,
  defaultValue,
  onChange,
  id,
  ...props
}: CountedTextareaProps) {
  const [used, setUsed] = React.useState(() => String(defaultValue ?? "").length);
  const remaining = maxLength - used;
  const countId = id ? `${id}-count` : undefined;

  return (
    <>
      <Textarea
        {...props}
        id={id}
        defaultValue={defaultValue}
        maxLength={maxLength}
        aria-describedby={countId}
        onChange={(event) => {
          setUsed(event.target.value.length);
          onChange?.(event);
        }}
      />
      <p
        id={countId}
        aria-live="polite"
        className={cn(
          "text-xs",
          remaining === 0 ? "text-destructive" : "text-muted-foreground"
        )}
      >
        {remaining === 0
          ? `Character limit reached — ${maxLength} of ${maxLength} used.`
          : `${used} of ${maxLength} characters used.`}
      </p>
    </>
  );
}
