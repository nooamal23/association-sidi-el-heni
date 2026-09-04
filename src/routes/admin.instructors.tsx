import { createFileRoute } from "@tanstack/react-router";
import { InstructorsAdmin } from "@/components/admin/instructors-admin";

export const Route = createFileRoute("/admin/instructors")({
  component: () => <InstructorsAdmin />,
});
