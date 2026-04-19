"use client";

import { useState } from "react";
import Link from "next/link";
import {
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconShield,
  LockIcon,
} from "@/components/shared/Icons";

const STEPS = ["Question", "Resolution", "Params", "Review"];

const CATEGORIES = [
  "Crypto",
  "Tech",
  "Sports",
  "Macro",
  "Markets",
  "Politics",
  "Science",
  "Other",
];

export default function CreateMarketPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("");
  const [expiry, setExpiry] = useState("");

  return (
    <div className="container" style={{ paddingTop: "32px", paddingBottom: "80px" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        {/* Back button */}
        <Link
          href="/markets"
          className="btn btn-ghost"
          style={{ marginBottom: "24px", display: "inline-flex" }}
        >
          <IconChevronLeft size={14} />
          Back to Markets
        </Link>

        {/* Title + subtitle */}
        <div style={{ marginBottom: "32px" }}>
          <h1
            className="display"
            style={{
              fontSize: "var(--text-2xl)",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              marginBottom: "8px",
            }}
          >
            Create market
          </h1>
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--color-text-tertiary)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <IconShield size={13} stroke="var(--color-text-tertiary)" />
            Requires reputation score of 40 or higher to create a market
          </p>
        </div>

        {/* Step indicators */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0",
            marginBottom: "40px",
          }}
        >
          {STEPS.map((step, i) => {
            const isActive = i === currentStep;
            const isCompleted = i < currentStep;
            return (
              <div
                key={step}
                style={{
                  display: "flex",
                  alignItems: "center",
                  flex: i < STEPS.length - 1 ? 1 : undefined,
                }}
              >
                {/* Step circle + label */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 600,
                      background: isActive
                        ? "var(--color-accent)"
                        : isCompleted
                          ? "var(--color-yes-muted)"
                          : "var(--color-bg-input)",
                      color: isActive
                        ? "#fff"
                        : isCompleted
                          ? "var(--color-yes-text)"
                          : "var(--color-text-tertiary)",
                      border: isActive
                        ? "none"
                        : `1px solid ${isCompleted ? "transparent" : "var(--color-border-subtle)"}`,
                      transition: "all 250ms var(--ease-out)",
                    }}
                  >
                    {isCompleted ? <IconCheck size={12} /> : i + 1}
                  </div>
                  <span
                    style={{
                      fontSize: "var(--text-sm)",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive
                        ? "var(--color-text-primary)"
                        : "var(--color-text-tertiary)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {step}
                  </span>
                </div>

                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: "1px",
                      background: isCompleted
                        ? "var(--color-yes)"
                        : "var(--color-border-subtle)",
                      margin: "0 16px",
                      transition: "background 250ms var(--ease-out)",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1: Question */}
        <div className="card" style={{ padding: "32px", marginBottom: "24px" }}>
          {/* Question input */}
          <div style={{ marginBottom: "32px" }}>
            <label
              style={{
                display: "block",
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                color: "var(--color-text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "10px",
              }}
            >
              Market question
            </label>
            <input
              type="text"
              className="display"
              placeholder="Will [event] happen by [date]?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                borderBottom: "2px solid var(--color-border-default)",
                outline: "none",
                fontSize: "var(--text-xl)",
                fontWeight: 600,
                letterSpacing: "-0.03em",
                color: "var(--color-text-primary)",
                padding: "12px 0",
                transition: "border-color 200ms var(--ease-out)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderBottomColor = "var(--color-accent)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderBottomColor =
                  "var(--color-border-default)";
              }}
            />
            <p
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--color-text-tertiary)",
                marginTop: "8px",
              }}
            >
              Write a clear, binary (yes/no) question. Ambiguous questions may
              be disputed.
            </p>
          </div>

          {/* Category + Expiry grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
            }}
          >
            {/* Category */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "10px",
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "10px",
                }}
              >
                Category
              </label>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                }}
              >
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    className={`chip${cat === category ? " chip--active" : ""}`}
                    onClick={() => setCategory(cat)}
                    type="button"
                    style={{
                      borderColor:
                        cat === category
                          ? "var(--color-accent)"
                          : undefined,
                      background:
                        cat === category
                          ? "var(--color-accent-muted)"
                          : undefined,
                      color:
                        cat === category
                          ? "var(--color-accent-bright)"
                          : undefined,
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Expiry date */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "10px",
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "10px",
                }}
              >
                Expiry date
              </label>
              <input
                type="date"
                className="input"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                style={{
                  colorScheme: "dark",
                }}
              />
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--color-text-tertiary)",
                  marginTop: "6px",
                }}
              >
                Market will close at this date, 23:59 UTC
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button className="btn btn-secondary" type="button">
            <LockIcon size={12} stroke="var(--color-text-secondary)" />
            Save draft
          </button>
          <button
            className="btn btn-primary btn-lg"
            type="button"
            onClick={() => {
              if (currentStep < STEPS.length - 1) {
                setCurrentStep(currentStep + 1);
              }
            }}
            style={{
              opacity: !question ? 0.5 : 1,
              pointerEvents: !question ? "none" : "auto",
            }}
          >
            Next
            <IconChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
