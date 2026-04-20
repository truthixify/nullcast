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
            NullCast
          </span>
        </div>
        <div className="row">
          <a className="link" href="#">
            GitHub
          </a>
          <span className="pill enc">
            <LockIcon size={10} /> Built on Zama fhEVM
          </span>
        </div>
      </div>
    </footer>
  );
}
