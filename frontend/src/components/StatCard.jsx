import React from "react";

export default function StatCard({ title, value, icon: Icon, trend, severity }) {
  let borderStyle = "border-[#1e2240]";
  let textStyle = "text-white";
  let bgGradient = "bg-[#141628]";
  
  if (severity === "CRITICAL") {
    borderStyle = "border-danger/30 hover:border-danger/60";
    textStyle = "text-danger";
  } else if (severity === "WARNING") {
    borderStyle = "border-warning/30 hover:border-warning/60";
    textStyle = "text-warning";
  } else if (severity === "SAFE") {
    borderStyle = "border-safe/30 hover:border-safe/60";
    textStyle = "text-safe";
  }

  return (
    <div className={`p-4 rounded-xl border ${borderStyle} ${bgGradient} transition-all duration-300 flex items-center justify-between`}>
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
          {title}
        </span>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold font-heading ${textStyle}`}>
            {value}
          </span>
          {trend && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              severity === "CRITICAL" 
                ? "bg-danger/10 text-danger" 
                : (severity === "WARNING" ? "bg-warning/10 text-warning" : "bg-[#1e2240] text-muted")
            }`}>
              {trend}
            </span>
          )}
        </div>
      </div>
      <div className={`p-2.5 rounded-lg ${
        severity === "CRITICAL" 
          ? "bg-danger/10 text-danger" 
          : (severity === "WARNING" 
              ? "bg-warning/10 text-warning" 
              : (severity === "SAFE" ? "bg-safe/10 text-safe" : "bg-[#1e2240] text-muted"))
      }`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}
