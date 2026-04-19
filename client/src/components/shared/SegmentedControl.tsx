"use client";

interface SegmentedControlProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  small?: boolean;
}

export const SegmentedControl = ({
  value,
  onChange,
  options,
  small = false,
}: SegmentedControlProps) => (
  <div className="segmented" data-small={small ? "true" : undefined}>
    {options.map((option) => (
      <button
        key={option}
        className={`segmented__item${option === value ? " segmented__item--active" : ""}`}
        onClick={() => onChange(option)}
        type="button"
      >
        {option}
      </button>
    ))}
  </div>
);
