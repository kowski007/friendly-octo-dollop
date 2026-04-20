"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState, useTransition } from "react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { brunch24SamplePrompts } from "@/lib/brunch24/mockData";

import { Badge, cn } from "./ui";

type MessageRole = "assistant" | "user";

type ChatCard = {
  id: string;
  title: string;
  meta: string;
  description: string;
};

type ChatMessage = {
  id: string;
  role: MessageRole;
  text: string;
  cards?: ChatCard[];
};

type ChatResponse = {
  reply: string;
  suggestions: string[];
  cards?: ChatCard[];
};

function createId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeMessage(role: MessageRole, text: string, cards?: ChatCard[]): ChatMessage {
  return { id: createId(), role, text, cards };
}

function PromptChip({
  prompt,
  onClick,
}: {
  prompt: string;
  onClick: (prompt: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(prompt)}
      className="rounded-full border border-zinc-200/75 bg-white/80 px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950/70 dark:text-zinc-200 dark:hover:bg-zinc-900"
    >
      {prompt}
    </button>
  );
}

function ListingCard({ card }: { card: ChatCard }) {
  return (
    <div className="rounded-[20px] border border-white/85 bg-white/92 p-4 shadow-[0_16px_36px_rgba(15,23,42,0.05)] dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:shadow-[0_14px_28px_rgba(0,0,0,0.26)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
        Brunch24 V1
      </div>
      <div className="mt-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">
        {card.title}
      </div>
      <div className="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {card.meta}
      </div>
      <div className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
        {card.description}
      </div>
    </div>
  );
}

