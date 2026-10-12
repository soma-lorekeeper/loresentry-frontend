import { readFileSync } from "node:fs";
import { join } from "node:path";

import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { User } from "@/domain/models";
import { renderWithServices } from "@/test/render";

import { useSession } from "./session-gate";
import {
  SESSION_HINT_STORAGE_KEY,
  createSessionHintScript,
} from "./session-hint";

const USER: User = {
  id: "user-1",
  displayName: "서윤주",
  email: "writer@example.com",
  onboardingCompleted: true,
};

const root = document.documentElement;
const mark = () => window.localStorage.getItem(SESSION_HINT_STORAGE_KEY);
/** 브라우저가 화면을 그리기 전에 `<head>` 의 스크립트를 돌리는 것을 흉내 낸다. */
const runHeadScript = () => new Function(createSessionHintScript())();

/** 로그인 여부를 묻는 화면. 랜딩의 버튼과 보호 화면이 모두 이 hook 으로 묻는다. */
function AsksSession() {
  useSession();
  return null;
}

beforeEach(() => {
  delete root.dataset.session;
  window.localStorage.clear();
});

afterEach(() => {
  delete root.dataset.session;
});

describe("session hint", () => {
  /**
   * 처음 온 사람과 검색 로봇에게는 버튼을 숨기지 않는다. 숨기면 가장 중요한 "Google로 시작하기" 가
   * 스크립트가 올 때까지 보이지 않는다.
   */
  it("shows the buttons at once to someone who has never signed in here", () => {
    runHeadScript();

    expect(root.dataset.session).toBeUndefined();
  });

  it("holds the buttons back before the first paint for someone who signed in before", () => {
    window.localStorage.setItem(SESSION_HINT_STORAGE_KEY, "1");

    runHeadScript();

    expect(root.dataset.session).toBe("pending");
  });

  it("reveals the buttons and remembers the session once it is confirmed", async () => {
    root.dataset.session = "pending";

    renderWithServices(<AsksSession />, {
      auth: { getSession: async () => USER },
    });

    await waitFor(() => expect(mark()).toBe("1"));
    expect(root.dataset.session).toBeUndefined();
  });

  /** 세션이 끝난 사람은 다음부터 처음 온 사람처럼 버튼을 바로 본다. */
  it("reveals the buttons and forgets the session once it has ended", async () => {
    window.localStorage.setItem(SESSION_HINT_STORAGE_KEY, "1");
    root.dataset.session = "pending";

    renderWithServices(<AsksSession />, {
      auth: { getSession: async () => null },
    });

    await waitFor(() => expect(root.dataset.session).toBeUndefined());
    expect(mark()).toBeNull();
  });

  /**
   * 확인하지 못했다고 버튼을 계속 숨기면 로그인할 길이 없어진다. 로그아웃됐다는 뜻도 아니므로 표시는
   * 지우지 않는다.
   */
  it("reveals the buttons when the session could not be checked, and keeps the mark", async () => {
    window.localStorage.setItem(SESSION_HINT_STORAGE_KEY, "1");
    root.dataset.session = "pending";

    renderWithServices(<AsksSession />, {
      auth: {
        getSession: async () => {
          throw new Error("offline");
        },
      },
    });

    await waitFor(() => expect(root.dataset.session).toBeUndefined());
    expect(mark()).toBe("1");
  });

  /**
   * 속성의 이름과 값은 스크립트와 랜딩의 CSS 에 따로 적혀 있다. 한쪽만 바꾸면 버튼이 숨겨지지 않거나,
   * 숨겨진 채 남는다.
   */
  it("hides the session-dependent buttons in the landing styles, with a way out", () => {
    const css = readFileSync(
      join(__dirname, "../landing/landing.module.css"),
      "utf8",
    );
    const start = css.indexOf(':global(html[data-session="pending"])');
    const rule = css.slice(start, css.indexOf("}", start));

    expect(createSessionHintScript()).toContain('dataset.session="pending"');
    expect(rule).toContain(".headerActions");
    expect(rule).toContain(".ctaRow");
    expect(rule).toContain("visibility: hidden");
    // 스크립트가 오지 않아도 버튼이 영영 숨겨지지 않는다.
    expect(rule).toMatch(/animation: sessionReveal 0s linear \d+s forwards/);
  });
});
