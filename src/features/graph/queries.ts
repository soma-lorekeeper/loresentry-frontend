"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

export function useProjectGraph(projectId: string) {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.graph(projectId),
    queryFn: () => services.graph.getProjectGraph(projectId),
  });
}