export function Brunch24AgentPlayground() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    makeMessage(
      "assistant",
      "This is the local Brunch24 V1 tester. Ask me about restaurants, hotels, events, vendor onboarding, or say 'Plan my evening in Lekki'."
    ),
  ]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(brunch24SamplePrompts.slice(0, 4));
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendPrompt(prompt: string) {
    setInput(prompt);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function resetThread() {
    setMessages([
      makeMessage(
        "assistant",
        "Thread reset. Ask me about food discovery, hotel enquiries, event discovery, or vendor onboarding."
      ),
    ]);
    setSuggestions(brunch24SamplePrompts.slice(0, 4));
    setInput("");
    setError(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = input.trim();
    if (!message) return;

    setError(null);
    setMessages((current) => [...current, makeMessage("user", message)]);
    setInput("");

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/brunch24/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ message }),
          });

          const data = (await response.json()) as ChatResponse;
          if (!response.ok) {
            throw new Error(data.reply || "The local Brunch24 chat route returned an error.");
          }

          setMessages((current) => [
            ...current,
            makeMessage("assistant", data.reply, data.cards),
          ]);
          setSuggestions(data.suggestions ?? brunch24SamplePrompts.slice(0, 4));
        } catch (caught) {
          const nextError =
            caught instanceof Error ? caught.message : "Unable to reach the local Brunch24 route.";
          setError(nextError);
          setMessages((current) => [
            ...current,
            makeMessage(
              "assistant",
              "I could not reach the local Brunch24 route just now. Try again in a moment."
            ),
          ]);
        }
      })();
    });
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f0e7_0%,#fffdf9_48%,#ffffff_100%)] text-zinc-950 dark:bg-[linear-gradient(180deg,#111111_0%,#0a0a0a_100%)] dark:text-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-[1240px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center gap-3 rounded-[28px] border border-white/70 bg-white/80 px-4 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.05)] backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/75 dark:shadow-[0_14px_34px_rgba(0,0,0,0.28)]">
          <div className="grid h-11 w-11 place-items-center rounded-[18px] bg-[#e85d04] text-sm font-semibold text-white shadow-[0_16px_30px_rgba(232,93,4,0.3)]">
            B24
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
              Local test link
            </div>
            <h1 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              Brunch24 Concierge Playground
            </h1>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Badge tone="orange">No payments</Badge>
            <Badge>Call-to-confirm</Badge>
            <ThemeToggle className="px-3 py-2 text-xs" />
            <Link
              href="/"
              className="rounded-full border border-zinc-200/80 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950/70 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Home
            </Link>
          </div>
        </header>

        <main className="mt-4 grid flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-[28px] border border-white/80 bg-white/84 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.05)] backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:shadow-[0_18px_36px_rgba(0,0,0,0.28)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
              What this page is
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              A fast local Brunch24 tester inside the Next app. It uses the V1 launch rules:
              discovery first, manual confirmation for bookings, and payment at the venue or property.
            </p>

            <div className="mt-5 grid gap-3">
              <div className="rounded-[20px] border border-zinc-200/80 bg-[#fff7f0] p-3 dark:border-zinc-800/80 dark:bg-zinc-900/60">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                  Core flows
                </div>
                <div className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-200">
                  Food discovery, table requests, hotel enquiries, event discovery, vendor onboarding, featured placement.
                </div>
              </div>

              <div className="rounded-[20px] border border-zinc-200/80 bg-white p-3 dark:border-zinc-800/80 dark:bg-zinc-950/60">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                  Good prompts
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {brunch24SamplePrompts.map((prompt) => (
                    <PromptChip key={prompt} prompt={prompt} onClick={sendPrompt} />
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={resetThread}
                className="rounded-[18px] border border-zinc-200/80 bg-white px-4 py-3 text-left text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950/70 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                Reset local Brunch24 thread
              </button>
            </div>
          </aside>

          <section className="flex min-h-[72vh] flex-col rounded-[30px] border border-white/80 bg-white/88 shadow-[0_22px_52px_rgba(15,23,42,0.06)] backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/84 dark:shadow-[0_22px_46px_rgba(0,0,0,0.32)]">
            <div className="border-b border-zinc-200/75 px-5 py-4 dark:border-zinc-800/80">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="verify">Local reply engine</Badge>
                <Badge>Botpress V1 behavior</Badge>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Quick browser testing while we keep Botpress as the launch path
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div className="max-w-[92%] sm:max-w-[80%]">
                      <div
                        className={cn(
                          "rounded-[24px] px-4 py-3 text-sm leading-7 shadow-sm",
                          message.role === "user"
                            ? "bg-zinc-950 text-white shadow-[0_18px_36px_rgba(24,24,27,0.16)]"
                            : "border border-white/90 bg-[#fffaf4] text-zinc-800 shadow-[0_18px_36px_rgba(15,23,42,0.05)] dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:text-zinc-100"
                        )}
                      >
                        {message.text.split("\n").map((line, index) => (
                          <p key={`${message.id}_${index}`}>{line || "\u00A0"}</p>
                        ))}
                      </div>

                      {message.cards?.length ? (
                        <div className="mt-3 grid gap-3">
                          {message.cards.map((card) => (
                            <ListingCard key={card.id} card={card} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}

                {error ? (
                  <div className="rounded-[20px] border border-orange-200/80 bg-orange-50/95 px-4 py-3 text-sm text-orange-950 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-100">
                    {error}
                  </div>
                ) : null}

                <div ref={bottomRef} />
              </div>
            </div>

            <div className="border-t border-zinc-200/75 px-4 py-4 dark:border-zinc-800/80 sm:px-5">
              <div className="mx-auto w-full max-w-[860px]">
                <div className="mb-3 flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <PromptChip key={suggestion} prompt={suggestion} onClick={sendPrompt} />
                  ))}
                </div>

                <form onSubmit={onSubmit}>
                  <div className="rounded-[24px] border border-zinc-200/80 bg-white p-2 shadow-[0_14px_32px_rgba(15,23,42,0.04)] dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:shadow-[0_12px_30px_rgba(0,0,0,0.3)]">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        ref={inputRef}
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        placeholder="Ask Brunch24 about food, hotels, events, or vendor onboarding..."
                        className="min-h-[44px] w-full bg-transparent px-2 text-sm font-medium text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                      />

                      <button
                        type="submit"
                        disabled={isPending || !input.trim()}
                        className="inline-flex h-11 shrink-0 items-center justify-center rounded-[18px] bg-[#e85d04] px-5 text-sm font-semibold text-white shadow-[0_16px_28px_rgba(232,93,4,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isPending ? "Sending..." : "Send"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
