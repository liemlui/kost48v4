import { Badge } from 'react-bootstrap';

type Props = {
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    prompt_cache_hit_tokens?: number;
    prompt_cache_miss_tokens?: number;
  };
  model?: string;
};

/** Badge kecil menampilkan estimasi token/model hasil AI. */
export default function AiCostBadge({ usage, model }: Props) {
  if (!usage && !model) return null;
  return (
    <div className="d-flex gap-2 align-items-center small text-muted mt-1">
      {model ? <Badge bg="light" text="dark" className="fw-normal">{model}</Badge> : null}
      {usage?.total_tokens != null ? (
        <span>{usage.total_tokens} token</span>
      ) : null}
      {usage?.prompt_cache_hit_tokens != null && usage.prompt_cache_hit_tokens > 0 ? (
        <Badge bg="success" className="fw-normal">cache hit</Badge>
      ) : null}
    </div>
  );
}
