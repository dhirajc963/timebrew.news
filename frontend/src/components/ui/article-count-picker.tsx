import React from "react";
import { cn } from "@/lib/utils";
import { Newspaper } from "lucide-react";

interface ArticleCountOption {
  value: number;
  label: string;
  description: string;
}

interface ArticleCountPickerProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

const ArticleCountPicker: React.FC<ArticleCountPickerProps> = ({
  value,
  onChange,
  className,
}) => {
  // Predefined article count options with descriptions
  const articleOptions: ArticleCountOption[] = [
    { value: 3, label: "3", description: "Quick digest" },
    { value: 4, label: "4", description: "Brief update" },
    { value: 5, label: "5", description: "Balanced" },
    { value: 6, label: "6", description: "Detailed" },
    { value: 7, label: "7", description: "Comprehensive" },
    { value: 8, label: "8", description: "Deep dive" },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl font-bold text-primary">{value}</span>
        <span className="text-muted-foreground text-sm">articles per day</span>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {articleOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-col items-center justify-center rounded-xl border p-3 transition-[background-color,border-color,transform]",
              value === option.value
                ? "border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]"
                : "border-border bg-card/50 hover:bg-card/80 hover:border-primary/30"
            )}
          >
            <div className="flex items-center justify-center mb-1">
              {Array.from({ length: option.value }).map((_, i) => (
                <Newspaper 
                  key={i} 
                  className={cn(
                    "w-3 h-3 -ml-1 first:ml-0",
                    value === option.value ? "text-primary" : "text-muted-foreground"
                  )} 
                />
              ))}
            </div>
            <span className="text-lg font-semibold">{option.label}</span>
            <span className="text-xs text-muted-foreground">{option.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export { ArticleCountPicker };