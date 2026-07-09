import type { SeasonStatus, Standing } from "../domain/types";

interface BannerProps {
  icon: string;
  leagueName: string;
  teamName: string;
  seasonStatus: SeasonStatus;
  standing: Standing;
}

export function Banner({
  icon,
  leagueName,
  teamName,
  seasonStatus,
  standing,
}: BannerProps) {
  const standingText = standing.summary ?? "";
  return (
    <div className="banner" data-phase={seasonStatus.phase}>
      <span className="banner-team">
        <span aria-hidden>{icon}</span> {teamName}
        <span className="banner-league"> · {leagueName}</span>
      </span>
      <span className="banner-status">{seasonStatus.label}</span>
      <span className="banner-standing">
        {[standingText, standing.overall].filter(Boolean).join(" · ")}
      </span>
    </div>
  );
}
