"use client";

import Brewing from "./Brewing";
import { Categories } from "./Categories";
import { Featured } from "./Featured";
import { Business } from "./Business";
import { Story, Behind } from "./Sections";

/** The DIWAN brand material, shown below the scroll scene. */
export default function DiwanSections() {
  return (
    <div className="diwan">
      <Categories />
      <Featured />
      <div className="arch-band" aria-hidden="true" />
      <Brewing />
      <Story />
      <Behind />
      <Business />
    </div>
  );
}
