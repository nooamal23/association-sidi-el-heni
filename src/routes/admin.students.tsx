import { createFileRoute } from "@tanstack/react-router";
import { PeopleAdmin } from "@/components/admin/people-admin";

export const Route = createFileRoute("/admin/students")({
  component: () => <PeopleAdmin role="student" />,
});
