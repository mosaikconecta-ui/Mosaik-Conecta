import { Alert } from "./misc";

export function FormStatus({ error, success }: { error?: string | null; success?: string | null }) {
  if (error) return <Alert tone="danger">{error}</Alert>;
  if (success) return <Alert tone="success">{success}</Alert>;
  return null;
}
