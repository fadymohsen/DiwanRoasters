"use client";

import { motion } from "motion/react";
import { useLangStore } from "@/lib/lang";
import { waLink } from "@/lib/site";
import { WhatsAppIcon } from "@/components/ui/SocialIcons";

/** Floating chat button, bottom right on every storefront page. */
export default function WhatsAppButton() {
  const lang = useLangStore((s) => s.lang);
  const label = lang === "ar" ? "تحدث معنا على واتساب" : "Chat with us on WhatsApp";
  const text = lang === "ar" ? "مرحباً ديوان، أريد أن أسأل عن القهوة." : "Hello DIWAN, I have a question about your coffee.";
  return (
    <motion.a
      href={waLink(text)}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1.6, type: "spring", stiffness: 260, damping: 18 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      // physical right on purpose: the same corner in both languages
      className="fixed right-5 z-40 grid h-12 w-12 place-items-center md:h-14 md:w-14 rounded-full bg-[#25D366] text-white shadow-[0_10px_28px_rgba(14,58,51,0.35)] bottom-[max(1.25rem,env(safe-area-inset-bottom))]"
    >
      <WhatsAppIcon className="h-6 w-6 md:h-7 md:w-7" />
    </motion.a>
  );
}
