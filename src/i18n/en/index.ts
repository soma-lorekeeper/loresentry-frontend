import common from "./common";
import editor from "./editor";
import help from "./help";
import landing from "./landing";
import mock from "./mock";
import onboarding from "./onboarding";
import shell from "./shell";
import workspace from "./workspace";

/**
 * 영어 사전. 열쇠는 한국어 원문이다 — 코드에는 한국어가 그대로 남아 읽기 쉽고, 한국어판에서는
 * 열쇠가 곧 문구다. 영역마다 파일을 나눠 두어 여러 사람이 동시에 고쳐도 겹치지 않는다. 같은 열쇠가
 * 두 파일에 있으면 coverage.test.ts 가 막는다. 여러 화면이 함께 쓰는 짧은 말은 common 에 둔다.
 */
export const EN = {
  ...common,
  ...landing,
  ...onboarding,
  ...shell,
  ...workspace,
  ...editor,
  ...help,
  ...mock,
};

export const EN_AREAS = {
  common,
  landing,
  onboarding,
  shell,
  workspace,
  editor,
  help,
  mock,
};
