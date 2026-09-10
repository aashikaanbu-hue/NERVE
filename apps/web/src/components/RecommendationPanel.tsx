import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  Navigation,
  Users,
} from "lucide-react";

import type {
  OverviewRecommendation,
} from "../lib/operations";

type RecommendationPanelProps = {
  recommendations:
    OverviewRecommendation[];

  loading?: boolean;
};

function formatText(
  value: string,
): string {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}

function getAgentName(
  agentType: string,
): string {
  const formatted =
    formatText(agentType).replace(
      /^Nerve /,
      "",
    );

  return `NERVE ${formatted}`;
}

function getCardClass(
  recommendation:
    OverviewRecommendation,
): "critical" | "route" | "impact" {
  const priority =
    recommendation.priority.toUpperCase();

  const category =
    `${recommendation.agentType} ${recommendation.type}`.toUpperCase();

  if (
    priority === "CRITICAL" ||
    priority === "HIGH"
  ) {
    return "critical";
  }

  if (category.includes("ROUTE")) {
    return "route";
  }

  return "impact";
}

function RecommendationIcon({
  cardClass,
}: {
  cardClass:
    | "critical"
    | "route"
    | "impact";
}) {
  if (cardClass === "critical") {
    return <AlertTriangle />;
  }

  if (cardClass === "route") {
    return <Navigation />;
  }

  return <Users />;
}

export function RecommendationPanel({
  recommendations,
  loading = false,
}: RecommendationPanelProps) {
  return (
    <section className="agent-panel">
      <header>
        <div>
          <span>
            AI RECOMMENDATIONS
          </span>

          <h2>
            Agent decision queue
          </h2>
        </div>

        <Bot />
      </header>

      {loading && (
        <article className="recommendation route">
          <div>
            <Activity />
          </div>

          <span>
            <small>NERVE agents</small>

            <b>
              Loading recommendations
            </b>

            <p>
              Reading the latest agent
              decisions from the database.
            </p>
          </span>
        </article>
      )}

      {!loading &&
        recommendations
          .slice(0, 3)
          .map((recommendation) => {
            const cardClass =
              getCardClass(
                recommendation,
              );

            return (
              <article
                key={recommendation.id}
                className={`recommendation ${cardClass}`}
              >
                <div>
                  <RecommendationIcon
                    cardClass={
                      cardClass
                    }
                  />
                </div>

                <span>
                  <small>
                    {getAgentName(
                      recommendation.agentType,
                    )}{" "}
                    ·{" "}
                    {formatText(
                      recommendation.priority,
                    )}
                  </small>

                  <b>
                    {
                      recommendation.title
                    }
                  </b>

                  <p>
                    {
                      recommendation.reasoning
                    }
                  </p>
                </span>
              </article>
            );
          })}

      {!loading &&
        recommendations.length ===
          0 && (
          <article className="recommendation route">
            <div>
              <CheckCircle2 />
            </div>

            <span>
              <small>
                NERVE Command · Ready
              </small>

              <b>
                No pending recommendations
              </b>

              <p>
                The agent decision queue is
                currently clear.
              </p>
            </span>
          </article>
        )}

      <button
        type="button"
        className="review-queue"
      >
        Review decision queue

        {!loading &&
          ` (${recommendations.length})`}

        <ChevronRight />
      </button>
    </section>
  );
}