# Pencil 디자인 최종 검증

`docs/design/lorekeeper.pen`은 후속 UI 논의와 frontend 구현에서 사용할 핵심 화면,
승인 변수와 재사용 컴포넌트를 한 파일에 포함한다. 별도 `.lib.pen` 파일은 필요하지
않다.

## 검증 결과

- 캔버스에서 요구사항, 탐색안, 선택 방향, 상세 화면, UI 라이브러리와 검토 결과를 이름으로 구분할 수 있다.
- 핵심 화면과 라이브러리 영역에는 이름이 없거나 `Frame`, `Text`, `Icon`처럼 역할을 알 수 없는 레이어가 없다.
- 승인 변수 40개와 재사용 원본 컴포넌트 5개가 유효하며 누락된 변수나 끊어진 인스턴스 참조가 없다.
- 새 탭 두 상태와 원고 편집 다섯 상태가 공통 컴포넌트 인스턴스를 사용한다.
- 핵심 화면에는 잘림, 의도하지 않은 겹침이나 화면 경계 이탈이 없다.
- 승인 프레임 `K4irXB`의 변수 연결 전후 계산 색상·서체·간격·모서리 집계가
  동일하다.
- `15 · UI Library`와 다섯 원본 컴포넌트에 레이아웃 문제나 끊어진 참조가 없다.

## 최종 비교 화면

- `08 · New Tab · Default`
- `09 · New Tab · No Recent Files`
- `10 · Manuscript Editor · Default`
- `11 · Manuscript Editor · AI Chat Open`
- `12 · Manuscript Editor · Memo · Work Selected`
- `13 · Manuscript Editor · Memo · Manuscript Selected`
- `14 · Manuscript Editor · Memo · Below Docked`
- `20 · Visual Direction · Recommended Blend · APPROVED`

`20`은 대표 작업 화면과 시각 방향의 승인 기준이다. 변수 동기화로 공유 토큰을 쓰는
기존 화면의 계산값은 함께 갱신될 수 있지만, 다른 화면의 개별 배치·상태·접근성을
승인하거나 전체 화면 전파를 완료한 것으로 간주하지 않는다.
