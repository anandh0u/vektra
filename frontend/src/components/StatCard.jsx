import React from "react";

export default function StatCard({ title, value, icon: Icon, trend, severity }) {
  let borderStyle = "border-cardBorder";
  let textStyle = "text-textMain";
  let iconStyle = "text-muted bg-sidebarBg";
  
  if (severity === "CRITICAL") {
    borderStyle = "border-[#DC2626]/20";
    textStyle = "text-textMain";
    iconStyle = "text-[#DC2626] bg-[#DC2626]/5";
  } else if (severity === "WARNING") {
    borderStyle = "border-[#F59E0B]/20";
    textStyle = "text-textMain";
    iconStyle = "text-[#F59E0B] bg-[#F59E0B]/5";
  } else if (severity === "SAFE") {
    borderStyle = "border-[#22C55E]/20";
    textStyle = "text-textMain";
    iconStyle = "text-[#22C55E] bg-[#22C55E]/5";
  }

  return (
    <div className={`p-4 rounded-lg border ${borderStyle} bg-cardSurface transition-fast flex items-center justify-between hover:border-muted/30`}>
      <div className="space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
          {title}
        </span>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold font-sans tracking-tight ${textStyle}`}>
            {value}
          </span>
          {trend && (
            <span className={`text-[9px] font-semibold font-mono px-1.5 py-0.2 rounded-full border ${
              severity === "CRITICAL" 
                ? "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20" 
                : (severity === "WARNING" 
                    ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20" 
                    : "bg-[#27272A] text-muted border-cardBorder")
            }`}>
              {trend}
            </span>
          )}
        </div>
      </div>
      <div className={`p-2.5 rounded-md border border-cardBorder/40 ${iconStyle} shrink-0`}>
        <Icon className="w-[18px] h-[18px]" />
      </div>
    </div>
  );
}
