"use client";

import { useState } from "react";

import {
  Button,
  Dialog,
  DialogActions,
  IconButton,
  Inline,
  Menu,
  MenuItem,
  Stack,
  StatusNotice,
  Surface,
  TextField,
} from "@/components/ui";

import styles from "./page.module.css";

export function ComponentFixture() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Stack gap={6}>
      <section
        aria-labelledby="controls-heading"
        className={styles.fixtureSection}
      >
        <h2 id="controls-heading">버튼과 상태</h2>
        <p className={styles.fixtureLegend}>
          Tab으로 포커스를 이동해 focus 상태를 확인합니다.
        </p>
        <Inline className={styles.fixtureRow} gap={2}>
          <Button icon="✦">AI 챗</Button>
          <Button variant="primary">저장</Button>
          <Button variant="ghost">취소</Button>
          <Button isProcessing>저장 중</Button>
          <Button disabled>사용 불가</Button>
          <IconButton aria-label="새 항목 추가">＋</IconButton>
          <IconButton aria-label="항목 추가 중" isProcessing />
          <Menu buttonContent="프로젝트 선택" buttonLabel="프로젝트 선택">
            <MenuItem>프로젝트 목록</MenuItem>
            <MenuItem selected>유리 정원의 기록</MenuItem>
            <MenuItem disabled>사용할 수 없는 프로젝트</MenuItem>
            <MenuItem>다른 프로젝트</MenuItem>
          </Menu>
        </Inline>
        <p className={styles.fixtureLegend}>
          메뉴에서 위·아래 방향키, Home, End와 Escape를 확인합니다.
        </p>
      </section>

      <section
        aria-labelledby="fields-heading"
        className={styles.fixtureSection}
      >
        <h2 id="fields-heading">입력과 안내</h2>
        <div className={styles.fixtureGrid}>
          <Surface>
            <TextField
              defaultValue="유리 정원의 기록"
              description="사이드바와 프로젝트 목록에 표시되는 이름입니다."
              id="fixture-project-name"
              label="프로젝트 이름"
              required
            />
          </Surface>
          <Surface>
            <TextField
              error="프로젝트 이름을 입력해 주세요."
              id="fixture-project-error"
              label="프로젝트 이름"
              required
            />
          </Surface>
          <Surface>
            <TextField
              defaultValue="편집할 수 없는 값"
              disabled
              id="fixture-project-disabled"
              label="비활성 입력"
            />
          </Surface>
          <StatusNotice>Google 로그인이 취소됐어요.</StatusNotice>
          <StatusNotice variant="error">
            저장하지 못했어요. 다시 시도해 주세요.
          </StatusNotice>
          <StatusNotice variant="success">저장했어요.</StatusNotice>
        </div>
      </section>

      <section
        aria-labelledby="layout-heading"
        className={styles.fixtureSection}
      >
        <h2 id="layout-heading">레이아웃 primitive</h2>
        <div className={styles.fixtureGrid}>
          <Surface>기본 Surface</Surface>
          <Surface elevation="raised">Raised Surface</Surface>
        </div>
      </section>

      <section
        aria-labelledby="dialog-heading"
        className={styles.fixtureSection}
      >
        <h2 id="dialog-heading">대화상자</h2>
        <p className={styles.fixtureLegend}>
          열기 후 Tab·Shift+Tab 순환과 Escape 포커스 복귀를 확인합니다.
        </p>
        <Button onClick={() => setDialogOpen(true)}>삭제 대화상자 열기</Button>
        <Dialog
          description="이 항목은 프로젝트에서 완전히 삭제되며 복원할 수 없습니다."
          onOpenChange={setDialogOpen}
          open={dialogOpen}
          title="영구 삭제할까요?"
        >
          <Surface>12화 · 균열의 밤</Surface>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>취소</Button>
            <Button variant="primary">영구 삭제</Button>
          </DialogActions>
        </Dialog>
      </section>
    </Stack>
  );
}
