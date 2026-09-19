"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import type { User } from "@/domain/models";
import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

export function useSession() {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: () => services.auth.getSession(),
    staleTime: Infinity,
  });
}

export function SessionGate({
  children,
}: {
  children: (user: User) => ReactNode;
}) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const signedOut = session.isSuccess && session.data === null;
  useEffect(() => {
    if (!signedOut) return;
    const query = searchParams.toString();
    const returnTo = `${pathname}${query ? `?${query}` : ""}`;
    router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }, [signedOut, pathname, searchParams, router]);

  if (!session.data) return null;
  return children(session.data);
}
