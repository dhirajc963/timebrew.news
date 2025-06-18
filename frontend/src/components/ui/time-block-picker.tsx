import React from "react";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface TimeBlockOption {
  label: string;
  value: string;
  period: "morning" | "afternoon" | "evening";
}

interface TimeBlockPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const TimeBlockPicker: React.FC<TimeBlockPickerProps> = ({
  value,
  onChange,
  className,
}) => {
  // Predefined time blocks in 30-minute increments
  const timeBlocks: TimeBlockOption[] = [
    // Morning blocks (6:00 AM - 11:30 AM)
    { label: "6:00 AM", value: "06:00", period: "morning" },
    { label: "6:30 AM", value: "06:30", period: "morning" },
    { label: "7:00 AM", value: "07:00", period: "morning" },
    { label: "7:30 AM", value: "07:30", period: "morning" },
    { label: "8:00 AM", value: "08:00", period: "morning" },
    { label: "8:30 AM", value: "08:30", period: "morning" },
    { label: "9:00 AM", value: "09:00", period: "morning" },
    { label: "9:30 AM", value: "09:30", period: "morning" },
    { label: "10:00 AM", value: "10:00", period: "morning" },
    { label: "10:30 AM", value: "10:30", period: "morning" },
    { label: "11:00 AM", value: "11:00", period: "morning" },
    { label: "11:30 AM", value: "11:30", period: "morning" },
    
    // Afternoon blocks (12:00 PM - 5:30 PM)
    { label: "12:00 PM", value: "12:00", period: "afternoon" },
    { label: "12:30 PM", value: "12:30", period: "afternoon" },
    { label: "1:00 PM", value: "13:00", period: "afternoon" },
    { label: "1:30 PM", value: "13:30", period: "afternoon" },
    { label: "2:00 PM", value: "14:00", period: "afternoon" },
    { label: "2:30 PM", value: "14:30", period: "afternoon" },
    { label: "3:00 PM", value: "15:00", period: "afternoon" },
    { label: "3:30 PM", value: "15:30", period: "afternoon" },
    { label: "4:00 PM", value: "16:00", period: "afternoon" },
    { label: "4:30 PM", value: "16:30", period: "afternoon" },
    { label: "5:00 PM", value: "17:00", period: "afternoon" },
    { label: "5:30 PM", value: "17:30", period: "afternoon" },
    
    // Evening blocks (6:00 PM - 11:30 PM)
    { label: "6:00 PM", value: "18:00", period: "evening" },
    { label: "6:30 PM", value: "18:30", period: "evening" },
    { label: "7:00 PM", value: "19:00", period: "evening" },
    { label: "7:30 PM", value: "19:30", period: "evening" },
    { label: "8:00 PM", value: "20:00", period: "evening" },
    { label: "8:30 PM", value: "20:30", period: "evening" },
    { label: "9:00 PM", value: "21:00", period: "evening" },
    { label: "9:30 PM", value: "21:30", period: "evening" },
    { label: "10:00 PM", value: "22:00", period: "evening" },
    { label: "10:30 PM", value: "22:30", period: "evening" },
    { label: "11:00 PM", value: "23:00", period: "evening" },
    { label: "11:30 PM", value: "23:30", period: "evening" },
  ];

  // Group time blocks by period
  const morningBlocks = timeBlocks.filter((block) => block.period === "morning");
  const afternoonBlocks = timeBlocks.filter((block) => block.period === "afternoon");
  const eveningBlocks = timeBlocks.filter((block) => block.period === "evening");

  // State for active tab
  const [activeTab, setActiveTab] = React.useState<"morning" | "afternoon" | "evening">(() => {
    // Set initial active tab based on the current value
    const hour = parseInt(value.split(":")[0]);
    if (hour >= 6 && hour < 12) return "morning";
    if (hour >= 12 && hour < 18) return "afternoon";
    return "evening";
  });

  return (
    <div className={cn("space-y-4", className)}>
      {/* Time period tabs */}
      <div className="flex rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => setActiveTab("morning")}
          className={cn(
            "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all",
            activeTab === "morning"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Morning
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("afternoon")}
          className={cn(
            "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all",
            activeTab === "afternoon"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Afternoon
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("evening")}
          className={cn(
            "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all",
            activeTab === "evening"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Evening
        </button>
      </div>

      {/* Time blocks grid */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {activeTab === "morning" &&
          morningBlocks.map((block) => (
            <button
              key={block.value}
              type="button"
              onClick={() => onChange(block.value)}
              className={cn(
                "flex items-center justify-center rounded-md border px-3 py-2 text-sm transition-all",
                value === block.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50 hover:bg-primary/5"
              )}
            >
              {block.label}
            </button>
          ))}

        {activeTab === "afternoon" &&
          afternoonBlocks.map((block) => (
            <button
              key={block.value}
              type="button"
              onClick={() => onChange(block.value)}
              className={cn(
                "flex items-center justify-center rounded-md border px-3 py-2 text-sm transition-all",
                value === block.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50 hover:bg-primary/5"
              )}
            >
              {block.label}
            </button>
          ))}

        {activeTab === "evening" &&
          eveningBlocks.map((block) => (
            <button
              key={block.value}
              type="button"
              onClick={() => onChange(block.value)}
              className={cn(
                "flex items-center justify-center rounded-md border px-3 py-2 text-sm transition-all",
                value === block.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50 hover:bg-primary/5"
              )}
            >
              {block.label}
            </button>
          ))}
      </div>
    </div>
  );
};

export { TimeBlockPicker };