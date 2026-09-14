import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;
const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const HomeIcon = (p: Props) => <svg {...base} {...p}><path d="M3 10.8 12 3l9 7.8"/><path d="M5.5 9.8V21h13V9.8"/></svg>;
export const DecisionsIcon = (p: Props) => <svg {...base} {...p}><path d="M5 4h14v5H5z"/><path d="M5 15h14v5H5z"/><path d="m9 9 3 3 3-3"/></svg>;
export const ResultsIcon = (p: Props) => <svg {...base} {...p}><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></svg>;
export const RankingIcon = (p: Props) => <svg {...base} {...p}><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a4 4 0 0 0 4 4"/><path d="M17 6h3v2a4 4 0 0 1-4 4"/></svg>;
export const WalletIcon = (p: Props) => <svg {...base} {...p}><path d="M3 7h16a2 2 0 0 1 2 2v10H5a2 2 0 0 1-2-2z"/><path d="M3 8V6a2 2 0 0 1 2-2h12"/><path d="M16 12h5"/></svg>;
export const ProfileIcon = (p: Props) => <svg {...base} {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
export const SearchIcon = (p: Props) => <svg {...base} {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>;
export const ArrowIcon = (p: Props) => <svg {...base} {...p}><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></svg>;

export const BellIcon = (p: Props) => <svg {...base} {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>;
export const TeamIcon = (p: Props) => <svg {...base} {...p}><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2"/><path d="M15 15a5 5 0 0 1 6 5"/></svg>;
