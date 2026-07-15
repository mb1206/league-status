import type { SeasonStatus, Standing } from "../domain/types";

interface BannerProps {
  icon: string;
  logoUrl?: string;
  leagueName: string;
  teamName: string;
  hasPlayoffs?: boolean;
  seasonStatus: SeasonStatus;
  standing: Standing;
}

function endDateText(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function Banner({
  icon,
  logoUrl,
  leagueName,
  teamName,
  hasPlayoffs = false,
  seasonStatus,
  standing,
}: BannerProps) {
  const standingText = standing.summary ?? "";
  const endLabel = hasPlayoffs ? "Playoffs start" : "Season ends";
  return (
    <div className="banner" data-phase={seasonStatus.phase}>
      <span className="banner-team">
        {logoUrl ? (
          <img className="banner-logo" src={logoUrl} alt="" aria-hidden width={24} height={24} />
        ) : (
          <span aria-hidden>{icon}</span>
        )}{" "}
        {teamName}
        <span className="banner-league"> · {leagueName}</span>
      </span>
      <span className="banner-status">
        {seasonStatus.label}
        {seasonStatus.progress && (
          <span className="banner-progress" tabIndex={0}>
            {" · "}
            <span className="banner-progress-value">{seasonStatus.progress.percent}%</span>
            <span className="season-tooltip" role="tooltip">
              {seasonStatus.progress.played} of {seasonStatus.progress.total} games · {endLabel}{" "}
              {endDateText(seasonStatus.progress.endDate)}
            </span>
          </span>
        )}
      </span>
      <span className="banner-standing">
        {[standingText, standing.overall].filter(Boolean).join(" · ")}
      </span>
    </div>
  );
}
