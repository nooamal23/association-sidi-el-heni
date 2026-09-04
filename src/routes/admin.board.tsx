import { createFileRoute } from "@tanstack/react-router";
import { BoardAdmin } from "@/components/admin/board-admin";

export const Route = createFileRoute("/admin/board")({
  component: () => <BoardAdmin />,
});
