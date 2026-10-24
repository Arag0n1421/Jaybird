import { motion, useReducedMotion, type TargetAndTransition, type Transition } from "framer-motion";

export type MascotMood = "idle" | "cheer" | "nudge" | "sleep";

interface MascotProps {
  mood?: MascotMood | undefined;
  message?: string | undefined;
  size?: number | undefined;
}

// "Jay" — original jay bird. Self-contained: only react + framer-motion.
// Colors read JCI brand CSS variables with hex fallbacks.
const TEAL = "var(--jci-teal, #57BCBC)";
const NAVY = "var(--jci-navy, #1F4789)";
const YELLOW = "var(--jci-yellow, #EFC40F)";
const INK = "var(--jci-black, #130F2D)";
const WHITE = "var(--jci-white, #FFFFFF)";

const body: Record<MascotMood, { animate: TargetAndTransition; transition: Transition }> = {
  idle: { animate: { y: [0, -3, 0] }, transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } },
  cheer: { animate: { y: [0, -14, 0, -8, 0] }, transition: { duration: 1.1, repeat: Infinity, repeatDelay: 0.4, ease: "easeOut" } },
  nudge: { animate: { rotate: [0, -10, 0, -10, 0] }, transition: { duration: 1.4, repeat: Infinity, repeatDelay: 1.2 } },
  sleep: { animate: { scaleY: [1, 1.04, 1], scaleX: [1, 0.98, 1] }, transition: { duration: 3.6, repeat: Infinity, ease: "easeInOut" } },
};

export function Mascot({ mood = "idle", message, size = 96 }: MascotProps) {
  const reduce = useReducedMotion();
  const anim = reduce ? { animate: {}, transition: {} } : body[mood];
  const wingsUp = mood === "cheer";
  const asleep = mood === "sleep";

  return (
    <div
      role="img"
      aria-label={message ? `Jay says: ${message}` : "Jay the mascot"}
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 6 }}
    >
      {message && (
        <div
          style={{
            position: "relative",
            background: WHITE,
            border: "1px solid var(--border, #E3E8EF)",
            borderRadius: 12,
            padding: "8px 12px",
            fontSize: 14,
            lineHeight: 1.4,
            color: INK,
            maxWidth: 260,
            textAlign: "center",
            boxShadow: "0 2px 8px rgba(19,15,45,0.06)",
          }}
        >
          {message}
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: "50%",
              bottom: -6,
              width: 10,
              height: 10,
              background: WHITE,
              borderRight: "1px solid var(--border, #E3E8EF)",
              borderBottom: "1px solid var(--border, #E3E8EF)",
              transform: "translateX(-50%) rotate(45deg)",
            }}
          />
        </div>
      )}
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        aria-hidden
        animate={anim.animate}
        transition={anim.transition}
        style={{ transformOrigin: "50% 90%", overflow: "visible" }}
      >
        {/* shadow */}
        <ellipse cx="60" cy="112" rx="28" ry="4" fill={INK} opacity="0.08" />
        {/* tail */}
        <path d="M24 78 L8 92 L14 72 Z" fill={NAVY} />
        {/* feet */}
        <path d="M50 104 v6 M70 104 v6" stroke={YELLOW} strokeWidth="4" strokeLinecap="round" />
        {/* left wing (back) */}
        <motion.path
          d="M30 66 Q14 76 26 92 Q36 84 40 72 Z"
          fill={NAVY}
          animate={reduce ? {} : { rotate: wingsUp ? -55 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 12 }}
          style={{ transformOrigin: "38px 70px" }}
        />
        {/* crest: three points */}
        <path d="M46 30 L44 12 L54 24 L60 6 L64 24 L76 14 L72 32 Z" fill={NAVY} />
        {/* body */}
        <circle cx="60" cy="66" r="40" fill={TEAL} />
        {/* belly */}
        <ellipse cx="62" cy="80" rx="24" ry="20" fill={WHITE} />
        {/* right wing (front) */}
        <motion.path
          d="M90 66 Q106 76 94 92 Q84 84 80 72 Z"
          fill={NAVY}
          animate={reduce ? {} : { rotate: wingsUp ? 55 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 12 }}
          style={{ transformOrigin: "82px 70px" }}
        />
        {/* eyes */}
        {asleep ? (
          <g stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round">
            <path d="M42 56 Q48 61 54 56" />
            <path d="M66 56 Q72 61 78 56" />
          </g>
        ) : (
          <g>
            <circle cx="48" cy="54" r="9" fill={WHITE} />
            <circle cx="72" cy="54" r="9" fill={WHITE} />
            <circle cx={mood === "nudge" ? 50 : 49} cy="55" r="5.5" fill={INK} />
            <circle cx={mood === "nudge" ? 74 : 73} cy="55" r="5.5" fill={INK} />
            <circle cx="51" cy="53" r="1.8" fill={WHITE} />
            <circle cx="75" cy="53" r="1.8" fill={WHITE} />
          </g>
        )}
        {/* cheeks */}
        <circle cx="40" cy="66" r="4" fill={YELLOW} opacity="0.35" />
        <circle cx="80" cy="66" r="4" fill={YELLOW} opacity="0.35" />
        {/* beak */}
        <path d="M54 64 L66 64 L60 73 Z" fill={YELLOW} />
        {asleep && (
          <motion.text
            x="88" y="30" fontSize="16" fill={NAVY} fontFamily="sans-serif"
            animate={reduce ? {} : { opacity: [0, 1, 0], y: [34, 22, 14] }}
            transition={{ duration: 2.6, repeat: Infinity }}
          >
            z
          </motion.text>
        )}
        {mood === "nudge" && (
          <text x="92" y="28" fontSize="20" fontWeight="bold" fill={NAVY} fontFamily="sans-serif">!</text>
        )}
      </motion.svg>
    </div>
  );
}

export default Mascot;
