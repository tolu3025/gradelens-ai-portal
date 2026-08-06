import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/student-list")({
  beforeLoad: () => {
    throw redirect({ to: "/admin-students" });
  },
});
