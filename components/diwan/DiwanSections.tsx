"use client";

import Unboxing from "./Unboxing";
import Brewing from "./Brewing";
import { Categories } from "./Categories";
import { Featured } from "./Featured";
import { Gift } from "./Gift";
import { Business } from "./Business";
import { Story, Behind } from "./Sections";

/** The DIWAN brand material, shown below the scroll scene. */
export default function DiwanSections() {
  return (
    <div className="diwan">
      <Categories />
      <Featured />
      <Unboxing />
      <div className="arch-band" aria-hidden="true" />
      <Brewing />
      <Gift />
      <Story />
      <Behind />
      <Business />
    </div>
  );
}
