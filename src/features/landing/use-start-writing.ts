"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

/**
 * 랜딩의 "Google로 시작하기"는 로그인 화면의 버튼과 같은 일을 한다. 실제 로그인은 BFF 로 떠나는
 * 페이지 이동이라 돌아오지 않고, 약관 동의와 결과 처리는 BFF 가 돌려보내는 `/login?result=` 이
 * 맡는다. mock 은 즉시 돌아오므로 그때만 아래 두 줄이 이어진다.
 */
export function useStartWriting() {
  const services = useServices();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  const start = async () => {
    setStarting(true);
    try {
      await services.auth.startGoogleLogin("/projects");
      await queryClient.invalidateQueries({ queryKey: queryKeys.session });
      router.push("/projects");
    } catch {
      setStarting(false);
      router.push("/login?auth=failed");
    }
  };

  return { start, starting };
}
