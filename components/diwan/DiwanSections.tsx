"use client";

import Brewing from "./Brewing";
import { Categories } from "./Categories";
import { Business } from "./Business";
import { Story, Behind } from "./Sections";

/** The DIWAN brand material, shown below the scroll scene. */
export default function DiwanSections() {
  return (
    <div className="diwan">
      <Categories />
      <div className="arch-band" aria-hidden="true" />
      <Brewing />
      <Story />
      <Behind />
      <Business />
    </div>
  );
}
