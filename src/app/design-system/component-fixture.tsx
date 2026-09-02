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
      <section aria-labelledby="controls-heading">
        <h2 id="controls-heading">버튼과 상태</h2>
        <Inline className={styles.fixtureRow} gap={2}>
          <Button icon="✦">AI 챗</Button>
          <Button variant="primary">저장</Button>
          <Button isProcessing>저장 중</Button>
          <Button disabled>사용 불가</Button>
          <IconButton aria-label="새 항목 추가">＋</IconButton>
          <Menu buttonContent="프로젝트 선택" buttonLabel="프로젝트 선택">
            <MenuItem>프로젝트 목록</MenuItem>
            <MenuItem selected>유리 정원의 기록</MenuItem>
            <MenuItem>다른 프로젝트</MenuItem>
          </Menu>
        </Inline>
      </section>

      <section aria-labelledby="fields-heading">
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
          <StatusNotice>Google 로그인이 취소됐어요.</StatusNotice>
          <StatusNotice variant="error">
            저장하지 못했어요. 다시 시도해 주세요.
          </StatusNotice>
        </div>
      </section>

      <section aria-labelledby="dialog-heading">
        <h2 id="dialog-heading">대화상자</h2>
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
