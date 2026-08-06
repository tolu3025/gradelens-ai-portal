import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/students")({
  beforeLoad: () => {
    throw redirect({ to: "/admin-students" });
  },
});
