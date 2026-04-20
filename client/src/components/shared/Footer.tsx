"use client";

import { BrandMark, LockIcon } from "./Icons";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container row between">
        <div className="row" style={{ color: "var(--t-3)" }}>
          <span className="brand" style={{ fontSize: 13, color: "var(--t-3)" }}>
            <span style={{ color: "var(--t-3)" }}>
              <BrandMark size={14} />
            </span>{" "}
            nullcast
          </span>
          <span className="mono" style={{ color: "var(--t-4)" }}>
            v0.4.2
          </span>
        </div>
        <div className="row">
          <a className="link" href="#">
            Docs
          </a>
          <a className="link" href="#">
            GitHub
          </a>
          <a className="link" href="#">
            Discord
          </a>
          <span className="pill enc">
            <LockIcon size={10} /> Built on Zama fhEVM
          </span>
        </div>
      </div>
    </footer>
  );
}
