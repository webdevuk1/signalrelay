import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "reference");
const src = readFileSync(join(root, "momentum-master-v1.pine"), "utf8");

const marker = "// ==================== SIGNALRELAY AUTO WEBHOOKS";
const idx = src.indexOf(marker);
if (idx === -1) throw new Error("SIGNALRELAY marker not found");

let base = src.slice(0, idx).trimEnd();

const gannTail = `                    pricePerBar = slope * (atrValue / gannATRMultiplier)
                    priceChange = barsFromPivot * pricePerBar

                    float endPrice = na
                    if gannIsUptrend
                        endPrice := gannPivotPrice + priceChange
                    else
                        endPrice := gannPivotPrice - priceChange

                    newGannLabel = label.new(endBar, endPrice, angleName, color=color.new(lineColor, 80), style=label.style_label_left, textcolor=lineColor, size=getGannLabelSize())
                    array.push(gannLabels, newGannLabel)
`;

if (!base.includes("array.push(gannLabels")) {
  const incomplete =
    "                    pricePerBar = slope * (atrValue / gannATRMultiplier)";
  if (!base.endsWith(incomplete)) {
    throw new Error("Expected incomplete Gann tail not found");
  }
  base = base.slice(0, -incomplete.length).trimEnd() + "\n" + gannTail;
}

const signalrelay = readFileSync(
  join(root, "signalrelay-momentum-auto-alerts.pine"),
  "utf8"
)
  .replace(
    /^\/\/ =+\n\/\/ SIGNALRELAY[\s\S]*?\/\/ =+\n\n/m,
    "// ==================== SIGNALRELAY (built-in webhook JSON alerts) ====================\n"
  )
  .trim();

writeFileSync(join(root, "momentum-master-v1-original.pine"), base + "\n", "utf8");

const plusHeader = base.replace(
  'indicator("Momentum Master v1",',
  'indicator("Momentum Master v1 Plus",'
);
writeFileSync(
  join(root, "momentum-master-v1-plus.pine"),
  plusHeader + "\n\n" + signalrelay + "\n",
  "utf8"
);

console.log("Wrote momentum-master-v1-original.pine and momentum-master-v1-plus.pine");
